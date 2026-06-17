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
  type LlmProviderConfig,
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
import { inferLearnerLevel } from "../lib/study/adaptive";
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
import {
  buildLearningStartMarkdown,
  buildNoteBlock,
  buildPlanMarkdown,
  buildPlanSteps,
  buildResourceMarkdown,
  inferLearningTopic,
  isPlanConfirmation,
  wantsResourceAgent,
} from "../lib/study/message-builders";
import type { ChatMessage, PanelKey, StudyJourneyStage, StudyLocationState, StudyPlanStep, StudyResourceLead } from "../lib/study/types";

const STREAM_CHUNK_SIZE = 8;
const STREAM_DELAY_MS = 14;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

    // 学习型问题：走真实模型并实时流式渲染（成功时 token 逐步到达）。
    if (shouldUseModelForAnswer) {
      const assistantId = "a-" + (Date.now() + 1);
      const sharedTriggers = triggerHints.length ? Array.from(new Set(triggerHints)) : undefined;
      const streamingShell: ChatMessage = {
        id: assistantId,
        role: "assistant",
        kind: "normal",
        content: "",
        streamState: "streaming",
        thinking: ["理解问题", hasHits ? "匹配资料依据" : "未命中本地资料", "组织 Markdown 回答"],
        triggers: sharedTriggers,
        rag: hasHits ? rag : undefined,
      };
      setMessages((prev) => [...prev, streamingShell]);

      let rawAnswer = "";
      const llmResult = await generateStudyAnswer({
        query: text,
        rag,
        style: teachingStyle,
        profileText,
        selectedResourceTitle: selectedResource?.title,
        selectedNodeLabel: selectedNode?.label,
        providerConfig,
        onToken: (delta) => {
          rawAnswer += delta;
          const display = sanitizeLlmText(rawAnswer);
          setMessages((prev) =>
            prev.map((item) => (item.id === assistantId ? { ...item, content: display } : item))
          );
        },
      });

      const finalContent = sanitizeLlmText(
        llmResult.usedFallback
          ? `${buildAssistantReply({
              query: text,
              style: teachingStyle,
              selectedResourceTitle: selectedResource?.title,
              selectedNodeLabel: selectedNode?.label,
              rag,
            })}\n\n${
              llmResult.errorSummary
                ? `（已回退到本地回答：${llmResult.errorSummary}）`
                : "（当前未使用真实模型，已回退到本地回答。）"
            }`
          : llmResult.answer
      );

      const finalMessage: ChatMessage = {
        ...streamingShell,
        content: finalContent,
        streamState: "done",
        providerLabel: llmResult.providerLabel,
        usedFallback: llmResult.usedFallback,
        errorSummary: llmResult.errorSummary,
      };
      setMessages((prev) => prev.map((item) => (item.id === assistantId ? finalMessage : item)));

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
        llm: {
          usedRealModel: !llmResult.usedFallback,
          providerLabel: llmResult.providerLabel,
          usedFallback: llmResult.usedFallback,
        },
      });

      if (data.settings.autoAppendNote && sharedTriggers?.includes("note")) {
        const targetNote = selectedNote ?? data.notes[0];
        const noteBlock = `\n\n## ${learningGoal}\n${finalContent}`;
        setNoteDraft((prev) => {
          const next = prev.trim() ? `${prev.trimEnd()}${noteBlock}` : noteBlock.trim();
          if (targetNote) updateNote(targetNote.id, next);
          return next;
        });
      }

      setStudyInteractionCount((prev) => prev + 1);
      setIsGeneratingAnswer(false);
      void refreshConversationTitle([...messages, userMessage, finalMessage]);
      return;
    }

    const llmResult = { answer: "", usedFallback: true, providerLabel: "本地回答", errorSummary: undefined as string | undefined };

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

  // 学习 Agent：单步真实流式生成（无模型时降级本地），独立于 sendMessage。
  async function streamOneAgentStep(
    step: { label: string; query: string; thinking: string[] },
    rag: LibraryRagResult,
    providerConfig: LlmProviderConfig
  ) {
    const assistantId = `a-agent-step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const hasHits = rag.results.length > 0;
    const shell: ChatMessage = {
      id: assistantId,
      role: "assistant",
      kind: "agent",
      content: "",
      streamState: "streaming",
      thinking: step.thinking,
      rag: hasHits ? rag : undefined,
    };
    setMessages((prev) => [...prev, shell]);

    let rawAnswer = "";
    const llmResult = await generateStudyAnswer({
      query: step.query,
      rag,
      style: teachingStyle,
      profileText,
      selectedResourceTitle: selectedResource?.title,
      selectedNodeLabel: selectedNode?.label,
      providerConfig,
      onToken: (delta) => {
        rawAnswer += delta;
        const display = sanitizeLlmText(rawAnswer);
        setMessages((prev) => prev.map((item) => (item.id === assistantId ? { ...item, content: display } : item)));
      },
    });

    const finalContent = sanitizeLlmText(
      llmResult.usedFallback
        ? `${buildAssistantReply({
            query: step.query,
            style: teachingStyle,
            selectedResourceTitle: selectedResource?.title,
            selectedNodeLabel: selectedNode?.label,
            rag,
          })}\n\n${
            llmResult.errorSummary
              ? `（已回退到本地回答：${llmResult.errorSummary}）`
              : "（当前未使用真实模型，已回退到本地回答。）"
          }`
        : llmResult.answer
    );

    const finalMessage: ChatMessage = {
      ...shell,
      content: finalContent,
      streamState: "done",
      providerLabel: llmResult.providerLabel,
      usedFallback: llmResult.usedFallback,
      errorSummary: llmResult.errorSummary,
    };
    setMessages((prev) => prev.map((item) => (item.id === assistantId ? finalMessage : item)));

    appendStudySessionEvent({
      id: `study-event-${Date.now()}`,
      type: "ask",
      recordedAt: new Date().toISOString(),
      question: step.query,
      resourceId: selectedResource?.id ?? null,
      nodeId: selectedNode?.id ?? null,
      taskId: conversationContext?.taskId ?? null,
      hitResourceTitles: collectHitResourceTitles(rag),
      generatedPractice: false,
      llm: {
        usedRealModel: !llmResult.usedFallback,
        providerLabel: llmResult.providerLabel,
        usedFallback: llmResult.usedFallback,
      },
    });
    setStudyInteractionCount((prev) => prev + 1);
  }

  async function runLearningAgent(topicOverride?: string) {
    if (isGeneratingAnswer) return;
    const topic = (topicOverride || currentTopic || learningGoal).trim() || "这个主题";
    setIsGeneratingAnswer(true);
    setJourneyStage("learn");

    const providerConfig = await resolveLlmProviderConfig(data.settings.llm);
    const rawRag = shouldSearchKnowledgeBase(topic)
      ? retrieveRelevantLibraryContext(data, topic, {
          resourceId: selectedResource?.id,
          nodeId: selectedNode?.id,
          topK: 3,
          minScore: Math.max(1.5, data.settings.ragSimilarityThreshold * 3.5),
        })
      : createEmptyRag(topic);
    const rag = getStrongRag(rawRag);
    if (rag.results.length > 0) {
      setLatestRag(rag);
      setActivePanel("resource");
    }

    const intro: ChatMessage = {
      id: `a-agent-intro-${Date.now()}`,
      role: "assistant",
      kind: "agent",
      content: sanitizeLlmText(
        `## 学习 Agent 开始带学：${topic}\n我会分三步带你过一轮：先讲核心概念，再用一个问题检查你的理解，最后小结要点并指出下一步。`
      ),
      thinking: ["规划学习步骤", "准备检索资料依据"],
      triggers: rag.results.length > 0 ? ["resource"] : undefined,
    };
    setMessages((prev) => [...prev, intro]);

    const steps: { label: string; query: string; thinking: string[] }[] = [
      {
        label: "讲解核心",
        thinking: ["拆解核心概念", "结合资料组织讲解"],
        query: `请讲解「${topic}」最核心的概念与直觉，先给结论再给依据，控制在关键要点内。`,
      },
      {
        label: "检查理解",
        thinking: ["设计一个检查理解的问题"],
        query: `针对「${topic}」，提出一个能检验我是否真正理解的问题，并给出回答这个问题的思路提示，但不要直接给出完整答案。`,
      },
      {
        label: "小结与下一步",
        thinking: ["归纳要点", "给出下一步建议"],
        query: `请用 3-5 条要点小结「${topic}」，并明确建议我下一步应该练习或深入哪个方向。`,
      },
    ];

    try {
      for (const step of steps) {
        await streamOneAgentStep(step, rag, providerConfig);
        await wait(350);
      }
    } finally {
      setIsGeneratingAnswer(false);
    }
  }

  function generatePracticeFromLatestRag() {
    if (!latestRag || latestRag.results.length === 0) {
      setPracticeSet(null);
      setPracticeHint("请先提一个问题，或先选择资料，让系统先完成一次命中检索。");
      setActivePanel("resource");
      return;
    }

    const learnerLevel = inferLearnerLevel(data.studyRecord.events);
    const nextPracticeSet = createPracticeSetFromRagResult(latestRag, learnerLevel.difficulty);
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
    setPracticeHint(
      `已按「${learnerLevel.difficulty}」难度生成 ${nextPracticeSet.questions.length} 道题（${learnerLevel.reason}）番茄钟已开始为本组练习计时。`
    );
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
    runLearningAgent,
    canRunAgent: hasBoundStudyContext || messages.some((message) => message.role === "user"),
    handleUnderstood,
    saveMessageToNote,
    generatePracticeFromLatestRag,
    completeCurrentPracticeSet,
    handleNoteDraftChange,
    selectResource,
    selectNode,
  };
}
