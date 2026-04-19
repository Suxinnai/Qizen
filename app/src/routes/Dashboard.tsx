import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Leaf } from "../components/icons/Leaf";
import { getTodayTasks, loadAppData, modeLabel, toggleTask, type AppData } from "../lib/storage";

interface Review {
  id: string;
  title: string;
  reason: string;
  minutes: number;
}

const REVIEWS: Review[] = [
  {
    id: "r1",
    title: "经济学十讲 · 边际效用",
    reason: "距上次复习已 7 天，记忆留存约 62%",
    minutes: 8,
  },
  {
    id: "r2",
    title: "英语词汇 · Unit 12",
    reason: "5 个易错词等待巩固",
    minutes: 12,
  },
];

function GreetingCard({ data }: { data: AppData }) {
  const profileLabel = data.learningProfile
    ? `${modeLabel(data.learningProfile.dominantMode)}型学习偏好`
    : "先完成学习画像测试，栖知会更懂你";

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
        <h1 className="font-serif text-[28px] leading-tight">☀️ 早上好，沐灵</h1>
        <p className="mt-2 text-[13px] opacity-90">
          连续学习 23 天 🔥 · 今天还有 {getTodayTasks(data).filter((t) => !t.done).length} 个任务
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
        <span>今日 · 平均 38 分钟/天</span>
      </div>
    </div>
  );
}

function ReviewCard() {
  const navigate = useNavigate();

  return (
    <div className="qz-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark">复习提醒</h2>
        <span className="text-[12px] text-qz-text-muted">基于遗忘曲线</span>
      </div>
      <div className="flex flex-col gap-3">
        {REVIEWS.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-4 p-3 rounded-md border border-black/5 dark:border-white/5 hover:shadow-qz-card-hover transition-shadow"
          >
            <div className="w-9 h-9 rounded-full bg-qz-primary/10 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-qz-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{r.title}</div>
              <div className="text-[11px] text-qz-text-muted mt-0.5">{r.reason}</div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/study")}
              className="px-3 py-1.5 rounded-md bg-qz-primary text-white text-[12px] hover:bg-qz-dark transition-colors shrink-0"
            >
              开始复习 {r.minutes} 分钟
            </button>
          </div>
        ))}
      </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayTasksCard data={data} refresh={refresh} />
          <RhythmCard data={data} />
        </div>
        <ReviewCard />
        <div className="h-16" />
      </div>
    </div>
  );
}
