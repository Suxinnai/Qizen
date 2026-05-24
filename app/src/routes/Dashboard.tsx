import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CheckCircle2, Circle, Clock, Flame, MessageSquareText, Sparkles, Target } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Leaf } from "../components/icons/Leaf";
import { getTodayTasks, loadAppData, modeLabel, toggleTask, type AppData } from "../lib/storage";

function GreetingCard({ data }: { data: AppData }) {
  const profileLabel = data.learningProfile
    ? `${modeLabel(data.learningProfile.dominantMode)}型学习偏好`
    : "先完成学习画像测试，栖知会更懂你";

  // 计算连续学习天数
  const dailyMinutes = data.studyStats.dailyMinutes;
  let streak = 0;
  for (let i = dailyMinutes.length - 1; i >= 0; i--) {
    if (dailyMinutes[i] > 0) {
      streak++;
    } else {
      break;
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-qz p-7 text-white shadow-qz-card"
      style={{
        background:
          "linear-gradient(135deg, #2D7A6B 0%, #5BA593 60%, #7FBFA8 100%)",
      }}
    >
      <div className="qz-noise absolute inset-0 opacity-40 pointer-events-none" />
      <div className="relative z-10">
        <h1 className="font-serif text-[28px] leading-tight">早上好，沐灵</h1>
        <p className="mt-2 text-[13px] opacity-90">
          连续学习 {streak} 天 · 今天还有 {getTodayTasks(data).filter((t) => !t.done).length} 个任务
        </p>
        <p className="mt-5 font-serif italic text-[15px] opacity-85">见微知著，学有所栖</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[12px] backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-white/80" />
          <span>{profileLabel}</span>
        </div>
      </div>

      <div className="absolute right-6 top-4 pointer-events-none">
        <Leaf size={88} rotate={28} stroke="#FFFFFF" opacity={0.25} />
      </div>
      <div className="absolute right-20 bottom-2 pointer-events-none">
        <Leaf size={56} rotate={-18} stroke="#FFFFFF" opacity={0.2} />
      </div>
    </div>
  );
}

/** 今日学习统计卡片 */
function TodayStatsCard({ data }: { data: AppData }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = data.studyRecord.events.filter((e) => e.recordedAt.slice(0, 10) === today);
  const todayAsks = todayEvents.filter((e) => e.type === "ask").length;
  const todayPractices = todayEvents.filter((e) => e.type === "practice-generated").length;
  const todayMinutes = data.studyStats.dailyMinutes[data.studyStats.dailyMinutes.length - 1] ?? 0;

  return (
    <div className="qz-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark">今日学习</h2>
        <span className="text-[12px] text-qz-text-muted">{today}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-3 py-3 text-center">
          <MessageSquareText size={16} className="text-qz-primary mx-auto mb-1.5" />
          <div className="font-serif text-[24px] text-qz-primary">{todayAsks}</div>
          <div className="text-[11px] text-qz-text-muted">提问</div>
        </div>
        <div className="rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-3 py-3 text-center">
          <Sparkles size={16} className="text-qz-info mx-auto mb-1.5" />
          <div className="font-serif text-[24px] text-qz-info">{todayPractices}</div>
          <div className="text-[11px] text-qz-text-muted">练习</div>
        </div>
        <div className="rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-3 py-3 text-center">
          <Clock size={16} className="text-qz-learning mx-auto mb-1.5" />
          <div className="font-serif text-[24px] text-qz-learning">{todayMinutes}</div>
          <div className="text-[11px] text-qz-text-muted">分钟</div>
        </div>
      </div>
    </div>
  );
}

/** 学习连续天数卡片 */
function StreakCard({ dailyMinutes }: { dailyMinutes: number[] }) {
  let streak = 0;
  for (let i = dailyMinutes.length - 1; i >= 0; i--) {
    if (dailyMinutes[i] > 0) {
      streak++;
    } else {
      break;
    }
  }

  const totalMinutes = dailyMinutes.reduce((a, b) => a + b, 0);
  const avgMinutes = Math.round(totalMinutes / dailyMinutes.length);

  return (
    <div className="qz-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark">学习连续</h2>
        <Flame size={16} className="text-qz-learning" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-qz-learning/20 to-qz-learning/5 flex items-center justify-center">
          <div className="font-serif text-[28px] text-qz-learning">{streak}</div>
        </div>
        <div>
          <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">连续学习天数</div>
          <div className="text-[12px] text-qz-text-muted mt-1">30 天平均 {avgMinutes} 分钟/天</div>
        </div>
      </div>
      {/* 最近 7 天小柱状图 */}
      <div className="mt-4 flex items-end gap-1 h-[40px]">
        {dailyMinutes.slice(-7).map((min, i) => {
          const max = Math.max(...dailyMinutes.slice(-7));
          const ratio = max > 0 ? min / max : 0;
          const isToday = i === 6;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-300"
              style={{
                height: `${Math.max(ratio * 100, 8)}%`,
                background: isToday ? "#2D7A6B" : min > 0 ? "rgba(91,165,147,0.5)" : "rgba(0,0,0,0.05)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function TodayTasksCard({ data, refresh }: { data: AppData; refresh: () => void }) {
  const tasks = getTodayTasks(data);
  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="qz-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark">今日任务</h2>
        <span className="text-[12px] text-qz-text-muted">剩 {remaining} 项</span>
      </div>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-start gap-3 p-3 rounded-md hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
            onClick={() => {
              toggleTask(task.id);
              refresh();
            }}
          >
            {task.done ? (
              <CheckCircle2 size={18} className="text-qz-primary mt-0.5 shrink-0" />
            ) : (
              <Circle size={18} className="text-qz-text-muted mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div
                className={clsx(
                  "text-[13px]",
                  task.done
                    ? "text-qz-text-muted line-through"
                    : "text-qz-text-strong dark:text-qz-text-dark"
                )}
              >
                {task.title}
              </div>
              <div className="text-[11px] text-qz-text-muted mt-0.5">{task.meta}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 待复习提醒：从 goals 中找未完成的 tasks */
function PendingReviewCard({ data }: { data: AppData }) {
  const navigate = useNavigate();
  const pendingTasks = data.goals
    .filter((g) => g.status === "active")
    .flatMap((goal) =>
      goal.milestones
        .filter((m) => !m.done)
        .flatMap((milestone) =>
          milestone.tasks
            .filter((t) => !t.done)
            .map((task) => ({ ...task, goalTitle: goal.title, milestoneTitle: milestone.title }))
        )
    )
    .slice(0, 5);

  return (
    <div className="qz-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark">待复习提醒</h2>
        <div className="flex items-center gap-1.5">
          <Target size={14} className="text-qz-weak" />
          <span className="text-[12px] text-qz-weak">{pendingTasks.length} 项待完成</span>
        </div>
      </div>
      {pendingTasks.length > 0 ? (
        <div className="space-y-2">
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-md border border-black/[0.05] dark:border-white/[0.08] hover:shadow-qz-card-hover transition-shadow"
            >
              <div className="w-8 h-8 rounded-full bg-qz-weak/10 flex items-center justify-center shrink-0">
                <Clock size={14} className="text-qz-weak" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{task.title}</div>
                <div className="text-[11px] text-qz-text-muted mt-0.5">
                  {task.goalTitle} · {task.milestoneTitle} · {task.meta}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/study")}
                className="qz-btn-primary px-3.5 py-1.5 text-[12px] shrink-0"
              >
                去学习
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[13px] text-qz-text-muted text-center py-4">所有任务已完成，继续保持！</div>
      )}
    </div>
  );
}

function RhythmCard({ data }: { data: AppData }) {
  const heights = useMemo(() => data.studyStats.dailyMinutes, [data.studyStats.dailyMinutes]);
  const max = Math.max(...heights);

  return (
    <div className="qz-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark">学习节奏</h2>
        <span className="text-[12px] text-qz-text-muted">最近 30 天</span>
      </div>

      <div className="h-[120px] flex items-end gap-[3px]">
        {heights.map((h, i) => {
          const ratio = h / max;
          const isToday = i === heights.length - 1;
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${ratio * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.015, ease: "easeOut" }}
              className={clsx(
                "flex-1 rounded-t-sm",
                isToday
                  ? "bg-qz-primary"
                  : ratio > 0.7
                  ? "bg-qz-light"
                  : ratio > 0.4
                  ? "bg-qz-light/60"
                  : "bg-qz-light/30"
              )}
            />
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-qz-text-muted">
        <span>30 天前</span>
        <span>今日 · 平均 {Math.round(heights.reduce((a, b) => a + b, 0) / heights.length)} 分钟/天</span>
      </div>
    </div>
  );
}

function ReportsEntryCard() {
  const navigate = useNavigate();
  return (
    <div className="qz-card flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-qz-primary/10 flex items-center justify-center text-qz-primary">
          <BarChart3 size={17} />
        </div>
        <div>
          <div className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark">学习报告</div>
          <div className="text-[12px] text-qz-text-muted mt-1">查看最近提问、资料命中和 fallback 情况</div>
        </div>
      </div>
      <button type="button" onClick={() => navigate("/reports")} className="qz-btn-primary px-4 py-2 text-[12px]">
        查看报告
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const refresh = () => setData(loadAppData());

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="p-8 flex flex-col gap-6 max-w-[1100px] mx-auto">
        <GreetingCard data={data} />

        {/* 今日统计 + 连续天数 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayStatsCard data={data} />
          <StreakCard dailyMinutes={data.studyStats.dailyMinutes} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayTasksCard data={data} refresh={refresh} />
          <RhythmCard data={data} />
        </div>

        <PendingReviewCard data={data} />
        <ReportsEntryCard />
        <div className="h-16" />
      </div>
    </div>
  );
}
