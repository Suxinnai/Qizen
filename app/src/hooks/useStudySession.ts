import { useEffect, useRef, useState } from "react";
import {
  appendStudySessionEvent,
  getStudyInteractionCount,
  loadAppData,
  modeLabel,
  toggleTask,
  updatePracticeSetStatus,
  updateNote,
  addNote,
  addLearningPlanGoal,
  type TeachingStyle,
  type AppData,
} from "../lib/storage";
import {
  createPracticeSetFromRagResult,
  retrieveRelevantLibraryContext,
  type LibraryRagResult,
  type RagPracticeSet,
} from "../lib/rag";
import { isNonLearningChat, shouldSearchKnowledgeBase } from "../lib/study/intent";
import { collectHitResourceTitles, createEmptyRag, getStrongRag } from "../lib/study/rag-policy";
import { buildAssistantReply, buildContextStudyPlan, isStudyPlanRequest } from "../lib/study/reply-policy";
import { canAutoOpenPanel, getStudySessionStatus, shouldAllowLearningProgress } from "../lib/study/session-policy";
import { resolveLlmProviderConfig } from "../lib/secretStore";
import { generateStudyAnswer, generateStudyConversationTitle, sanitizeLlmText } from "../lib/llm";
import { findLearningResources } from "../lib/webResourceAgent";
import {
  buildStudyConversationTitle,
  createStudyConversation,
  sanitizePersistedText,
  getActiveStudyConversationId,
  getStudyConversation,
  getStudyConversationChangeEventName,
  setActiveStudyConversationId,
  upsertStudyConversation,
  type PersistedStudyConversation,
} from "../lib/studyConversations";
import { getStudyTree, flattenTasks, buildInitialMessages } from "../lib/study/study-helpers";
import type { ChatMessage, PanelKey, StudyJourneyStage, StudyLocationState, StudyPlanStep, StudyResourceLead } from "../lib/study/types";

const STREAM_CHUNK_SIZE = 8;
const STREAM_DELAY_MS = 14;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function inferLearningTopic(text: string) {
  return (
    text
      .replace(/^(我想|我要|帮我|请帮我|想要|计划|学习|学一下|学)\s*/g, "")
      .replace(/(怎么学|如何学|学习计划|计划|路线|资源|资料|一下|可以吗|吧|。|！|!|\?)$/g, "")
      .trim()
      .slice(0, 36) || "这个主题"
  );
}

function isPlanConfirmation(text: string) {
  return /^(确认|可以|就这样|按这个|按计划|开始|开始学习|执行|确定|没问题)/.test(text.trim());
}

function wantsResourceAgent(text: string) {
  return /(资料|资源|网站|课程|视频|论文|书|练习|题目|查找|搜索|网上|推荐)/.test(text);
}

function buildPlanSteps(topic: string, style: TeachingStyle): StudyPlanStep[] {
  const methodStep =
    style === "logic"
      ? "先建立概念边界和推导链"
      : style === "steps"
      ? "拆成可检查的小步骤"
      : style === "story"
      ? "用场景和问题把概念串起来"
      : "先用类比建立直觉";

  return [
    { id: "plan-step-1", title: `${topic}：明确目标与已有基础`, minutes: 10 },
    { id: "plan-step-2", title: `${methodStep}`, minutes: 20 },
    { id: "plan-step-3", title: `阅读/观看 2-3 份高质量资料并做摘记`, minutes: 30 },
    { id: "plan-step-4", title: `完成一组针对 ${topic} 的练习题`, minutes: 25 },
    { id: "plan-step-5", title: `复述总结并标记路线进度`, minutes: 10 },
  ];
}

function buildPlanMarkdown(topic: string, steps: StudyPlanStep[], style: TeachingStyle) {
  const styleText: Record<TeachingStyle, string> = {
    story: "故事化讲解",
    logic: "逻辑推导",
    analogy: "类比讲解",
    steps: "步骤拆解",
  };
  const totalMinutes = steps.reduce((sum, step) => sum + step.minutes, 0);
  return [
    `## ${topic} 学习计划`,
    `我先按「${styleText[style]}」来带你学，预计 ${totalMinutes} 分钟完成一轮闭环。`,
    "",
    "### 执行路线",
    ...steps.map((step, index) => `${index + 1}. ${step.title}（${step.minutes} 分钟）`),
    "",
    "> 如果这个节奏可以，点「确认计划」或直接回复“确认”，我会把它写入路线进度，并启动资源查找 Agent。",
  ].join("\n");
}

