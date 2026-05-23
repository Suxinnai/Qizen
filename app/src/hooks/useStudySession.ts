import { useEffect, useRef, useState } from "react";
import {
  appendStudySessionEvent,
  getStudyInteractionCount,
  loadAppData,
  modeLabel,
  toggleTask,
  updateNote,
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
import type { ChatMessage, PanelKey, StudyLocationState } from "../lib/study/types";

export function useStudySession(routeContext: StudyLocationState | null, routeContextKey: string) {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const goal = getStudyTree(data);
  const tasks = flattenTasks(data);
  const initialStyle = data.settings.preferredStyle;

  const [teachingStyle] = useState<TeachingStyle>(initialStyle);
  const [isFreeConversation, setIsFreeConversation] = useState(() => !routeContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    goal?.milestones?.[0]?.tasks?.[0]?.id ?? tasks[0]?.id ?? ""
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

    setConversationContext(nextContext);
    setIsFreeConversation(freeMode);
    setMessages(buildInitialMessages(teachingStyle, nextResource?.title, nextNode?.label, true));
    setLatestRag(null);
    setPracticeSet(null);
    setPracticeHint("");
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

    if (!routeContext) {
      activeConversationIdRef.current = null;
      setActiveStudyConversationId(null);
    }
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
    if (conversationContext?.taskId && !selectedTask?.done) {
      const nextData = toggleTask(targetTaskId);
      setData(nextData);
    }
    const taskTitle = selectedTask?.title ?? learningGoal;
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

  async function sendMessage() {
    const text = input.trim();
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
    setInput("");
    setIsGeneratingAnswer(true);

    const isLocalIntent = isNonLearningChat(text);
    const isPlanRequest = isStudyPlanRequest(text);
    const shouldUseModelForAnswer = !isLocalIntent && !isPlanRequest;
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

    const fallbackContent = isPlanRequest
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
      content: assistantContent,
      triggers: triggerHints.length ? Array.from(new Set(triggerHints)) : undefined,
      rag: hasHits ? rag : undefined,
      providerLabel: llmResult.providerLabel,
      usedFallback: llmResult.usedFallback,
      errorSummary: llmResult.errorSummary,
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
      llm: { usedRealModel: !llmResult.usedFallback, providerLabel: llmResult.providerLabel, usedFallback: llmResult.usedFallback },
    });
    const nextMessages = [...messages, userMessage, assistantMessage];

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
    setMessages((prev) => [...prev, assistantMessage]);
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
    setPracticeHint("");
    setActivePanel("resource");
  }

  function completeCurrentPracticeSet() {
    if (!practiceSet) return;
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
    handleUnderstood,
    generatePracticeFromLatestRag,
    completeCurrentPracticeSet,
    handleNoteDraftChange,
  };
}
