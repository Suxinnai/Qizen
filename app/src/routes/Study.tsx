import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Paperclip,
  Mic,
  SendHorizonal,
  NotebookPen,
  RotateCcw,
  Timer,
  BookMarked,
  Network,
  X,
} from "lucide-react";
import clsx from "clsx";
import {
  appendStudySessionEvent,
  getStudyInteractionCount,
  loadAppData,
  modeLabel,
  toggleTask,
  updateNote,
  type TeachingStyle,
  type GoalTask,
  type AppData,
} from "../lib/storage";
import {
  createPracticeSetFromRagResult,
  retrieveRelevantLibraryContext,
  type LibraryRagMatch,
  type LibraryRagResult,
  type RagPracticeSet,
} from "../lib/rag";
import { MessageBody } from "../components/study/MessageBody";
import { StrategyBar } from "../components/study/StrategyBar";
import { StudyEmptyState } from "../components/study/StudyEmptyState";
import { isNonLearningChat, shouldSearchKnowledgeBase } from "../lib/study/intent";
import {
  collectHitResourceTitles,
  createEmptyRag,
  getStrongRag,
  scoreLabel,
  shouldDisplayRagEvidence,
} from "../lib/study/rag-policy";
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
import type { PracticeQuestionEvidence } from "../lib/storage";

type MessageRole = "assistant" | "user";
type PanelKey = "pomodoro" | "resource" | "note" | "graph";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  triggers?: PanelKey[];
  rag?: LibraryRagResult;
  providerLabel?: string;
  usedFallback?: boolean;
  errorSummary?: string;
}

interface StudyLocationState {
  source?: "library" | "graph" | "goal" | "note";
  resourceId?: string;
  nodeId?: string;
  taskId?: string;
  noteId?: string;
}

const STYLE_LABELS: Record<TeachingStyle, string> = {
  story: "故事化",
  logic: "逻辑推导",
  analogy: "类比讲解",
  steps: "步骤拆解",
};

const STYLE_RESPONSES: Record<TeachingStyle, string> = {
  story:
    "把它想成一条从山脚开到山顶的路。你从起点到终点有一个整体平均速度，而拉格朗日中值定理告诉你：在这段旅程里，一定有某一刻，你车上的时速表恰好等于整个旅程的平均速度。",
  logic:
    "逻辑上，它的核心是：函数在闭区间连续、开区间可导。因为先满足连续，所以图像不断裂；再满足可导，所以每个内部点都有切线。由罗尔定理推广，就能推出某一点的导数等于割线斜率。",
  analogy:
    "你可以把它理解成开车。全程 120 公里，花了 2 小时，平均时速就是 60。只要你是平稳连续地开，并且中间没有瞬移，那么一定存在一个瞬间，你的瞬时速度刚好就是 60。",
  steps:
    "记它分 3 步：① 先检查闭区间连续；② 再检查开区间可导；③ 套公式：f'(c) = [f(b)-f(a)] / (b-a)。如果前两步不成立，第三步就不能直接用。",
};

const RESOURCES = [
  { id: "res-1", title: "3Blue1Brown：导数与变化率直觉", type: "视频", duration: "12 分钟" },
  { id: "res-2", title: "MIT 单变量微积分课程节选", type: "课程", duration: "20 分钟" },
  { id: "res-3", title: "用开车理解中值定理的小论文", type: "文章", duration: "5 分钟" },
];

const PANEL_META: Record<PanelKey, { label: string; icon: typeof Timer; hint: string }> = {
  pomodoro: { label: "专注计时", icon: Timer, hint: "灵建议你先专注一段" },
  resource: { label: "资料与依据", icon: BookMarked, hint: "当前资料、命中依据和补充资源会显示在这里" },
  note: { label: "AI 整理的笔记", icon: NotebookPen, hint: "灵帮你把这一段整理好了" },
  graph: { label: "你在哪里", icon: Network, hint: "你正在知识图谱的这个位置" },
};

const FLOATING_PANEL_KEYS: PanelKey[] = ["pomodoro", "resource", "note", "graph"];

function getStudyTree(data: AppData) {
  return data.goals.find((goal) => goal.id === "goal-math") ?? data.goals[0];
}

function flattenTasks(data: AppData): GoalTask[] {
  return data.goals.flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks));
}