function buildResourceMarkdown(topic: string, leads: StudyResourceLead[], errorSummary?: string) {
  const liveCount = leads.filter((lead) => lead.live).length;
  return [
    `## ${topic} 资源 Agent 已完成一轮查找`,
    liveCount > 0
      ? `我已完成在线检索，并找到 ${liveCount} 个可直接打开的结果；同时保留本地资料和搜索入口作为补充。`
      : "在线检索未拿到可直接引用的结果，我已降级为本地资料和可点击搜索入口，仍按学习阶段排好顺序。",
    errorSummary ? `> 检索说明：${errorSummary}` : "",
    "",
    "### 推荐顺序",
    ...leads.map((lead, index) => `${index + 1}. **${lead.title}** - ${lead.reason}`),
    "",
    "> 下一步我会从第一项开始引导你学。需要做题时，我会打开番茄钟并基于资料生成题目。",
  ].join("\n");
}

function buildLearningStartMarkdown(topic: string) {
  return [
    `## 开始学习：${topic}`,
    "先做第一轮：用 10 分钟把目标、边界和已有基础说清楚。",
    "",
    "- 你可以直接回答：你现在对这个主题已经知道什么？",
    "- 如果不确定，我会用三个问题帮你定位基础。",
    "- 需要练习时点右侧“资料与依据”里的出题按钮，番茄钟会用来计时。",
  ].join("\n");
}

function buildNoteBlock(title: string, content: string) {
  const compact = content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  return [`## ${title}`, "", "### AI 整理", ...compact.map((line) => `- ${line.replace(/^[-*\d.]+\s*/, "")}`)].join("\n");
}

