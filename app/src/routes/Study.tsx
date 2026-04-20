import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronDown,
  Circle,
  CheckCircle2,
  Paperclip,
  Mic,
  SendHorizonal,
  NotebookPen,
  RotateCcw,
  Timer,
  BookMarked,
  Network,
  X,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { Leaf } from "../components/icons/Leaf";
import {
  appendStudySessionEvent,
  getStudyInteractionCount,
  loadAppData,
  modeLabel,
  updateNote,
  updateSettings,
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
import { generateStudyAnswer } from "../lib/llm";
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
  source?: "library" | "graph";
  resourceId?: string;
  nodeId?: string;
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
  resource: { label: "灵找到的", icon: BookMarked, hint: "灵翻到了几条不错的资源" },
  note: { label: "AI 整理的笔记", icon: NotebookPen, hint: "灵帮你把这一段整理好了" },
  graph: { label: "你在哪里", icon: Network, hint: "你正在知识图谱的这个位置" },
};

function getStudyTree(data: AppData) {
  return data.goals.find((goal) => goal.id === "goal-math") ?? data.goals[0];
}

function flattenTasks(data: AppData): GoalTask[] {
  return data.goals.flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks));
}

function buildInitialMessages(style: TeachingStyle, resourceTitle?: string, nodeLabel?: string): ChatMessage[] {
  if (resourceTitle) {
    return [
      {
        id: "m1",
        role: "assistant",
        content:
          `我已经把《${resourceTitle}》带进来了。` +
          (nodeLabel ? `它现在主要挂在「${nodeLabel}」这个知识点上。` : "") +
          `\n\n接下来我会优先用资料库里的内容来回答你，尽量把解释建立在你自己的资料上。`,
        triggers: ["graph", "resource"],
      },
      {
        id: "m2",
        role: "assistant",
        content:
          `当前讲解风格是${STYLE_LABELS[style]}。你现在可以直接追问概念、条件、例子、证明思路，我会先检索你带进来的资料，再补充解释。`,
        triggers: ["resource"],
      },
    ];
  }

  return [
    { id: "m1", role: "assistant", content: "你可以直接提问，我会先在资料库里找依据，再根据命中的内容来解释。" },
    {
      id: "m2",
      role: "assistant",
      content: `当前默认按${STYLE_LABELS[style]}来讲。如果资料里证据不够，我也会明确告诉你不确定。`,
      triggers: ["resource", "graph"],
    },
  ];
}