function buildInitialMessages(
  style: TeachingStyle,
  resourceTitle?: string,
  nodeLabel?: string,
  isFreeConversation = false
): ChatMessage[] {
  if (isFreeConversation) {
    return [];
  }

  if (resourceTitle) {
    return [
      {
        id: "m1",
        role: "assistant",
        content:
          `我已经把《${resourceTitle}》带进来了。` +
          (nodeLabel ? `它现在主要挂在「${nodeLabel}」这个知识点上。` : "") +
          `\n\n接下来我会优先用资料库里的内容来回答你；如果资料没命中，我也会继续走大模型的通用解释，不会只卡在资料库里。`,
        triggers: ["graph", "resource"],
      },
      {
        id: "m2",
        role: "assistant",
        content:
          `当前讲解风格是${STYLE_LABELS[style]}。你现在可以直接追问概念、条件、例子、证明思路，也可以随时新开一个学习会话换题。`,
        triggers: ["resource"],
      },
    ];
  }

  return [];
}

function buildEvidenceLine(match: LibraryRagMatch) {
  const parts = [
    `命中资料：《${match.resource.title}》`,
    match.reasons.length > 0 ? `依据：${match.reasons.join("、")}` : "",
    match.matchedTerms.length > 0 ? `关键词：${match.matchedTerms.slice(0, 6).join("、")}` : "",
    match.isCurrentResource ? "当前资料已加权" : "",
    match.isCurrentNodeLinked ? "当前节点已加权" : "",
  ].filter(Boolean);

  return parts.join("；");
}

function getEvidenceTone(confidence?: PracticeQuestionEvidence["confidence"]) {
  if (confidence === "strong") {
    return {
      label: "证据较强",
      chipClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      panelClass: "border-emerald-500/15 bg-emerald-500/5",
      hint: "该题可直接回看命中片段与重点。",
    };
  }
  if (confidence === "medium") {
    return {
      label: "证据一般",
      chipClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      panelClass: "border-amber-500/15 bg-amber-500/5",
      hint: "建议结合原文再确认一遍。",
    };
  }
  return {
    label: "证据较弱",
    chipClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    panelClass: "border-rose-500/15 bg-rose-500/5",
    hint: "该题的依据较弱，仅供参考。",
  };
}

function PracticeEvidencePanel({ evidence }: { evidence?: PracticeQuestionEvidence }) {
  if (!evidence) {
    return (
      <div className="mt-3 rounded-[12px] border border-rose-500/15 bg-rose-500/5 px-3 py-3 text-[11px] text-qz-text-muted leading-6">
        这道题暂时没有可展示的证据回链，建议谨慎参考。
      </div>
    );
  }

  const tone = getEvidenceTone(evidence.confidence);
  const flags = [
    evidence.isTopHit ? "来自 top hit" : "",
    evidence.isCurrentResource ? "来自当前资料" : "",
    evidence.isCurrentNodeLinked ? "来自节点关联资料" : "",
  ].filter(Boolean);

  return (
    <div className={clsx("mt-3 rounded-[12px] border px-3 py-3 text-[11px] leading-6", tone.panelClass)}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={clsx("px-2 py-1 rounded-full text-[10px]", tone.chipClass)}>{tone.label}</span>
        {flags.map((flag) => (
          <span key={flag} className="px-2 py-1 rounded-full bg-white/75 dark:bg-black/10 text-qz-text-muted text-[10px]">
            {flag}
          </span>
        ))}
      </div>
      <div className="text-qz-text-muted">
        <span className="text-qz-text-strong dark:text-qz-text-dark">来源资料：</span>
        《{evidence.sourceTitle}》
      </div>
      <div className="mt-2 text-qz-text-muted">
        <span className="text-qz-text-strong dark:text-qz-text-dark">证据片段：</span>
        {evidence.sourceSnippet || "暂无可展示片段"}
      </div>
      <div className="mt-2 text-qz-text-muted">
        <span className="text-qz-text-strong dark:text-qz-text-dark">对应重点：</span>
        {evidence.sourceHighlights.length > 0 ? evidence.sourceHighlights.join("；") : "暂无明确重点"}
      </div>
      <div className="mt-2 text-qz-text-muted">
        <span className="text-qz-text-strong dark:text-qz-text-dark">命中原因：</span>
        {evidence.reasons && evidence.reasons.length > 0 ? evidence.reasons.join("；") : evidence.sourceReason || "关键词命中"}
      </div>
      {evidence.confidence === "weak" ? (
        <div className="mt-2 text-rose-700 dark:text-rose-300">{tone.hint}</div>
      ) : (
        <div className="mt-2 text-qz-text-muted">{tone.hint}</div>
      )}
    </div>
  );
}

