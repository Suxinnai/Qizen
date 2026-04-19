import { useEffect, useMemo, useRef, useState } from "react";
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
  loadAppData,
  modeLabel,
  updateNote,
  updateSettings,
  type TeachingStyle,
  type GoalTask,
  type AppData,
} from "../lib/storage";

type MessageRole = "assistant" | "user";
type PanelKey = "pomodoro" | "resource" | "note" | "graph";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  triggers?: PanelKey[];
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

function buildInitialMessages(style: TeachingStyle): ChatMessage[] {
  return [
    { id: "m1", role: "assistant", content: "先问你一下，你之前学过函数连续性吗？" },
    { id: "m2", role: "user", content: "学过一点，但总觉得概念和题目之间没连起来。" },
    {
      id: "m3",
      role: "assistant",
      content: STYLE_RESPONSES[style] + "\n\n如果你愿意，我接下来可以用「整体变化率 vs 瞬时变化率」这个角度，把公式和直觉再对一下。",
      triggers: ["graph"],
    },
  ];
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
  const data = useMemo(() => loadAppData(), []);
  const goal = getStudyTree(data);
  const tasks = flattenTasks(data);
  const initialStyle = data.settings.preferredStyle;

  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>(initialStyle);
  const [messages, setMessages] = useState<ChatMessage[]>(() => buildInitialMessages(initialStyle));
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    goal?.milestones?.[0]?.tasks?.[0]?.id ?? tasks[0]?.id ?? ""
  );
  const [pomodoroSeconds, setPomodoroSeconds] = useState(data.settings.pomodoroMinutes * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [noteDraft, setNoteDraft] = useState(() => data.notes[0]?.content ?? "");
  const [input, setInput] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [autoTriggered, setAutoTriggered] = useState<Set<string>>(new Set());
  const planRef = useRef<HTMLDivElement>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const profileText = data.learningProfile
    ? modeLabel(data.learningProfile.dominantMode) + "型偏好"
    : "尚未建立学习画像";
  const activeMilestone = goal?.milestones.find((milestone) =>
    milestone.tasks.some((task) => task.id === selectedTaskId)
  );
  const learningGoal = activeMilestone?.title.includes("微分中值定理")
    ? "理解拉格朗日中值定理及其几何意义"
    : activeMilestone
    ? "理解" + activeMilestone.title.replace(/^第\s*\d+\s*章\s*/, "")
    : "完成" + (selectedTask?.title ?? "当前任务");
  const completedToday = tasks.filter((task) => task.done).length;
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

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const triggerHints: PanelKey[] = [];
    if (text.includes("资源") || text.includes("视频") || text.includes("推荐")) triggerHints.push("resource");
    if (text.includes("笔记") || text.includes("整理")) triggerHints.push("note");
    if (text.includes("练习") || text.includes("做题") || text.includes("专注")) triggerHints.push("pomodoro");
    setMessages((prev) => [
      ...prev,
      { id: "u-" + Date.now(), role: "user", content: text },
      {
        id: "a-" + (Date.now() + 1),
        role: "assistant",
        content:
          "收到。我注意到你提到「" + text.slice(0, 18) + (text.length > 18 ? "..." : "") + "」。\n\n基于你当前的" + profileText + "，我会继续用" + STYLE_LABELS[teachingStyle] + "方式解释，并把它和当前任务直接连起来。",
        triggers: triggerHints.length ? triggerHints : undefined,
      },
    ]);
    setInput("");
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
      <header className="px-8 pt-5 pb-4 flex items-center gap-3 relative z-20">
        <div ref={planRef} className="relative">
          <button
            type="button"
            onClick={() => setPlanOpen((v) => !v)}
            className={clsx(
              "h-9 pl-3 pr-2.5 rounded-full flex items-center gap-2 text-[12px] transition-colors border",
              planOpen
                ? "bg-qz-primary/10 border-qz-primary/30 text-qz-primary"
                : "bg-white/70 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-qz-text-strong dark:text-qz-text-dark hover:border-qz-primary/30"
            )}
          >
            <Leaf size={13} stroke="currentColor" />
            <span className="font-medium max-w-[180px] truncate">{selectedTask?.title ?? "选择任务"}</span>
            <ChevronDown size={13} className={clsx("transition-transform", planOpen && "rotate-180")} />
          </button>

          {planOpen ? (
            <div
              className="absolute top-[42px] left-0 w-[320px] rounded-[16px] bg-white dark:bg-qz-card-dark border border-black/[0.06] dark:border-white/[0.08] py-3 z-30"
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

        <div className="text-[12px] text-qz-text-muted truncate max-w-[440px]">
          今天目标 · {learningGoal}
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setPomodoroRunning((v) => !v)}
          title={pomodoroRunning ? "点击暂停" : "点击开始"}
          className={clsx(
            "flex items-center gap-2 h-9 pl-2 pr-3 rounded-full border transition-colors",
            pomodoroRunning
              ? "bg-qz-primary/10 border-qz-primary/30 text-qz-primary"
              : "bg-white/70 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-qz-text-muted hover:border-qz-primary/30"
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
          className="h-9 rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.04] px-3 text-[12px] outline-none hover:border-qz-primary/30 transition-colors"
        >
          {Object.entries(STYLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              教学风格 · {label}
            </option>
          ))}
        </select>

        <div className="w-px h-6 bg-black/[0.08] dark:bg-white/[0.1] mx-1" />

        <div className="flex items-center gap-1">
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
                  "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                  active
                    ? "bg-qz-primary text-white"
                    : "text-qz-text-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                )}
              >
                <Icon size={14} />
              </button>
            );
          })}
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
                  placeholder="把疑问丢给灵 · Enter 发送"
                  className="flex-1 resize-none bg-transparent outline-none text-[13.5px] leading-[1.6] py-2 max-h-[140px]"
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
                      { label: "罗尔定理", state: "done" as const, hint: "前置 · 已掌握" },
                      { label: "中值定理", state: "active" as const, hint: "正在学习" },
                      { label: "柯西中值定理", state: "next" as const, hint: "下一站" },
                      { label: "导数应用", state: "later" as const, hint: "后续延伸" },
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