function scoreLabel(score: number) {
  if (score >= 20) return "高相关";
  if (score >= 10) return "中相关";
  return "弱相关";
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
    return (
      <div className="mt-4 rounded-[18px] border border-[#E8A93C]/30 bg-[#E8A93C]/8 px-4 py-4 text-[12px] text-qz-text-muted leading-6">
        <div className="font-medium text-[#B47F1C] mb-1">还没有可用的命中资料</div>
        <div>请先提一个问题，或者先从资料库带着资料进入 Study。只有检索到了明确资料，才能基于命中内容出题。</div>
      </div>
    );
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
  profileText: string;
  selectedResourceTitle?: string;
  selectedNodeLabel?: string;
  rag: LibraryRagResult;
}) {
  const { query, style, profileText, selectedResourceTitle, selectedNodeLabel, rag } = params;
  const top = rag.results[0];
  const contextLead = selectedResourceTitle
    ? `我先按你当前带入的《${selectedResourceTitle}》来回答`
    : "我先按资料库里最相关的内容来回答";

  if (!top) {
    return [
      `${contextLead}。不过这次没有检索到足够相关的本地资料。`,
      `资料库没有明确依据，以下解释可能不够准确。基于你当前的${profileText}，我先用${STYLE_LABELS[style]}方式给你一个尽量稳妥的说明：${STYLE_RESPONSES[style]}`,
      `如果你愿意，可以继续补充问题里的关键词${selectedNodeLabel ? `，或者围绕「${selectedNodeLabel}」再问得更具体一些` : ""}，我会重新检索。`,
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
  if (rag.results.length === 0) {
    return (
      <div className="mt-4 rounded-[18px] border border-[#E8A93C]/30 bg-[#E8A93C]/8 px-4 py-4 text-[12px] text-qz-text-muted leading-6">
        <div className="font-medium text-[#B47F1C] mb-1">本次未检索到明确资料依据</div>
        <div>资料库没有明确依据，以下解释可能不够准确。建议换一个更具体的问题，或者先从 Library / Graph 带着资料进入学习空间。</div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[18px] border border-qz-primary/15 bg-qz-primary/6 px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[12px] text-qz-primary font-medium">RAG 证据</div>
          <div className="text-[11px] text-qz-text-muted mt-0.5">
            {rag.sufficient ? "以下内容是本次回答优先参考的本地资料" : "已找到部分资料，但依据强度一般，请结合原文判断"}
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/80 dark:bg-black/15 text-qz-text-muted">
          Top {rag.results.length}
        </span>
      </div>

      <div className="space-y-3">
        {rag.results.map((match) => (
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

function MessageBody({ content }: { content: string }) {
  const paragraphs = content.split("\n\n").filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 8)}`} className="leading-[1.85]">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function collectHitResourceTitles(rag: LibraryRagResult | null) {
  return rag?.results.map((match) => match.resource.title) ?? [];
}

function StrategyBar({ onSwitchStyle }: { onSwitchStyle: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
      <button
        type="button"
        onClick={onSwitchStyle}
        className="px-3 py-1.5 rounded-full bg-qz-primary/10 text-qz-primary hover:bg-qz-primary/15 transition-colors"
      >
        换种讲法
      </button>
      <button type="button" className="px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors">
        更深入
      </button>
      <button type="button" className="px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors">
        我懂了
      </button>
      <button type="button" className="px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors">
        给我一个例子
      </button>
    </div>
  );
}

export default function Study() {
  const location = useLocation();
  const data = useMemo(() => loadAppData(), []);
  const goal = getStudyTree(data);
  const tasks = flattenTasks(data);
  const initialStyle = data.settings.preferredStyle;
  const locationState = (location.state ?? null) as StudyLocationState | null;
  const selectedResource = locationState?.resourceId
    ? data.libraryItems.find((item) => item.id === locationState.resourceId)
    : undefined;
  const selectedNode = locationState?.nodeId
    ? data.knowledgeGraph.nodes.find((node) => node.id === locationState.nodeId)
    : selectedResource?.linkedNodeIds?.[0]
    ? data.knowledgeGraph.nodes.find((node) => node.id === selectedResource.linkedNodeIds[0])
    : undefined;

  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>(initialStyle);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    buildInitialMessages(initialStyle, selectedResource?.title, selectedNode?.label)
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    goal?.milestones?.[0]?.tasks?.[0]?.id ?? tasks[0]?.id ?? ""
  );
  const [pomodoroSeconds, setPomodoroSeconds] = useState(data.settings.pomodoroMinutes * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [noteDraft, setNoteDraft] = useState(() => data.notes[0]?.content ?? "");
  const [input, setInput] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(selectedResource ? "resource" : null);
  const [autoTriggered, setAutoTriggered] = useState<Set<string>>(new Set());
  const [latestRag, setLatestRag] = useState<LibraryRagResult | null>(null);
  const [practiceSet, setPracticeSet] = useState<RagPracticeSet | null>(null);
  const [practiceHint, setPracticeHint] = useState<string>("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [studyInteractionCount, setStudyInteractionCount] = useState(getStudyInteractionCount(data));
  const planRef = useRef<HTMLDivElement>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const profileText = data.learningProfile
    ? modeLabel(data.learningProfile.dominantMode) + "型偏好"
    : "尚未建立学习画像";
  const activeMilestone = goal?.milestones.find((milestone) =>
    milestone.tasks.some((task) => task.id === selectedTaskId)
  );
  const learningGoal = selectedResource
    ? `围绕《${selectedResource.title}》继续学习${selectedNode ? ` · ${selectedNode.label}` : ""}`
    : activeMilestone?.title.includes("微分中值定理")
    ? "理解拉格朗日中值定理及其几何意义"
    : activeMilestone
    ? "理解" + activeMilestone.title.replace(/^第\s*\d+\s*章\s*/, "")
    : "完成" + (selectedTask?.title ?? "当前任务");
  const completedToday = tasks.filter((task) => task.done).length;
  const headerGoalLabel = selectedResource ? "当前学习主线" : "今天目标";
  const totalSeconds = data.settings.pomodoroMinutes * 60;
  const pomodoroProgress =
    totalSeconds > 0 ? Math.max(0, Math.min(1, 1 - pomodoroSeconds / totalSeconds)) : 0;
  const dashLength = 50.27;
  const dashOffset = dashLength * (1 - pomodoroProgress);

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
    if (!planOpen) return;
    function onClick(e: MouseEvent) {
      if (planRef.current && !planRef.current.contains(e.target as Node)) {
        setPlanOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [planOpen]);

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

  function switchStyle() {
    const order: TeachingStyle[] = ["analogy", "logic", "story", "steps"];
    const currentIndex = order.indexOf(teachingStyle);
    const nextStyle = order[(currentIndex + 1) % order.length];
    setTeachingStyle(nextStyle);
    updateSettings({ preferredStyle: nextStyle });
    setMessages((prev) => [
      ...prev,
      {
        id: "m-" + Date.now(),
        role: "assistant",
        content: "好，我换成" + STYLE_LABELS[nextStyle] + "来讲。\n\n" + STYLE_RESPONSES[nextStyle],
      },
    ]);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isGeneratingAnswer) return;

    const triggerHints: PanelKey[] = ["resource"];
    if (text.includes("笔记") || text.includes("整理")) triggerHints.push("note");
    if (text.includes("练习") || text.includes("做题") || text.includes("专注")) triggerHints.push("pomodoro");
    if (text.includes("节点") || text.includes("图谱") || text.includes("前置")) triggerHints.push("graph");

    const rag = retrieveRelevantLibraryContext(data, text, {
      resourceId: selectedResource?.id,
      nodeId: selectedNode?.id,
      topK: 3,
    });

    const userMessage: ChatMessage = { id: "u-" + Date.now(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLatestRag(rag);
    setPracticeSet(null);
    setPracticeHint("");
    setInput("");
    setIsGeneratingAnswer(true);

    const llmResult = await generateStudyAnswer({
      query: text,
      rag,
      style: teachingStyle,
      profileText,
      selectedResourceTitle: selectedResource?.title,
      selectedNodeLabel: selectedNode?.label,
      providerConfig: data.settings.llm,
    });

    const fallbackContent = buildAssistantReply({
      query: text,
      style: teachingStyle,
      profileText,
      selectedResourceTitle: selectedResource?.title,
      selectedNodeLabel: selectedNode?.label,
      rag,
    });

    const assistantContent = llmResult.usedFallback
      ? `${fallbackContent}\n\n${llmResult.errorSummary ? `（已回退到本地回答：${llmResult.errorSummary}）` : "（当前未使用真实模型，已回退到本地回答。）"}`
      : llmResult.answer;

    const assistantMessage: ChatMessage = {
      id: "a-" + (Date.now() + 1),
      role: "assistant",
      content: assistantContent,
      triggers: triggerHints.length ? Array.from(new Set(triggerHints)) : undefined,
      rag,
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
    setStudyInteractionCount((prev) => prev + 1);
    setMessages((prev) => [...prev, assistantMessage]);
    setIsGeneratingAnswer(false);
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
      setPracticeHint("当前命中资料还不足以生成题目，请换一个更具体的问题再试。\n\n资料库没有明确依据，以下解释可能不够准确。");
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

  function selectTask(id: string) {
    setSelectedTaskId(id);
    setPlanOpen(false);
  }

  return (
    <div className="h-full overflow-hidden bg-qz-bg dark:bg-qz-bg-dark flex flex-col relative">
      <header className="px-8 pt-5 pb-4 relative z-20">
        <div className="flex items-center gap-4 rounded-[26px] border border-black/[0.05] dark:border-white/[0.08] bg-white/78 dark:bg-white/[0.03] px-5 py-3 shadow-[0_18px_40px_-28px_rgba(45,122,107,0.28)]">
          <div className="min-w-0 flex flex-1 items-center gap-4">
            <div ref={planRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setPlanOpen((v) => !v)}
                className={clsx(
                  "h-10 pl-3.5 pr-3 rounded-full flex items-center gap-2 text-[12.5px] font-medium transition-all border shadow-sm",
                  planOpen
                    ? "bg-qz-primary/10 border-qz-primary/25 text-qz-primary"
                    : "bg-white/88 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-qz-text-strong dark:text-qz-text-dark hover:border-qz-primary/25"
                )}
              >
                <Leaf size={13} stroke="currentColor" />
                <span className="max-w-[180px] truncate">{selectedTask?.title ?? "选择任务"}</span>
                <ChevronDown size={13} className={clsx("transition-transform", planOpen && "rotate-180")} />
              </button>

              {planOpen ? (
                <div
                  className="absolute top-[48px] left-0 w-[320px] rounded-[16px] bg-white dark:bg-qz-card-dark border border-black/[0.06] dark:border-white/[0.08] py-3 z-30"
                  style={{ boxShadow: "0 12px 40px -12px rgba(45,122,107,0.25), 0 4px 16px -4px rgba(0,0,0,0.06)" }}
                >
                  <div className="px-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                    <div>
                      <div className="font-serif text-[15px] text-qz-text-strong dark:text-qz-text-dark">学习计划</div>
                      <div className="text-[11px] text-qz-text-muted mt-0.5">挑一个，灵今天就教这个</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-qz-text-muted">
                      <Sparkles size={11} className="text-qz-light" />
                      <span>{profileText}</span>
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto px-2 pt-2">
                    {goal ? (
                      <div className="px-2 pb-2">
                        <div className="flex items-center gap-2 text-[12px] text-qz-text-muted px-2 py-1.5">
                          <span className="font-medium text-qz-text-strong dark:text-qz-text-dark">{goal.title}</span>
                          <span>·</span>
                          <span>今日 {completedToday}/{tasks.length}</span>
                        </div>
                        {goal.milestones.map((milestone) => (
                          <div key={milestone.id} className="mt-2">
                            <div className="text-[11px] text-qz-text-muted px-2 mb-1">{milestone.title}</div>
                            <div className="space-y-0.5">
                              {milestone.tasks.map((task) => {
                                const active = task.id === selectedTaskId;
                                return (
                                  <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => selectTask(task.id)}
                                    className={clsx(
                                      "w-full text-left rounded-[10px] px-2.5 py-2 transition-colors flex items-start gap-2",
                                      active
                                        ? "bg-qz-primary/10 text-qz-primary"
                                        : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-qz-text-strong dark:text-qz-text-dark"
                                    )}
                                  >
                                    {task.done ? (
                                      <CheckCircle2 size={13} className="text-qz-primary mt-[3px] shrink-0" />
                                    ) : (
                                      <Circle size={13} className="text-qz-text-muted mt-[3px] shrink-0" />
                                    )}
                                    <span className="text-[12.5px] leading-[1.55]">{task.title}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden lg:block h-9 w-px bg-black/[0.06] dark:bg-white/[0.08]" />

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-qz-text-muted mb-1">{headerGoalLabel}</div>
              <div className="truncate pr-2 text-[13px] text-qz-text-strong dark:text-qz-text-dark">
                {learningGoal}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-white/88 dark:bg-white/[0.04] px-3 py-2 text-[11px] text-qz-text-muted shadow-sm">
              <span>学习交互</span>
              <span className="text-qz-text-strong dark:text-qz-text-dark font-medium">{studyInteractionCount}</span>
            </div>
            <button
              type="button"
              onClick={() => setPomodoroRunning((v) => !v)}
              title={pomodoroRunning ? "点击暂停" : "点击开始"}
              className={clsx(
                "flex items-center gap-2 h-10 pl-3 pr-3.5 rounded-full border shadow-sm transition-all bg-white/88 dark:bg-white/[0.04]",
                pomodoroRunning
                  ? "border-qz-primary/25 bg-qz-primary/6 text-qz-primary"
                  : "border-black/[0.06] dark:border-white/[0.08] text-qz-text-muted hover:border-qz-primary/25"
              )}
            >
              <span className="relative w-5 h-5 shrink-0">
                <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={dashLength}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-500"
                  />
                </svg>
              </span>
              <span className="font-mono text-[12px] tabular-nums">{formatTime(pomodoroSeconds)}</span>
            </button>

            <select
              value={teachingStyle}
              onChange={(e) => {
                const next = e.target.value as TeachingStyle;
                setTeachingStyle(next);
                updateSettings({ preferredStyle: next });
              }}
              className="h-10 min-w-[168px] rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-white/88 dark:bg-white/[0.04] px-4 text-[12.5px] font-medium outline-none hover:border-qz-primary/25 transition-colors shadow-sm"
            >
              {Object.entries(STYLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  教学风格 · {label}
                </option>
              ))}
            </select>

            <div className="h-7 w-px bg-black/[0.06] dark:bg-white/[0.08]" />

            <div className="flex items-center gap-1 rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-white/88 dark:bg-white/[0.04] p-1 shadow-sm">
              {(Object.keys(PANEL_META) as PanelKey[]).map((key) => {
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
                      "w-9 h-9 rounded-full border border-transparent flex items-center justify-center transition-all",
                      active
                        ? "bg-qz-primary/10 text-qz-primary border-qz-primary/15 shadow-sm"
                        : "text-qz-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex relative">
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-10">
            <div className="max-w-[760px] mx-auto py-8 space-y-7">
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1;
                if (message.role === "assistant") {
                  return (
                    <div key={message.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-qz-primary text-[11px] font-serif bg-qz-primary/10 mt-0.5">
                        灵
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] text-qz-text-strong dark:text-qz-text-dark">
                          <MessageBody content={message.content} />
                        </div>
                        {message.rag ? <RagEvidenceCard rag={message.rag} /> : null}
                        {isLast && message.rag ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={generatePracticeFromLatestRag}
                              className="px-3 py-1.5 rounded-full bg-qz-primary text-white text-[12px] hover:bg-qz-dark transition-colors"
                            >
                              基于当前命中资料出题
                            </button>
                          </div>
                        ) : null}
                        {isLast ? <StrategyBar onSwitchStyle={switchStyle} /> : null}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[78%] rounded-[18px] rounded-br-[6px] px-4 py-2.5 text-[14px] leading-[1.75] text-qz-text-strong dark:text-qz-text-dark bg-qz-primary/8 border border-qz-primary/15">
                      {message.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-10 pb-6 pt-2">
            <div className="max-w-[760px] mx-auto">
              <div
                className="flex items-end gap-2 rounded-[24px] bg-white dark:bg-qz-card-dark px-3 py-2.5 border border-black/[0.05] dark:border-white/[0.08]"
                style={{ boxShadow: "0 4px 24px -8px rgba(45,122,107,0.18), 0 2px 8px -2px rgba(0,0,0,0.04)" }}
              >
                <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-qz-text-muted shrink-0">
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
                  placeholder={isGeneratingAnswer ? "灵正在翻资料和调用模型…" : "把疑问丢给灵 · Enter 发送"}
                  disabled={isGeneratingAnswer}
                  className="flex-1 resize-none bg-transparent outline-none text-[13.5px] leading-[1.6] py-2 max-h-[140px] disabled:opacity-60"
                />
                <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-qz-text-muted shrink-0">
                  <Mic size={15} />
                </button>
                <button
                  type="button"
                  onClick={sendMessage}
                  className={clsx(
                    "w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 transition-all",
                    input.trim() ? "bg-qz-primary hover:bg-qz-dark" : "bg-qz-primary/40"
                  )}
                >
                  <SendHorizonal size={14} />
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside
          className={clsx(
            "border-l border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] overflow-hidden transition-all duration-300",
            activePanel ? "w-[320px]" : "w-0"
          )}
        >
          {activePanel ? (
            <div className="w-[320px] h-full flex flex-col">
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
                          {latestRag.results.length > 0 ? (
                            latestRag.results.map((match) => (
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
                            ))
                          ) : (
                            <div className="rounded-[14px] border border-[#E8A93C]/25 bg-[#E8A93C]/8 px-3.5 py-3 text-[11px] text-qz-text-muted leading-6">
                              这次没有检索到足够明确的资料命中，建议把问题问得更具体一些。
                            </div>
                          )}
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
      </div>
    </div>
  );
}