function PracticePanel({ practice }: { practice: RagPracticeSet | null }) {
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<string[]>([]);

  if (!practice) {
    return null;
  }

  return (
    <div className="mt-4 rounded-[18px] border border-qz-primary/15 bg-qz-primary/6 px-4 py-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[12px] text-qz-primary font-medium">基于当前命中资料出题</div>
          <div className="text-[11px] text-qz-text-muted mt-0.5">
            主要依据《{practice.primaryTitle}》
            {practice.basedOnTitles.length > 1 ? `，并参考 ${practice.basedOnTitles.slice(1).join("、")}` : ""}
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/80 dark:bg-black/15 text-qz-text-muted">
          {practice.questions.length} 题
        </span>
      </div>

      <div className="space-y-3">
        {practice.questions.map((question, index) => {
          const expanded = expandedQuestionIds.includes(question.id);
          const evidence = question.evidence;
          const tone = getEvidenceTone(evidence?.confidence);
          const sourceBadge = evidence?.isCurrentResource
            ? "来自当前资料"
            : evidence?.isCurrentNodeLinked
            ? "来自节点关联资料"
            : evidence?.isTopHit
            ? "来自 top hit"
            : "来源待确认";

          return (
            <div key={question.id} className="rounded-[14px] border border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-black/10 px-3.5 py-3">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-full bg-qz-primary/10 text-qz-primary">{question.type}</span>
                <span className="text-[11px] text-qz-text-muted">第 {index + 1} 题</span>
                <span className={clsx("text-[10px] px-2 py-1 rounded-full", tone.chipClass)}>{sourceBadge}</span>
                <span className={clsx("text-[10px] px-2 py-1 rounded-full", tone.chipClass)}>{tone.label}</span>
              </div>
              <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark leading-6">{question.prompt}</div>
              <div className="mt-2 text-[11px] text-qz-text-muted leading-6">提示：{question.answerHint}</div>
              <button
                type="button"
                onClick={() =>
                  setExpandedQuestionIds((prev) =>
                    prev.includes(question.id) ? prev.filter((id) => id !== question.id) : [...prev, question.id]
                  )
                }
                className="mt-3 text-[11px] text-qz-primary hover:text-qz-dark transition-colors"
              >
                {expanded ? "收起依据" : "查看依据"}
              </button>
              {expanded ? <PracticeEvidencePanel evidence={question.evidence} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildAssistantReply(params: {
  query: string;
  style: TeachingStyle;
  selectedResourceTitle?: string;
  selectedNodeLabel?: string;
  rag: LibraryRagResult;
}) {
  const { query, style, selectedResourceTitle, selectedNodeLabel, rag } = params;
  if (isNonLearningChat(query)) {
    return [
      "我是栖知学习空间里的 AI 学习助手，主要负责陪你拆知识点、找资料依据、整理笔记、安排练习和推进学习路径。",
      "这类问题不会触发资料库检索，所以我不会把无关资料硬塞成依据。你可以直接问我一个知识点，或者从目标、资料库、笔记里带上下文进来学。",
    ].join("\n\n");
  }
  const top = rag.results[0];
  const contextLead = selectedResourceTitle
    ? `我先按你当前带入的《${selectedResourceTitle}》来回答`
    : "我先按资料库里最相关的内容来回答";

  if (!top) {
    return [
      `${contextLead}，但这次没有检索到能直接支撑「${query}」的本地资料片段。`,
      "按学习空间的设计，没命中资料时本来应该继续走大模型的通用知识回答，而不是被资料库卡死。",
      `所以在当前这个兜底分支里，我不应该硬套固定话术来答你。${selectedNodeLabel ? `如果你其实是在继续学「${selectedNodeLabel}」，可以把问题问得更具体一点；` : ""}你也可以直接新开一个学习会话换题。`,
    ].join("\n\n");
  }

  const secondary = rag.results[1];
  const explanationParts = [
    `${contextLead}${selectedNodeLabel ? `，并优先考虑「${selectedNodeLabel}」这个节点` : ""}。`,
    buildEvidenceLine(top),
    `从命中的片段来看，${top.matchedSnippet}`,
    `结合你的问题「${query}」，更贴近资料本身的理解是：${top.matchedSummary}`,
  ];

  if (top.matchedHighlights.length > 0) {
    explanationParts.push(`这份资料当前最值得抓住的重点是：${top.matchedHighlights.join("；")}。`);
  }

  explanationParts.push(`我会继续用${STYLE_LABELS[style]}方式帮你消化：${STYLE_RESPONSES[style]}`);

  if (secondary) {
    explanationParts.push(`另外还有一份辅助资料《${secondary.resource.title}》也有相关内容，可以用来交叉确认。`);
  }

  if (!rag.sufficient) {
    explanationParts.push("不过这次检索到的依据还不算特别强，资料库没有明确依据，以下解释可能不够准确。你最好结合原文片段一起看。");
  }

  return explanationParts.join("\n\n");
}

function RagEvidenceCard({ rag }: { rag: LibraryRagResult }) {
  const displayRag = getStrongRag(rag);
  if (!shouldDisplayRagEvidence(displayRag)) {
    return null;
  }

  return (
    <div className="mt-4 rounded-[18px] border border-qz-primary/15 bg-qz-primary/6 px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[12px] text-qz-primary font-medium">RAG 证据</div>
          <div className="text-[11px] text-qz-text-muted mt-0.5">
            以下内容是本次回答优先参考的本地资料
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/80 dark:bg-black/15 text-qz-text-muted">
          Top {displayRag.results.length}
        </span>
      </div>

      <div className="space-y-3">
        {displayRag.results.map((match) => (
          <div key={match.resource.id} className="rounded-[14px] border border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-black/10 px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{match.resource.title}</div>
                <div className="text-[11px] text-qz-text-muted mt-1">{match.reasons.join(" · ") || "关键词命中"}</div>
              </div>
              <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-qz-primary/10 text-qz-primary">
                {scoreLabel(match.score)}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-[12px] text-qz-text-muted leading-6">
              <div>
                <span className="text-qz-text-strong dark:text-qz-text-dark">命中原因：</span>
                {match.reasonDetails.length > 0 ? match.reasonDetails.join("；") : "关键词命中"}
              </div>
              <div>
                <span className="text-qz-text-strong dark:text-qz-text-dark">命中片段：</span>
                {match.matchedSnippet || "暂无可展示片段"}
              </div>
              <div>
                <span className="text-qz-text-strong dark:text-qz-text-dark">命中重点：</span>
                {match.matchedHighlights.length > 0 ? match.matchedHighlights.join("；") : "暂无明确重点"}
              </div>
              <div>
                <span className="text-qz-text-strong dark:text-qz-text-dark">来自当前上下文：</span>
                {match.isCurrentResource ? "当前资料 boost" : "非当前资料"} · {match.isCurrentNodeLinked ? "当前节点 boost" : "非当前节点"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Study() {
  const location = useLocation();
  const [data, setData] = useState(() => loadAppData());
  const goal = getStudyTree(data);
  const tasks = flattenTasks(data);
  const initialStyle = data.settings.preferredStyle;
  const locationState = (location.state ?? null) as StudyLocationState | null;
  const routeContext = useMemo<StudyLocationState | null>(() => {
    if (!locationState?.resourceId && !locationState?.nodeId && !locationState?.taskId && !locationState?.noteId) return null;
    return {
      source: locationState?.source,
      resourceId: locationState?.resourceId,
      nodeId: locationState?.nodeId,
      taskId: locationState?.taskId,
      noteId: locationState?.noteId,
    };
  }, [locationState?.source, locationState?.resourceId, locationState?.nodeId, locationState?.taskId, locationState?.noteId]);
  const routeContextKey = `${location.key ?? "study"}:${routeContext?.source ?? ""}:${routeContext?.resourceId ?? ""}:${routeContext?.nodeId ?? ""}:${routeContext?.taskId ?? ""}:${routeContext?.noteId ?? ""}`;

  const [conversationContext, setConversationContext] = useState<StudyLocationState | null>(routeContext);
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

  const [teachingStyle] = useState<TeachingStyle>(initialStyle);
  const [isFreeConversation, setIsFreeConversation] = useState(false);
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
  const activeConversationIdRef = useRef(activeConversationId);
  const activeConversationHydratedRef = useRef(false);
  const skipNextConversationSyncRef = useRef(false);
  const contextSyncRef = useRef(false);
  const hydratedConversationRef = useRef(false);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const profileText = data.learningProfile
    ? modeLabel(data.learningProfile.dominantMode) + "型偏好"
    : "尚未建立学习画像";
  const activeMilestone = goal?.milestones.find((milestone) =>
    milestone.tasks.some((task) => task.id === selectedTaskId)
  );
  const baseLearningGoal = isFreeConversation
    ? "自由学习会话"
    : selectedResource
    ? selectedResource.title
    : selectedNote
    ? selectedNote.title
    : selectedTask?.title ?? "当前任务";
  const learningGoal = conversationTitle?.trim() || baseLearningGoal;
  const completedToday = tasks.filter((task) => task.done).length;
  const sessionSummaryText = isFreeConversation
    ? "你可以直接换题，不受上一轮对话限制"
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
  const pomodoroProgress =
    totalSeconds > 0 ? Math.max(0, Math.min(1, 1 - pomodoroSeconds / totalSeconds)) : 0;

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
    setActivePanel(target);
    setAutoTriggered((prev) => {
      const next = new Set(prev);
      next.add(last.id);
      return next;
    });
  }, [messages, autoTriggered]);

  function buildConversationSnapshot(override?: Partial<PersistedStudyConversation>): PersistedStudyConversation {
    const snapshotMessages = (override?.messages as ChatMessage[] | undefined) ?? messages;
    const snapshotContext = override?.context ?? conversationContext;
    const snapshotIsFreeConversation = override?.isFreeConversation ?? isFreeConversation;
    const snapshotSelectedTaskId = override?.selectedTaskId ?? selectedTaskId;
    const snapshotNoteDraft = override?.noteDraft ?? noteDraft;
    const firstUserMessage = sanitizeLlmText(snapshotMessages.find((message) => message.role === "user")?.content ?? "");
    const firstAssistantMessage = sanitizeLlmText(snapshotMessages.find((message) => message.role === "assistant")?.content ?? "");
    const title = buildStudyConversationTitle({
      manualTitle: override?.title ?? conversationTitle ?? undefined,
      selectedTaskTitle: baseLearningGoal,
      resourceTitle: selectedResource?.title,
      firstUserMessage,
      firstAssistantMessage,
      isFreeConversation: snapshotIsFreeConversation,
    });

    return {
      id: activeConversationId ?? `study-conv-${Date.now()}`,
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
    const saved = activeConversationId ? upsertStudyConversation(snapshot) : createStudyConversation(snapshot);
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
    if (!hydratedConversationRef.current && messages.every((message) => message.role === "assistant")) return;
    hydratedConversationRef.current = true;
    persistCurrentConversation();
  }, [messages, noteDraft, selectedTaskId, conversationContext, isFreeConversation]);

  function shouldGenerateAiTitle(nextMessages: ChatMessage[]) {
    if (!data.settings.autoGenerateSessionTitle) return false;
    const genericTitle = !conversationTitle || conversationTitle === baseLearningGoal || /^新的/.test(conversationTitle);
    const userMessageCount = nextMessages.filter((message) => message.role === "user").length;
    return genericTitle && userMessageCount === 1;
  }

  async function refreshConversationTitle(nextMessages: ChatMessage[]) {
    if (!shouldGenerateAiTitle(nextMessages)) return;
    const aiTitle = await generateStudyConversationTitle({
      providerConfig: data.settings.llm,
      selectedResourceTitle: selectedResource?.title,
      messages: nextMessages
        .filter((message) => message.role === "user")
        .slice(0, 2)
        .map((message) => ({ role: message.role, content: sanitizeLlmText(message.content) })),
    });
    if (!aiTitle) return;
    const cleanTitle = sanitizeLlmText(aiTitle);
    setConversationTitle(cleanTitle);
    persistCurrentConversation({ title: cleanTitle, messages: nextMessages });
  }

  function handleUnderstood() {
    if (!selectedTaskId) return;
    if (!selectedTask?.done) {
      const nextData = toggleTask(selectedTaskId);
      setData(nextData);
    }
    const taskTitle = selectedTask?.title ?? learningGoal;
    const message: ChatMessage = {
      id: `a-understood-${Date.now()}`,
      role: "assistant",
      content: `好，已把「${taskTitle}」标记为已掌握。下一步我会把你推到后续节点，别刚会一点就开始飘，主人。`,
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
    const shouldUseModelForAnswer = !isLocalIntent;
    const llmResult = shouldUseModelForAnswer
      ? await generateStudyAnswer({
          query: text,
          rag,
          style: teachingStyle,
          profileText,
          selectedResourceTitle: selectedResource?.title,
          selectedNodeLabel: selectedNode?.label,
          providerConfig: data.settings.llm,
        })
      : {
          answer: "",
          usedFallback: true,
          providerLabel: "本地回答",
          errorSummary: undefined,
        };

    const fallbackContent = buildAssistantReply({
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
      hitResourceTitles: collectHitResourceTitles(rag),
      generatedPractice: false,
      llm: {
        usedRealModel: !llmResult.usedFallback,
        providerLabel: llmResult.providerLabel,
        usedFallback: llmResult.usedFallback,
      },
    });
    const nextMessages = [...messages, userMessage, assistantMessage];

    if (data.settings.autoAppendNote && triggerHints.includes("note")) {
      const firstNote = data.notes[0];
      const noteBlock = `\n\n## ${learningGoal}\n${assistantContent}`;
      setNoteDraft((prev) => {
        const next = prev.trim() ? `${prev.trimEnd()}${noteBlock}` : noteBlock.trim();
        if (firstNote) updateNote(firstNote.id, next);
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

  function formatTime(total: number) {
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  return (
    <div className="h-full overflow-hidden bg-qz-bg dark:bg-qz-bg-dark flex flex-col relative">
      <header className="px-8 pt-3 pb-1 relative z-20">
        <div className="max-w-[1240px] mx-auto flex items-center gap-3">
          <div className="min-w-0 flex-1 hidden lg:block">
            <div className="truncate text-[14px] font-medium text-qz-text-strong dark:text-qz-text-dark">
              {learningGoal}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-qz-text-muted">
              {sessionSummaryText}
            </div>
          </div>

        </div>
      </header>

      <div className="flex-1 min-h-0 flex relative">
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 lg:px-10">
            <div className="max-w-[900px] mx-auto py-7 space-y-8">
              {messages.length === 0 ? <StudyEmptyState /> : null}
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1;
                if (message.role === "assistant") {
                  return (
                    <div key={message.id} className="flex gap-3.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-qz-primary text-[11px] font-serif bg-qz-primary/10 mt-0.5">
                        灵
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] leading-[1.9] text-qz-text-strong dark:text-qz-text-dark">
                          <MessageBody content={message.content} />
                        </div>
                        {message.rag ? <RagEvidenceCard rag={message.rag} /> : null}
                        {isLast && message.triggers?.some((trigger) => trigger === "graph" || trigger === "pomodoro") ? <StrategyBar onUnderstood={handleUnderstood} /> : null}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[72%] rounded-[16px] rounded-br-[8px] px-4 py-3 text-[14px] leading-[1.75] text-qz-text-strong dark:text-qz-text-dark bg-[#F4F7F6] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]">
                      {message.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-8 lg:px-10 pb-6 pt-2">
            <div className="max-w-[900px] mx-auto">
              <div
                className="flex items-end gap-2 rounded-[22px] bg-white/94 dark:bg-qz-card-dark px-3 py-2.5 border border-black/[0.06] dark:border-white/[0.08] min-h-[72px]"
                style={{ boxShadow: "0 10px 28px -16px rgba(45,122,107,0.14), 0 2px 6px -2px rgba(0,0,0,0.04)" }}
              >
                <button type="button" className="w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-qz-text-muted shrink-0">
                  <Paperclip size={15} />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={isGeneratingAnswer ? "灵正在整理资料与模型回答…" : "输入问题，Enter 发送"}
                  disabled={isGeneratingAnswer}
                  className="flex-1 resize-none bg-transparent outline-none text-[14px] leading-[1.7] py-2.5 max-h-[160px] disabled:opacity-60 placeholder:text-qz-text-muted/75"
                />
                <button type="button" className="w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-qz-text-muted shrink-0">
                  <Mic size={15} />
                </button>
                <button
                  type="button"
                  onClick={sendMessage}
                  className={clsx(
                    "w-10 h-10 rounded-[12px] flex items-center justify-center text-white shrink-0 transition-all",
                    input.trim() ? "bg-qz-primary hover:bg-qz-dark" : "bg-qz-primary/40"
                  )}
                >
                  <SendHorizonal size={15} />
                </button>
              </div>
            </div>
          </div>
        </main>

        <div className="shrink-0 pr-3 pb-4 pt-1 flex items-start gap-2">
          <aside
            className={clsx(
              "overflow-hidden transition-all duration-300",
              activePanel ? "w-[344px]" : "w-0"
            )}
          >
            {activePanel ? (
              <div className="w-[344px] h-full rounded-[22px] border border-black/[0.05] dark:border-white/[0.08] bg-white/72 dark:bg-white/[0.03] backdrop-blur-xl shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] flex flex-col">
                <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-qz-primary mb-1">
                      {(() => {
                        const Icon = PANEL_META[activePanel].icon;
                        return <Icon size={14} />;
                      })()}
                      <div className="font-serif text-[16px]">{PANEL_META[activePanel].label}</div>
                    </div>
                    <div className="text-[11px] text-qz-text-muted">{PANEL_META[activePanel].hint}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePanel(null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-qz-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-5">
                  {activePanel === "pomodoro" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center py-6">
                        <div className="relative w-32 h-32">
                          <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-qz-primary/10" />
                            <circle
                              cx="60"
                              cy="60"
                              r="54"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={339.29}
                              strokeDashoffset={339.29 * (1 - pomodoroProgress)}
                              className="text-qz-primary transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="font-serif text-[28px] text-qz-primary tabular-nums">{formatTime(pomodoroSeconds)}</div>
                            <div className="text-[11px] text-qz-text-muted mt-1">{pomodoroRunning ? "专注中" : "已暂停"}</div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPomodoroRunning((v) => !v)}
                          className="h-9 rounded-full bg-qz-primary text-white text-[12px] hover:bg-qz-dark"
                        >
                          {pomodoroRunning ? "暂停" : "开始"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPomodoroRunning(false);
                            setPomodoroSeconds(totalSeconds);
                          }}
                          className="h-9 rounded-full border border-black/[0.08] dark:border-white/[0.1] text-[12px] text-qz-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.05] flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw size={12} />
                          重置
                        </button>
                      </div>
                      <div className="text-[11px] text-qz-text-muted leading-[1.7] pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
                        灵建议：先专注 25 分钟解决当前知识点，结束后再继续聊。
                      </div>
                    </div>
                  ) : null}

                  {activePanel === "resource" ? (
                    <div className="space-y-4">
                      {selectedResource ? (
                        <div className="rounded-[16px] border border-qz-primary/15 bg-qz-primary/6 px-4 py-4">
                          <div className="text-[11px] text-qz-primary font-medium mb-1">当前资料</div>
                          <div className="text-[14px] text-qz-text-strong dark:text-qz-text-dark">{selectedResource.title}</div>
                          <div className="text-[11px] text-qz-text-muted mt-1 leading-6">{selectedResource.summary}</div>
                          <div className="mt-3 text-[11px] text-qz-text-muted">
                            重点：{selectedResource.highlights.length > 0 ? selectedResource.highlights.join("；") : "暂无"}
                          </div>
                        </div>
                      ) : null}

                      {latestRag ? (
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="text-[12px] text-qz-text-muted">本次检索命中</div>
                            <button
                              type="button"
                              onClick={generatePracticeFromLatestRag}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-qz-primary/10 text-qz-primary hover:bg-qz-primary/15 transition-colors"
                            >
                              基于命中出题
                            </button>
                          </div>
                                 <div className="space-y-2">
                            {latestRag.results.map((match) => (
                              <div key={match.resource.id} className="rounded-[14px] border border-black/[0.05] dark:border-white/[0.06] px-3.5 py-3 bg-white/70 dark:bg-black/10">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{match.resource.title}</div>
                                    <div className="text-[11px] text-qz-text-muted mt-1">{match.reasons.join(" · ") || "关键词命中"}</div>
                                  </div>
                                  <span className="text-[10px] px-2 py-1 rounded-full bg-qz-primary/10 text-qz-primary">
                                    {scoreLabel(match.score)}
                                  </span>
                                </div>
                                <div className="mt-2 text-[11px] text-qz-text-muted leading-6">命中原因：{match.reasonDetails.join("；") || "关键词命中"}</div>
                                <div className="mt-2 text-[11px] text-qz-text-muted leading-6 line-clamp-4">命中片段：{match.matchedSnippet || match.matchedSummary}</div>
                                <div className="mt-2 text-[11px] text-qz-text-muted leading-6 line-clamp-3">命中重点：{match.matchedHighlights.length > 0 ? match.matchedHighlights.join("；") : "暂无明确重点"}</div>
                                <div className="mt-2 text-[11px] text-qz-text-muted leading-6">
                                  上下文：{match.isCurrentResource ? "当前资料 boost" : "非当前资料"} · {match.isCurrentNodeLinked ? "当前节点 boost" : "非当前节点"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {practiceHint ? (
                        <div className="rounded-[14px] border border-[#E8A93C]/25 bg-[#E8A93C]/8 px-3.5 py-3 text-[11px] text-qz-text-muted leading-6">
                          {practiceHint}
                        </div>
                      ) : null}

                      <PracticePanel practice={practiceSet} />

                      <div>
                        <div className="text-[12px] text-qz-text-muted mb-2">推荐补充资源</div>
                        <ul className="space-y-2">
                          {RESOURCES.map((resource) => (
                            <li key={resource.id}>
                              <button
                                type="button"
                                className="w-full text-left rounded-[12px] p-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors group"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="mt-0.5 w-6 h-6 rounded-full bg-qz-primary/10 flex items-center justify-center shrink-0 text-qz-primary">
                                    <BookMarked size={12} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark leading-[1.5]">
                                      {resource.title}
                                    </div>
                                    <div className="text-[11px] text-qz-text-muted mt-1 flex items-center gap-2">
                                      <span>{resource.type}</span>
                                      <span className="opacity-50">·</span>
                                      <span>{resource.duration}</span>
                                    </div>
                                  </div>
                                </div>
                       </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  {activePanel === "note" ? (
                    <div className="space-y-3">
                      <div className="text-[11px] text-qz-text-muted">灵已经把这一段帮你记下来了，你可以直接编辑。</div>
                      <textarea
                        value={noteDraft}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNoteDraft(value);
                          const firstNote = data.notes[0];
                          if (firstNote) updateNote(firstNote.id, value);
                        }}
                        rows={18}
                        placeholder="在这里写点什么……"
                        className="w-full resize-none rounded-[14px] bg-white/65 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] px-3.5 py-3 text-[12.5px] leading-[1.7] outline-none placeholder:text-qz-text-muted/60 focus:border-qz-primary/30 transition-colors"
                      />
                    </div>
                  ) : null}

                  {activePanel === "graph" ? (
                    <div className="relative">
                      {[
                        { label: "罗尔定理", state: selectedNode?.id === "node-rolle" ? "active" as const : "done" as const, hint: selectedNode?.id === "node-rolle" ? "当前资料命中" : "前置 · 已掌握" },
                        { label: "中值定理", state: selectedNode?.id === "node-mvt" || !selectedNode ? "active" as const : "done" as const, hint: selectedNode?.id === "node-mvt" || !selectedNode ? "正在学习" : "核心节点" },
                        { label: "柯西中值定理", state: selectedNode?.id === "node-cauchy" ? "active" as const : "next" as const, hint: selectedNode?.id === "node-cauchy" ? "当前资料命中" : "下一站" },
                        { label: "导数应用", state: selectedNode?.id === "node-applications" ? "active" as const : "later" as const, hint: selectedNode?.id === "node-applications" ? "当前资料命中" : "后续延伸" },
                      ].map((node, i, arr) => {
                        const isLast = i === arr.length - 1;
                        return (
                          <div key={node.label} className="flex gap-3 relative">
                            <div className="flex flex-col items-center">
                              <div
                                className={clsx(
                                  "w-3 h-3 rounded-full shrink-0 z-10 transition-all",
                                  node.state === "done" && "bg-qz-mastered",
                                  node.state === "active" && "bg-qz-primary ring-4 ring-qz-primary/15",
                                  node.state === "next" && "bg-white border-2 border-qz-primary/40",
                                  node.state === "later" && "bg-black/10 dark:bg-white/10"
                                )}
                              />
                              {!isLast ? (
                                <div
                                  className={clsx(
                                    "w-px flex-1 my-1",
                                    node.state === "done" ? "bg-qz-mastered/40" : "bg-black/8 dark:bg-white/10"
                                  )}
                                  style={{ minHeight: 28 }}
                                />
                              ) : null}
                            </div>
                            <div className={clsx("pb-5", isLast && "pb-0")}>
                              <div
                                className={clsx(
                                  "text-[13px] leading-tight",
                                  node.state === "active"
                                    ? "text-qz-primary font-medium"
                                    : node.state === "later"
                                    ? "text-qz-text-muted"
                                    : "text-qz-text-strong dark:text-qz-text-dark"
                                )}
                              >
                                {node.label}
                              </div>
                              <div className="text-[11px] text-qz-text-muted mt-0.5">{node.hint}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </aside>

          <div className="flex flex-col items-center gap-1 rounded-[24px] border border-black/[0.05] dark:border-white/[0.08] bg-white/88 dark:bg-white/[0.04] p-1.5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            {FLOATING_PANEL_KEYS.map((key) => {
              const meta = PANEL_META[key];
              const Icon = meta.icon;
              const active = activePanel === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActivePanel(active ? null : key)}
                  title={meta.label}
                  className={clsx(
                    "w-10 h-10 rounded-[14px] border border-transparent flex items-center justify-center transition-all",
                    active
                      ? "bg-qz-primary/10 text-qz-primary border-qz-primary/15"
                      : "text-qz-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