export function useStudySession(routeContext: StudyLocationState | null, routeContextKey: string) {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const goal = getStudyTree(data);
  const tasks = flattenTasks(data);
  const initialStyle = data.settings.preferredStyle;

  const [teachingStyle] = useState<TeachingStyle>(initialStyle);
  const [isFreeConversation, setIsFreeConversation] = useState(() => !routeContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    routeContext?.taskId ?? goal?.milestones?.[0]?.tasks?.[0]?.id ?? tasks[0]?.id ?? ""
  );
  const [pomodoroSeconds, setPomodoroSeconds] = useState(data.settings.pomodoroMinutes * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [noteDraft, setNoteDraft] = useState(() => data.notes[0]?.content ?? "");
  const [input, setInput] = useState("");
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [autoTriggered, setAutoTriggered] = useState<Set<string>>(new Set());
  const [latestRag, setLatestRag] = useState<LibraryRagResult | null>(null);
  const [practiceSet, setPracticeSet] = useState<RagPracticeSet | null>(null);
  const [practiceHint, setPracticeHint] = useState<string>("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [journeyStage, setJourneyStage] = useState<StudyJourneyStage>("define");
  const [pendingPlanSteps, setPendingPlanSteps] = useState<StudyPlanStep[]>([]);
  const [resourceLeads, setResourceLeads] = useState<StudyResourceLead[]>([]);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() => getActiveStudyConversationId());
  const [, setStudyInteractionCount] = useState(getStudyInteractionCount(data));
  const [conversationContext, setConversationContext] = useState<StudyLocationState | null>(routeContext);

  const activeConversationIdRef = useRef(activeConversationId);
  const activeConversationHydratedRef = useRef(false);
  const skipNextConversationSyncRef = useRef(false);
  const contextSyncRef = useRef(false);
  const hydratedConversationRef = useRef(false);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // --- Derived state ---
  const selectedResource = conversationContext?.resourceId
    ? data.libraryItems.find((item) => item.id === conversationContext.resourceId)
    : undefined;
  const selectedNode = conversationContext?.nodeId
    ? data.knowledgeGraph.nodes.find((node) => node.id === conversationContext.nodeId)
    : selectedResource?.linkedNodeIds?.[0]
    ? data.knowledgeGraph.nodes.find((node) => node.id === selectedResource.linkedNodeIds[0])
    : undefined;
  const selectedNote = conversationContext?.noteId
    ? data.notes.find((note) => note.id === conversationContext.noteId)
    : undefined;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const profileText = data.learningProfile
    ? modeLabel(data.learningProfile.dominantMode) + "型偏好"
    : "尚未建立学习画像";
  const hasBoundStudyContext = Boolean(
    conversationContext?.resourceId || conversationContext?.nodeId || conversationContext?.taskId || conversationContext?.noteId
  );
  const isUnboundFreeSession = !hasBoundStudyContext;
  const isBlankNewConversation = isUnboundFreeSession && messages.length === 0;
  const activeMilestone = goal?.milestones.find((milestone) =>
    milestone.tasks.some((task) => task.id === selectedTaskId)
  );
  const baseLearningGoal = isUnboundFreeSession
    ? isBlankNewConversation
      ? "新建对话"
      : "自由问答"
    : selectedResource
    ? selectedResource.title
    : selectedNote
    ? selectedNote.title
    : selectedTask?.title ?? "当前任务";
  const learningGoal = conversationTitle?.trim() || baseLearningGoal;
  const completedToday = tasks.filter((task) => task.done).length;
  const sessionSummaryText = isUnboundFreeSession
    ? messages.length > 0
      ? "未绑定目标进度"
      : ""
    : selectedResource
    ? selectedNode
      ? `${selectedNode.label} · ${selectedResource.summary}`
      : selectedResource.summary
    : activeMilestone?.title.includes("微分中值定理")
    ? "理解拉格朗日中值定理及其几何意义"
    : activeMilestone
    ? "理解" + activeMilestone.title.replace(/^第\s*\d+\s*章\s*/, "")
    : selectedTask?.meta ?? `今日完成 ${completedToday}/${tasks.length}`;
  const totalSeconds = data.settings.pomodoroMinutes * 60;
  const pomodoroProgress = totalSeconds > 0 ? Math.max(0, Math.min(1, 1 - pomodoroSeconds / totalSeconds)) : 0;
  const sessionStatus = getStudySessionStatus({
    isFreeConversation,
    context: conversationContext,
    messages,
    loading: isGeneratingAnswer,
  });
  const currentTopic = inferLearningTopic(
    messages.find((message) => message.role === "user")?.content || learningGoal
  );

  // --- Effects ---
  useEffect(() => {
    if (!pomodoroRunning) return;
    const timer = window.setInterval(() => {
      setPomodoroSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pomodoroRunning]);

  useEffect(() => {
    if (pomodoroSeconds === 0) setPomodoroRunning(false);
  }, [pomodoroSeconds]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last?.triggers || last.role !== "assistant") return;
    if (autoTriggered.has(last.id)) return;
    const target = last.triggers[0];
    if (!target) return;
    if (!canAutoOpenPanel(target, data.settings)) {
      setAutoTriggered((prev) => {
        const next = new Set(prev);
        next.add(last.id);
        return next;
      });
      return;
    }
    setActivePanel(target);
    setAutoTriggered((prev) => {
      const next = new Set(prev);
      next.add(last.id);
      return next;
    });
  }, [messages, autoTriggered, data.settings]);

  // --- Conversation persistence ---
  function buildConversationSnapshot(override?: Partial<PersistedStudyConversation>): PersistedStudyConversation {
    const currentConversationId = activeConversationIdRef.current;
    const snapshotMessages = (override?.messages as ChatMessage[] | undefined) ?? messages;
    const snapshotContext = override?.context ?? conversationContext;
    const snapshotIsFreeConversation = override?.isFreeConversation ?? isFreeConversation;
    const snapshotSelectedTaskId = override?.selectedTaskId ?? selectedTaskId;
    const snapshotNoteDraft = override?.noteDraft ?? noteDraft;
    const firstUserMessage = sanitizeLlmText(snapshotMessages.find((m) => m.role === "user")?.content ?? "");
    const firstAssistantMessage = sanitizeLlmText(snapshotMessages.find((m) => m.role === "assistant")?.content ?? "");
    const title = buildStudyConversationTitle({
      manualTitle: override?.title ?? conversationTitle ?? undefined,
      selectedTaskTitle: baseLearningGoal,
      resourceTitle: selectedResource?.title,
      firstUserMessage,
      firstAssistantMessage,
      isFreeConversation: snapshotIsFreeConversation,
    });

    return {
      id: currentConversationId ?? `study-conv-${Date.now()}`,
      title,
      createdAt: override?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFreeConversation: snapshotIsFreeConversation,
      context: snapshotContext,
      selectedTaskId: snapshotSelectedTaskId,
      teachingStyle,
      noteDraft: snapshotNoteDraft,
      messages: snapshotMessages,
    };
  }

  function persistCurrentConversation(override?: Partial<PersistedStudyConversation>) {
    const snapshot = buildConversationSnapshot(override);
    const saved = activeConversationIdRef.current ? upsertStudyConversation(snapshot) : createStudyConversation(snapshot);
    setConversationTitle(sanitizeLlmText(saved.title));
    activeConversationIdRef.current = saved.id;
    activeConversationHydratedRef.current = true;
    skipNextConversationSyncRef.current = true;
    setActiveConversationIdState(saved.id);
    setActiveStudyConversationId(saved.id);
    return saved;
  }

  function resetStudySession(next: { context?: StudyLocationState | null; freeMode?: boolean } = {}) {
    const nextContext = next.context === undefined ? conversationContext : next.context;
    const nextResource = nextContext?.resourceId
      ? data.libraryItems.find((item) => item.id === nextContext.resourceId)
      : undefined;
    const nextNode = nextContext?.nodeId
      ? data.knowledgeGraph.nodes.find((node) => node.id === nextContext.nodeId)
      : nextResource?.linkedNodeIds?.[0]
      ? data.knowledgeGraph.nodes.find((node) => node.id === nextResource.linkedNodeIds[0])
      : undefined;
    const freeMode = next.freeMode ?? false;
    const nextTaskId = nextContext?.taskId ?? goal?.milestones?.[0]?.tasks?.[0]?.id ?? tasks[0]?.id ?? "";

    setConversationContext(nextContext);
    setIsFreeConversation(freeMode);
    setSelectedTaskId(nextTaskId);
    setMessages(buildInitialMessages(teachingStyle, nextResource?.title, nextNode?.label, true));
    setLatestRag(null);
    setPracticeSet(null);
    setPracticeHint("");
    setJourneyStage(nextContext ? "learn" : "define");
    setPendingPlanSteps([]);
    setResourceLeads([]);
    setInput("");
    setIsGeneratingAnswer(false);
    setAutoTriggered(new Set());
    setActivePanel(null);
  }

  useEffect(() => {
    if (!contextSyncRef.current) {
      contextSyncRef.current = true;
      return;
    }
    resetStudySession({ context: routeContext, freeMode: false });
  }, [routeContextKey]);

  useEffect(() => {
    const sync = () => {
      const nextId = getActiveStudyConversationId();
      if (skipNextConversationSyncRef.current && nextId === activeConversationIdRef.current) {
        skipNextConversationSyncRef.current = false;
        return;
      }
      if (nextId === activeConversationIdRef.current && activeConversationHydratedRef.current) return;
      activeConversationIdRef.current = nextId;
      setActiveConversationIdState(nextId);
      if (!nextId) {
        activeConversationHydratedRef.current = true;
        setConversationTitle(null);
        resetStudySession({ context: routeContext, freeMode: !routeContext });
        return;
      }
      const conversation = getStudyConversation(nextId);
      if (!conversation) return;
      activeConversationHydratedRef.current = true;
      hydratedConversationRef.current = true;
      setConversationTitle(conversation.title);
      setConversationContext(conversation.context);
      setIsFreeConversation(conversation.isFreeConversation);
      setSelectedTaskId(conversation.context?.taskId ?? conversation.selectedTaskId);
      setMessages(
        (conversation.messages as ChatMessage[]).map((message) => ({
          ...message,
          content: sanitizePersistedText(message.content),
        }))
      );
      setNoteDraft(conversation.noteDraft);
      setInput("");
      setLatestRag(null);
      setPracticeSet(null);
      setPracticeHint("");
      setJourneyStage(conversation.messages.some((message) => message.kind === "plan") ? "plan" : "learn");
      setPendingPlanSteps(
        (conversation.messages.find((message) => message.planSteps?.length)?.planSteps as StudyPlanStep[] | undefined) ?? []
      );
      setResourceLeads(
        (conversation.messages.find((message) => message.resourceLeads?.length)?.resourceLeads as StudyResourceLead[] | undefined) ?? []
      );
      setIsGeneratingAnswer(false);
      setAutoTriggered(new Set());
      setActivePanel(null);
    };

    const handleNew = () => {
      activeConversationIdRef.current = null;
      activeConversationHydratedRef.current = true;
      skipNextConversationSyncRef.current = true;
      setActiveStudyConversationId(null);
      setActiveConversationIdState(null);
      setConversationTitle(null);
      resetStudySession({ context: null, freeMode: true });
    };

    sync();
    window.addEventListener(getStudyConversationChangeEventName(), sync);
    window.addEventListener("qizen-study-start-new", handleNew);
    return () => {
      window.removeEventListener(getStudyConversationChangeEventName(), sync);
      window.removeEventListener("qizen-study-start-new", handleNew);
    };
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    if (!hydratedConversationRef.current && messages.every((m) => m.role === "assistant")) return;
    hydratedConversationRef.current = true;
    persistCurrentConversation();
  }, [messages, noteDraft, selectedTaskId, conversationContext, isFreeConversation]);

  // --- Business logic ---
  function shouldGenerateAiTitle(nextMessages: ChatMessage[]) {
    if (!data.settings.autoGenerateSessionTitle) return false;
    const genericTitle = !conversationTitle || conversationTitle === baseLearningGoal || /^新的/.test(conversationTitle);
    const userMessageCount = nextMessages.filter((m) => m.role === "user").length;
    return genericTitle && userMessageCount === 1;
  }

  async function refreshConversationTitle(nextMessages: ChatMessage[]) {
    if (!shouldGenerateAiTitle(nextMessages)) return;
    const providerConfig = await resolveLlmProviderConfig(data.settings.llm);
    const aiTitle = await generateStudyConversationTitle({
      providerConfig,
      selectedResourceTitle: selectedResource?.title,
      messages: nextMessages
        .filter((m) => m.role === "user")
        .slice(0, 2)
        .map((m) => ({ role: m.role, content: sanitizeLlmText(m.content) })),
    });
    if (!aiTitle) return;
    const cleanTitle = sanitizeLlmText(aiTitle);
    setConversationTitle(cleanTitle);
    persistCurrentConversation({ title: cleanTitle, messages: nextMessages });
  }

  async function streamAssistantMessage(message: ChatMessage) {
    const finalContent = message.content;
    const streamingMessage: ChatMessage = {
      ...message,
      content: "",
      streamState: "streaming",
    };
    setMessages((prev) => [...prev, streamingMessage]);

    for (let index = 0; index < finalContent.length; index += STREAM_CHUNK_SIZE) {
      const nextContent = finalContent.slice(0, index + STREAM_CHUNK_SIZE);
      setMessages((prev) =>
        prev.map((item) => (item.id === message.id ? { ...item, content: nextContent } : item))
      );
      await wait(STREAM_DELAY_MS);
    }

    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id ? { ...item, content: finalContent, streamState: "done" } : item
      )
    );
  }

  async function confirmPlanAndResearch(steps = pendingPlanSteps, topic = currentTopic, force = false) {
    if (isGeneratingAnswer && !force) return;
    const planSteps = steps.length > 0 ? steps : buildPlanSteps(topic, teachingStyle);
    const nextData = addLearningPlanGoal({
      title: topic,
      description: `学习会话中确认的 ${topic} 计划。`,
      subject: topic,
      steps: planSteps,
    });
    setData(nextData);
    setPendingPlanSteps(planSteps);
    setJourneyStage("research");
    setActivePanel("resource");
    setIsGeneratingAnswer(true);

    const localTitles = latestRag ? collectHitResourceTitles(latestRag) : [];
    const resourceResult = await findLearningResources({ topic, localTitles });
    const leads = resourceResult.leads;
    setResourceLeads(leads);
    const assistantMessage: ChatMessage = {
      id: "a-agent-" + Date.now(),
      role: "assistant",
      kind: "agent",
      content: buildResourceMarkdown(topic, leads, resourceResult.errorSummary) + "\n\n" + buildLearningStartMarkdown(topic),
      thinking: [
        "写入学习路线",
        "检索本地资料库",
        resourceResult.usedLiveSearch ? "完成在线资源检索" : "在线检索降级为搜索入口",
        "准备引导学习",
      ],
      planSteps,
      resourceLeads: leads,
      triggers: ["resource", "graph", "pomodoro"],
    };
    appendStudySessionEvent({
      id: `study-event-${Date.now()}`,
      type: "progress-updated",
      recordedAt: new Date().toISOString(),
      question: topic,
      resourceId: null,
      nodeId: null,
      taskId: null,
      hitResourceTitles: localTitles,
      generatedPractice: false,
      progressAction: "node-reviewed",
      llm: { usedRealModel: resourceResult.usedLiveSearch, providerLabel: "资源 Agent", usedFallback: !resourceResult.usedLiveSearch },
    });
    await streamAssistantMessage(assistantMessage);
    setJourneyStage("learn");
    setIsGeneratingAnswer(false);
  }

  function handleUnderstood() {
    if (!shouldAllowLearningProgress(conversationContext)) {
      const message: ChatMessage = {
        id: `a-understood-blocked-${Date.now()}`,
        role: "assistant",
        content: `这一轮没有绑定明确的目标任务或知识节点，我不会把“我懂了”写进进度。你可以从目标或图谱进入学习空间后再推进。`,
      };
      appendStudySessionEvent({
        id: `study-event-${Date.now()}`,
        type: "progress-updated",
        recordedAt: new Date().toISOString(),
        question: learningGoal,
        resourceId: selectedResource?.id ?? null,
        nodeId: selectedNode?.id ?? null,
        taskId: null,
        hitResourceTitles: [],
        generatedPractice: false,
        progressAction: "blocked",
        llm: { usedRealModel: false, providerLabel: "本地回答", usedFallback: true },
      });
      setMessages((prev) => [...prev, message]);
      return;
    }

    const targetTaskId = conversationContext?.taskId ?? selectedTaskId;
    const targetTask = tasks.find((task) => task.id === targetTaskId);
    if (conversationContext?.taskId && targetTask && !targetTask.done) {
      const nextData = toggleTask(targetTaskId);
      setData(nextData);
    }
    const taskTitle = targetTask?.title ?? selectedTask?.title ?? learningGoal;
    appendStudySessionEvent({
      id: `study-event-${Date.now()}`,
      type: "progress-updated",
      recordedAt: new Date().toISOString(),
      question: taskTitle,
      resourceId: selectedResource?.id ?? null,
      nodeId: selectedNode?.id ?? null,
      taskId: conversationContext?.taskId ?? null,
      hitResourceTitles: latestRag ? collectHitResourceTitles(latestRag) : [],
      generatedPractice: false,
      progressAction: conversationContext?.taskId ? "task-completed" : "node-reviewed",
      llm: { usedRealModel: false, providerLabel: "本地回答", usedFallback: true },
    });
    const message: ChatMessage = {
      id: `a-understood-${Date.now()}`,
      role: "assistant",
      content: conversationContext?.taskId
        ? `好，已把「${taskTitle}」标记为已掌握。下一步我会把你推到后续节点。`
        : `好，这次只记录「${selectedNode?.label ?? taskTitle}」已复习，不会误改目标任务。`,
      triggers: ["graph"],
    };
    setMessages((prev) => [...prev, message]);
    setActivePanel("graph");
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || isGeneratingAnswer) return;

    const rawRag = shouldSearchKnowledgeBase(text)
      ? retrieveRelevantLibraryContext(data, text, {
          resourceId: selectedResource?.id,
          nodeId: selectedNode?.id,
          topK: 3,
          minScore: Math.max(1.5, data.settings.ragSimilarityThreshold * 3.5),
        })
      : createEmptyRag(text);
    const rag = getStrongRag(rawRag);
    const hasHits = rag.results.length > 0;

    const triggerHints: PanelKey[] = [];
    if (hasHits) triggerHints.push("resource");
    if (data.settings.autoAppendNote && (text.includes("笔记") || text.includes("整理"))) triggerHints.push("note");
    if (data.settings.autoStartPomodoro && (text.includes("练习") || text.includes("做题") || text.includes("专注"))) triggerHints.push("pomodoro");
    if (text.includes("节点") || text.includes("图谱") || text.includes("前置")) triggerHints.push("graph");

    const userMessage: ChatMessage = { id: "u-" + Date.now(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLatestRag(hasHits ? rag : null);
    setPracticeSet(null);
    setPracticeHint("");
    if (!overrideText) setInput("");
    setIsGeneratingAnswer(true);

    if (isPlanConfirmation(text) && pendingPlanSteps.length > 0) {
      await confirmPlanAndResearch(pendingPlanSteps, currentTopic, true);
      return;
    }

    const isLocalIntent = isNonLearningChat(text);
    const isPlanRequest = isStudyPlanRequest(text);
    const shouldCreatePlan =
      isPlanRequest ||
      (isUnboundFreeSession && messages.filter((message) => message.role === "user").length === 0 && !isLocalIntent);
    const shouldRunResourceAgent = wantsResourceAgent(text) && !shouldCreatePlan && !isLocalIntent;
    if (shouldCreatePlan) triggerHints.push("graph");
    if (shouldRunResourceAgent) triggerHints.push("resource");
    const shouldUseModelForAnswer = !isLocalIntent && !shouldCreatePlan && !shouldRunResourceAgent;
    const providerConfig = await resolveLlmProviderConfig(data.settings.llm);
    const llmResult = shouldUseModelForAnswer
      ? await generateStudyAnswer({
          query: text,
          rag,
          style: teachingStyle,
          profileText,
          selectedResourceTitle: selectedResource?.title,
          selectedNodeLabel: selectedNode?.label,
          providerConfig,
        })
      : { answer: "", usedFallback: true, providerLabel: "本地回答", errorSummary: undefined };

    const topic = inferLearningTopic(text);
    const planSteps = shouldCreatePlan ? buildPlanSteps(topic, teachingStyle) : [];
    const resourceResult = shouldRunResourceAgent
      ? await findLearningResources({
          topic,
          localTitles: hasHits ? collectHitResourceTitles(rag) : data.libraryItems.slice(0, 2).map((item) => item.title),
        })
      : null;
    const leads = resourceResult?.leads ?? [];
    const fallbackContent = shouldCreatePlan
      ? [
          "## 先确认学习方式",
          "我会先把学习内容拆成目标、方法、计划、资源和练习五段，不直接把你丢进长篇资料。",
          "",
          buildPlanMarkdown(topic, planSteps, teachingStyle),
        ].join("\n")
      : shouldRunResourceAgent
      ? buildResourceMarkdown(topic, leads, resourceResult?.errorSummary)
      : isPlanRequest
      ? buildContextStudyPlan({
          selectedResourceTitle: selectedResource?.title,
          selectedNodeLabel: selectedNode?.label,
          selectedTaskTitle: selectedTask?.title,
          style: teachingStyle,
        })
      : buildAssistantReply({
          query: text,
          style: teachingStyle,
          selectedResourceTitle: selectedResource?.title,
          selectedNodeLabel: selectedNode?.label,
          rag,
        });

    const assistantContent = sanitizeLlmText(
      llmResult.usedFallback
        ? `${fallbackContent}\n\n${llmResult.errorSummary ? `（已回退到本地回答：${llmResult.errorSummary}）` : "（当前未使用真实模型，已回退到本地回答。）"}`
        : llmResult.answer
    );

    const assistantMessage: ChatMessage = {
      id: "a-" + (Date.now() + 1),
      role: "assistant",
      kind: shouldCreatePlan ? "plan" : shouldRunResourceAgent ? "agent" : "normal",
      content: assistantContent,
      thinking: shouldCreatePlan
        ? ["识别学习主题", "匹配学习方式", "拆分可执行路线", "等待用户确认"]
        : shouldRunResourceAgent
        ? [
            "检索本地资料库",
            resourceResult?.usedLiveSearch ? "完成在线资源检索" : "在线检索降级为搜索入口",
            "按学习阶段排序",
          ]
        : ["理解问题", hasHits ? "匹配资料依据" : "未命中本地资料", "组织 Markdown 回答"],
      planSteps: shouldCreatePlan ? planSteps : undefined,
      resourceLeads: shouldRunResourceAgent ? leads : undefined,
      triggers: triggerHints.length ? Array.from(new Set(triggerHints)) : undefined,
      rag: hasHits ? rag : undefined,
      providerLabel: shouldRunResourceAgent ? "资源 Agent" : llmResult.providerLabel,
      usedFallback: shouldRunResourceAgent ? !resourceResult?.usedLiveSearch : llmResult.usedFallback,
      errorSummary: shouldRunResourceAgent ? resourceResult?.errorSummary : llmResult.errorSummary,
    };

    appendStudySessionEvent({
      id: `study-event-${Date.now()}`,
      type: "ask",
      recordedAt: new Date().toISOString(),
      question: text,
      resourceId: selectedResource?.id ?? null,
      nodeId: selectedNode?.id ?? null,
      taskId: conversationContext?.taskId ?? null,
      hitResourceTitles: collectHitResourceTitles(rag),
      generatedPractice: false,
      llm: shouldRunResourceAgent
        ? {
            usedRealModel: Boolean(resourceResult?.usedLiveSearch),
            providerLabel: "资源 Agent",
            usedFallback: !resourceResult?.usedLiveSearch,
          }
        : { usedRealModel: !llmResult.usedFallback, providerLabel: llmResult.providerLabel, usedFallback: llmResult.usedFallback },
    });
    const nextMessages = [...messages, userMessage, assistantMessage];

    if (shouldCreatePlan) {
      setJourneyStage("plan");
      setPendingPlanSteps(planSteps);
      setActivePanel("graph");
    }

    if (shouldRunResourceAgent) {
      setJourneyStage("research");
      setResourceLeads(leads);
      setActivePanel("resource");
    }

    if (data.settings.autoAppendNote && triggerHints.includes("note")) {
      const targetNote = selectedNote ?? data.notes[0];
      const noteBlock = `\n\n## ${learningGoal}\n${assistantContent}`;
      setNoteDraft((prev) => {
        const next = prev.trim() ? `${prev.trimEnd()}${noteBlock}` : noteBlock.trim();
        if (targetNote) updateNote(targetNote.id, next);
        return next;
      });
    }

    setStudyInteractionCount((prev) => prev + 1);
    await streamAssistantMessage(assistantMessage);
    setIsGeneratingAnswer(false);
    void refreshConversationTitle(nextMessages);
  }

  function generatePracticeFromLatestRag() {
    if (!latestRag || latestRag.results.length === 0) {
      setPracticeSet(null);
      setPracticeHint("请先提一个问题，或先选择资料，让系统先完成一次命中检索。");
      setActivePanel("resource");
      return;
    }

    const nextPracticeSet = createPracticeSetFromRagResult(latestRag);
    if (!nextPracticeSet) {
      setPracticeHint("当前命中资料还不足以生成质量稳定的题目，请换一个更具体的问题再试。");
      return;
    }

    appendStudySessionEvent({
      id: `study-event-${Date.now()}`,
      type: "practice-generated",
      recordedAt: new Date().toISOString(),
      question: latestRag.query,
      resourceId: selectedResource?.id ?? latestRag.results[0]?.resource.id ?? null,
      nodeId: selectedNode?.id ?? null,
      taskId: conversationContext?.taskId ?? null,
      hitResourceTitles: collectHitResourceTitles(latestRag),
      generatedPractice: true,
      llm: {
        usedRealModel: !(messages[messages.length - 1]?.usedFallback ?? true),
        providerLabel: messages[messages.length - 1]?.providerLabel ?? "本地回答",
        usedFallback: messages[messages.length - 1]?.usedFallback ?? true,
      },
    });
    setStudyInteractionCount((prev) => prev + 1);
    setPracticeSet(nextPracticeSet);
    setPracticeHint(`已生成 ${nextPracticeSet.questions.length} 道题，番茄钟已开始为本组练习计时。`);
    setPomodoroSeconds(totalSeconds);
    setPomodoroRunning(true);
    setActivePanel("resource");
  }

  function completeCurrentPracticeSet() {
    if (!practiceSet) return;
    const persistedPractice = data.practiceSets.find(
      (item) => item.title === practiceSet.title || item.title.includes(practiceSet.primaryTitle)
    );
    if (persistedPractice) {
      const nextData = updatePracticeSetStatus(persistedPractice.id, "completed");
      setData(nextData);
    }
    appendStudySessionEvent({
      id: `study-event-${Date.now()}`,
      type: "practice-completed",
      recordedAt: new Date().toISOString(),
      question: latestRag?.query ?? practiceSet.primaryTitle,
      resourceId: selectedResource?.id ?? latestRag?.results[0]?.resource.id ?? null,
      nodeId: selectedNode?.id ?? null,
      taskId: conversationContext?.taskId ?? null,
      hitResourceTitles: latestRag ? collectHitResourceTitles(latestRag) : practiceSet.basedOnTitles,
      generatedPractice: false,
      practiceScore: practiceSet.questions.length,
      practiceQuestionCount: practiceSet.questions.length,
      llm: {
        usedRealModel: !(messages[messages.length - 1]?.usedFallback ?? true),
        providerLabel: messages[messages.length - 1]?.providerLabel ?? "本地回答",
        usedFallback: messages[messages.length - 1]?.usedFallback ?? true,
      },
    });
    setStudyInteractionCount((prev) => prev + 1);
    setPracticeHint(`已记录本组 ${practiceSet.questions.length} 道练习完成。`);
  }

  function handleNoteDraftChange(value: string) {
    setNoteDraft(value);
    const targetNote = selectedNote ?? data.notes[0];
    if (targetNote) updateNote(targetNote.id, value);
  }

  function saveMessageToNote(content: string) {
    const selectedText = window.getSelection?.()?.toString().trim();
    const source = selectedText && content.includes(selectedText) ? selectedText : content;
    const noteBlock = buildNoteBlock(learningGoal, source);
    const targetNote = selectedNote ?? data.notes[0];
    if (targetNote) {
      const next = noteDraft.trim() ? `${noteDraft.trimEnd()}\n\n${noteBlock}` : noteBlock;
      setNoteDraft(next);
      const nextData = updateNote(targetNote.id, next);
      setData(nextData);
    } else {
      const nextData = addNote({
        title: `${learningGoal} 笔记`,
        topic: learningGoal,
        content: noteBlock,
      });
      setData(nextData);
      setNoteDraft(noteBlock);
    }
    setActivePanel("note");
  }

  function selectResource(resourceId: string | null) {
    setConversationContext({
      source: "library",
      resourceId: resourceId ?? undefined,
      nodeId: undefined,
      taskId: undefined,
      noteId: undefined,
    });
  }

  function selectNode(nodeId: string | null) {
    setConversationContext({
      source: "graph",
      resourceId: undefined,
      nodeId: nodeId ?? undefined,
      taskId: undefined,
      noteId: undefined,
    });
  }

  return {
    // State
    messages,
    input,
    activePanel,
    isGeneratingAnswer,
    pomodoroSeconds,
    pomodoroRunning,
    pomodoroProgress,
    totalSeconds,
    noteDraft,
    latestRag,
    practiceSet,
    practiceHint,
    sessionStatus,
    journeyStage,
    pendingPlanSteps,
    resourceLeads,
    // Derived
    learningGoal,
    sessionSummaryText,
    selectedResource,
    selectedNode,
    selectedTask,
    // Handlers
    setInput,
    setActivePanel,
    setPomodoroRunning,
    setPomodoroSeconds,
    sendMessage,
    confirmPlanAndResearch,
    handleUnderstood,
    saveMessageToNote,
    generatePracticeFromLatestRag,
    completeCurrentPracticeSet,
    handleNoteDraftChange,
    selectResource,
    selectNode,
  };
}
