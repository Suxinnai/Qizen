import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  BookMarked,
  CalendarDays,
  MessageSquareText,
  RotateCcw,
  TrendingUp,
  Activity,
  Award,
  FileText
} from "lucide-react";

import { loadAppData } from "../lib/storage";

function StatCard({
  label,
  value,
  icon: Icon,
  type
}: {
  label: string;
  value: string | number;
  icon: typeof BarChart3;
  type: string;
}) {
  const themeMap: Record<
    string,
    { bg: string; border: string; glow: string; text: string; iconBg: string; iconColor: string }
  > = {
    ask: {
      bg: "bg-emerald-50/40 dark:bg-emerald-950/10",
      border: "hover:border-emerald-500/30",
      glow: "hover:shadow-[0_8px_30px_rgb(16_185_129_/_0.06)] dark:hover:shadow-[0_8px_30px_rgb(16_185_129_/_0.03)]",
      text: "text-emerald-700 dark:text-emerald-400",
      iconBg: "bg-emerald-100/50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    interact: {
      bg: "bg-indigo-50/40 dark:bg-indigo-950/10",
      border: "hover:border-indigo-500/30",
      glow: "hover:shadow-[0_8px_30px_rgb(99_102_241_/_0.06)] dark:hover:shadow-[0_8px_30px_rgb(99_102_241_/_0.03)]",
      text: "text-indigo-700 dark:text-indigo-400",
      iconBg: "bg-indigo-100/50 dark:bg-indigo-900/20",
      iconColor: "text-indigo-600 dark:text-indigo-400"
    },
    hit: {
      bg: "bg-rose-50/40 dark:bg-rose-950/10",
      border: "hover:border-rose-500/30",
      glow: "hover:shadow-[0_8px_30px_rgb(244_63_94_/_0.06)] dark:hover:shadow-[0_8px_30px_rgb(244_63_94_/_0.03)]",
      text: "text-rose-700 dark:text-rose-400",
      iconBg: "bg-rose-100/50 dark:bg-rose-900/20",
      iconColor: "text-rose-600 dark:text-rose-400"
    },
    fallback: {
      bg: "bg-amber-50/40 dark:bg-amber-950/10",
      border: "hover:border-amber-500/30",
      glow: "hover:shadow-[0_8px_30px_rgb(245_158_11_/_0.06)] dark:hover:shadow-[0_8px_30px_rgb(245_158_11_/_0.03)]",
      text: "text-amber-700 dark:text-amber-400",
      iconBg: "bg-amber-100/50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    practice: {
      bg: "bg-teal-50/40 dark:bg-teal-950/10",
      border: "hover:border-teal-500/30",
      glow: "hover:shadow-[0_8px_30px_rgb(20_184_166_/_0.06)] dark:hover:shadow-[0_8px_30px_rgb(20_184_166_/_0.03)]",
      text: "text-teal-700 dark:text-teal-400",
      iconBg: "bg-teal-100/50 dark:bg-teal-900/20",
      iconColor: "text-teal-600 dark:text-teal-400"
    }
  };

  const theme = themeMap[type] || themeMap.interact;

  return (
    <motion.div
      whileHover={{ scale: 1.025, y: -2 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`qz-card !p-5 relative overflow-hidden border border-black/[0.04] dark:border-white/[0.04] ${theme.bg} ${theme.border} ${theme.glow} shadow-[0_2px_12px_rgba(0,0,0,0.01)]`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/2 pointer-events-none" />
      <div className="flex items-center justify-between mb-3.5 relative z-10">
        <div className="text-[11px] text-qz-text-muted font-bold tracking-wider uppercase">{label}</div>
        <div className={`p-2 rounded-xl ${theme.iconBg} transition-colors duration-300`}>
          <Icon size={15} className={theme.iconColor} />
        </div>
      </div>
      <div className="flex items-baseline gap-1 relative z-10">
        <span className={`font-serif text-[32px] font-bold ${theme.text} leading-none`}>
          {value}
        </span>
      </div>
    </motion.div>
  );
}

/** 纯 CSS + Framer Motion 柱状图：最近 7 天学习时间 */
function WeeklyBarChart({ dailyMinutes }: { dailyMinutes: number[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const last7 = dailyMinutes.slice(-7);
  const max = Math.max(...last7, 1);
  const maxScaled = Math.ceil(max / 15) * 15;
  const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

  const todayDow = new Date().getDay(); // 0=Sun
  const startIndex = (todayDow - last7.length % 7 + 7) % 7;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="qz-card relative overflow-hidden flex flex-col"
    >
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-2 text-qz-primary">
          <CalendarDays size={18} />
          <h2 className="font-serif text-[22px] font-bold">最近 7 天学习时间</h2>
        </div>
        <div className="text-[11px] text-qz-text-muted px-2.5 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.04]">
          平均 {Math.round(last7.reduce((a, b) => a + b, 0) / last7.length)} 分钟/天
        </div>
      </div>

      <div
        className="relative h-[180px] w-full flex items-end px-2 select-none"
        onMouseMove={handleMouseMove}
      >
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-[28px] pt-[20px] px-1">
          {[1, 0.66, 0.33, 0].map((ratio, idx) => (
            <div key={idx} className="w-full flex items-center gap-2">
              <span className="text-[9px] text-qz-text-muted/50 w-6 text-right font-mono">
                {Math.round(maxScaled * ratio)}m
              </span>
              <div className="flex-1 border-t border-dashed border-black/[0.06] dark:border-white/[0.06]" />
            </div>
          ))}
        </div>

        {/* Bar container */}
        <div className="relative z-10 w-full flex items-end gap-3 h-[140px] pl-8">
          {last7.map((min, i) => {
            const ratio = min / maxScaled;
            const isToday = i === last7.length - 1;
            const dayIndex = (startIndex + i) % 7;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="w-full relative group">
                  {hoveredIndex === i && (
                    <div
                      className="absolute inset-0 rounded-t-lg blur-[6px] opacity-25 transition-all duration-300 pointer-events-none"
                      style={{
                        height: `${Math.max(ratio * 100, 8)}%`,
                        background: isToday ? "#2D7A6B" : "#5BA593"
                      }}
                    />
                  )}

                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(ratio * 100, 8)}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 15, delay: i * 0.05 }}
                    className="w-full rounded-t-md transition-all duration-300 relative overflow-hidden"
                    style={{
                      background: isToday
                        ? "linear-gradient(180deg, #2D7A6B 0%, #4D9A8B 100%)"
                        : hoveredIndex === i
                        ? "linear-gradient(180deg, #469685 0%, #68B6A4 100%)"
                        : ratio > 0.7
                        ? "#5BA593"
                        : ratio > 0.4
                        ? "rgba(91,165,147,0.7)"
                        : "rgba(91,165,147,0.35)",
                      boxShadow: isToday ? "0 4px 12px rgba(45,122,107,0.15)" : "none"
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-white/20" />
                  </motion.div>
                </div>
                <div
                  className={`text-[11px] mt-1 transition-colors duration-200 ${
                    isToday ? "text-qz-primary font-bold" : "text-qz-text-muted"
                  }`}
                >
                  {dayLabels[dayIndex]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Tooltip */}
        <AnimatePresence>
          {hoveredIndex !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 pointer-events-none bg-qz-card/90 dark:bg-qz-card-dark/90 border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3 shadow-lg flex flex-col gap-1 backdrop-blur-md"
              style={{
                left: mousePos.x + 15,
                top: mousePos.y - 65
              }}
            >
              <div className="text-[10px] text-qz-text-muted font-bold font-serif uppercase tracking-wider">
                {hoveredIndex === last7.length - 1
                  ? "今天 (周" + dayLabels[(startIndex + hoveredIndex) % 7] + ")"
                  : "周" + dayLabels[(startIndex + hoveredIndex) % 7]}
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    hoveredIndex === last7.length - 1 ? "bg-qz-primary" : "bg-qz-learning"
                  }`}
                />
                <span className="text-[14px] font-bold text-qz-primary dark:text-qz-text-dark font-mono">
                  {last7[hoveredIndex]}{" "}
                  <span className="text-[11px] font-normal text-qz-text-muted font-sans">分钟</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** 提问分布：哪些资料被问得最多 */
function TopResourcesChart({ events }: { events: { hitResourceTitles: string[] }[] }) {
  const countMap = new Map<string, number>();
  events.forEach((event) => {
    event.hitResourceTitles.forEach((title) => {
      countMap.set(title, (countMap.get(title) ?? 0) + 1);
    });
  });

  const sorted = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
  const totalHits = Array.from(countMap.values()).reduce((a, b) => a + b, 0);

  const rankMedals = [
    { bg: "bg-amber-400 text-amber-950 font-bold", border: "border-amber-300 shadow-[0_2px_6px_rgba(245,158,11,0.2)]" },
    { bg: "bg-slate-300 text-slate-900 font-bold", border: "border-slate-200 shadow-[0_2px_6px_rgba(148,163,184,0.15)]" },
    { bg: "bg-amber-700 text-amber-50 font-bold", border: "border-amber-600 shadow-[0_2px_6px_rgba(180,83,9,0.15)]" },
    { bg: "bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted", border: "border-transparent" },
    { bg: "bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted", border: "border-transparent" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="qz-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-qz-primary">
          <BookMarked size={18} />
          <h2 className="font-serif text-[22px] font-bold">提问分布 Top 5</h2>
        </div>
        <div className="text-[11px] text-qz-text-muted px-2.5 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.04]">
          共命中 {totalHits} 次
        </div>
      </div>
      {sorted.length > 0 ? (
        <div className="space-y-4 pt-1">
          {sorted.map(([title, count], i) => {
            const ratio = count / maxCount;
            const percentage = totalHits > 0 ? Math.round((count / totalHits) * 100) : 0;
            return (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${rankMedals[i].bg} ${rankMedals[i].border}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-medium text-qz-text-strong dark:text-qz-text-dark truncate group-hover:text-qz-primary transition-colors duration-200">
                      {title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className="text-[12px] text-qz-primary font-bold">{count}次</span>
                    <span className="text-[9.5px] text-qz-text-muted/70 bg-black/[0.03] dark:bg-white/[0.04] px-1.5 py-0.5 rounded-md font-mono">
                      {percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-[7px] rounded-full bg-black/[0.03] dark:bg-white/[0.06] overflow-hidden p-[1px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ratio * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.08 }}
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      background: "linear-gradient(90deg, #2D7A6B 0%, #5BA593 100%)",
                      boxShadow: "0 1px 4px rgba(45, 122, 107, 0.1)"
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-[13px] text-qz-text-muted h-[160px] flex items-center justify-center border border-dashed border-black/[0.05] dark:border-white/[0.05] rounded-xl">
          暂无资料命中记录，提问后会自动统计。
        </div>
      )}
    </motion.div>
  );
}

/** 练习统计 */
function PracticeStatsCard({
  events,
  practiceSets
}: {
  events: { type: string }[];
  practiceSets: { status: string }[];
}) {
  const generated = events.filter((e) => e.type === "practice-generated").length;
  const completed = events.filter((e) => e.type === "practice-completed").length + practiceSets.filter((p) => p.status === "completed").length;
  const percentage = generated > 0 ? Math.round((completed / generated) * 100) : 0;

  // Dynamic feedback text
  const feedback = useMemo(() => {
    if (generated === 0) return "开启您的第一次自主练习吧，栖知会为您量身定制题目。";
    if (percentage >= 80) return "卓越：您的自主练习计划执行非常到位，继续保持！";
    if (percentage >= 50) return "良好：您已经掌握了大部分所学，可以尝试更高难度题目。";
    return "加油：自主练习可以巩固记忆，建议多尝试进行练习答题。";
  }, [percentage, generated]);

  const circumference = 2 * Math.PI * 36; // ~226.2
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="qz-card"
    >
      <div className="flex items-center gap-2 mb-4 text-qz-primary">
        <Award size={18} />
        <h2 className="font-serif text-[22px] font-bold">练习统计</h2>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        {/* Radial SVG Gauge */}
        <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0 select-none">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="56"
              cy="56"
              r="36"
              className="stroke-black/[0.04] dark:stroke-white/[0.06]"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Active circle */}
            <motion.circle
              cx="56"
              cy="56"
              r="36"
              stroke={generated > 0 ? "#2D7A6B" : "rgba(91,165,147,0.2)"}
              strokeWidth="7"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-serif text-[26px] font-bold text-qz-primary dark:text-qz-text-dark leading-none">
              {percentage}%
            </span>
            <span className="text-[9px] text-qz-text-muted font-medium mt-1">完成率</span>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          <div className="rounded-2xl border border-black/[0.03] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3.5 text-center group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200">
            <div className="text-[11px] text-qz-text-muted mb-1 font-medium">已生成</div>
            <div className="font-serif text-[30px] font-bold text-qz-primary leading-none mb-1">
              {generated}
            </div>
            <div className="text-[10px] text-qz-text-muted/80">套练习</div>
          </div>
          <div className="rounded-2xl border border-black/[0.03] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3.5 text-center group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200">
            <div className="text-[11px] text-qz-text-muted mb-1 font-medium font-serif text-qz-mastered">
              已完成
            </div>
            <div className="font-serif text-[30px] font-bold text-qz-primary leading-none mb-1">
              {completed}
            </div>
            <div className="text-[10px] text-qz-text-muted/80">套练习</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-black/[0.04] dark:border-white/[0.05] flex items-start gap-2">
        <Activity size={14} className="text-qz-primary mt-0.5 flex-shrink-0" />
        <p className="text-[11.5px] text-qz-text-muted leading-relaxed italic">{feedback}</p>
      </div>
    </motion.div>
  );
}

/** 事件时间线 */
function EventTimeline({
  events
}: {
  events: {
    id: string;
    type: string;
    recordedAt: string;
    question: string;
    hitResourceTitles: string[];
  }[];
}) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const recent = events.slice(-12).reverse();

  const filteredEvents = useMemo(() => {
    if (activeTab === "all") return recent;
    if (activeTab === "ask") return recent.filter((e) => e.type === "ask");
    if (activeTab === "practice")
      return recent.filter((e) => e.type === "practice-generated" || e.type === "practice-completed");
    if (activeTab === "progress") return recent.filter((e) => e.type === "progress-updated");
    return recent;
  }, [recent, activeTab]);

  const typeLabel: Record<string, string> = {
    ask: "提问",
    "practice-generated": "生成练习",
    "practice-completed": "完成练习",
    "progress-updated": "进度更新"
  };

  const typeColor: Record<string, string> = {
    ask: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
    "practice-generated": "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]",
    "practice-completed": "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]",
    "progress-updated": "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "ask":
        return <MessageSquareText size={8} className="text-white" />;
      case "practice-generated":
        return <Activity size={8} className="text-white" />;
      case "practice-completed":
        return <Award size={8} className="text-white" />;
      case "progress-updated":
        return <TrendingUp size={8} className="text-white" />;
      default:
        return <Activity size={8} className="text-white" />;
    }
  };

  const tabs = [
    { id: "all", label: "全部" },
    { id: "ask", label: "提问" },
    { id: "practice", label: "练习" },
    { id: "progress", label: "进度" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="qz-card flex flex-col h-[400px]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 flex-shrink-0">
        <div className="flex items-center gap-2 text-qz-primary">
          <TrendingUp size={18} />
          <h2 className="font-serif text-[22px] font-bold">事件时间线</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-black/[0.03] dark:bg-white/[0.04] p-0.5 rounded-lg self-start sm:self-auto relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-1 rounded-md text-[11.5px] font-medium transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "text-qz-primary dark:text-qz-text-dark font-bold"
                    : "text-qz-text-muted hover:text-qz-text"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTimelineTab"
                    className="absolute inset-0 bg-white dark:bg-qz-card-dark rounded-md shadow-sm border border-black/[0.02] dark:border-white/[0.02]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 select-text scrollbar-thin">
        {filteredEvents.length > 0 ? (
          <div className="relative pl-6 pt-1">
            {/* Timeline Line */}
            <div className="absolute left-[7px] top-3 bottom-3 w-[1.5px] bg-black/[0.05] dark:bg-white/[0.08] border-dashed border-l" />

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                    className="relative"
                  >
                    {/* Circle Node with icon */}
                    <div
                      className={`absolute left-[-23px] top-[10px] w-4 h-4 rounded-full flex items-center justify-center z-10 border-2 border-white dark:border-qz-card-dark ${
                        typeColor[event.type] ?? "bg-qz-text-muted"
                      }`}
                    >
                      {typeIcon(event.type)}
                    </div>

                    <div className="rounded-xl border border-black/[0.03] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-qz-primary/10 text-qz-primary">
                            {typeLabel[event.type] ?? event.type}
                          </span>
                          <span className="text-[10.5px] text-qz-text-muted/80">
                            {new Date(event.recordedAt).toLocaleString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-qz-text-muted/65 font-mono">
                          {new Date(event.recordedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark leading-6 font-medium">
                        {event.question}
                      </div>
                      {event.hitResourceTitles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {event.hitResourceTitles.map((title) => (
                            <span
                              key={title}
                              className="text-[9.5px] font-medium px-2 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.06] text-qz-text-muted flex items-center gap-1 border border-black/[0.02] dark:border-white/[0.02]"
                            >
                              <FileText size={10} className="text-qz-primary" />
                              {title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-qz-text-muted h-[240px] flex items-center justify-center border border-dashed border-black/[0.05] dark:border-white/[0.05] rounded-xl">
            暂无对应的学习事件记录。
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** 30 天学习热力图（GitHub 贡献图风格） */
function ActivityHeatmap({ dailyMinutes }: { dailyMinutes: number[] }) {
  const days = dailyMinutes.slice(-30);
  const max = Math.max(...days, 1);
  const today = new Date();

  const cells: ({ date: Date; minutes: number } | null)[] = days.map((minutes, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days.length - 1 - i));
    return { date, minutes };
  });

  const firstDow = cells[0]?.date.getDay() ?? 0;
  const padded: ({ date: Date; minutes: number } | null)[] = [...Array(firstDow).fill(null), ...cells];
  const weeks: ({ date: Date; minutes: number } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const totalMinutes = days.reduce((a, b) => a + b, 0);
  const activeDays = days.filter((m) => m > 0).length;
  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  function cellStyle(minutes: number) {
    if (minutes <= 0) return "bg-black/[0.04] dark:bg-white/[0.05]";
    const ratio = minutes / max;
    if (ratio > 0.75) return "bg-[#2D7A6B]";
    if (ratio > 0.5) return "bg-[#4D9A8B]";
    if (ratio > 0.25) return "bg-[#5BA593]";
    return "bg-[#9CC8BC] dark:bg-[#3C7468]";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="qz-card"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-qz-primary">
          <CalendarDays size={18} />
          <h2 className="font-serif text-[22px] font-bold">30 天学习热力图</h2>
        </div>
        <div className="text-[11px] text-qz-text-muted px-2.5 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.04]">
          活跃 {activeDays} 天 · 共 {totalMinutes} 分钟
        </div>
      </div>

      <div className="flex gap-2 items-start overflow-x-auto pb-2 scrollbar-thin">
        {/* 周几标签 */}
        <div className="flex flex-col gap-[5px] pr-1 pt-[1px] select-none">
          {weekdayLabels.map((label, i) => (
            <span key={label} className="h-[16px] text-[9px] text-qz-text-muted/60 font-mono leading-[16px]">
              {i % 2 === 1 ? label : ""}
            </span>
          ))}
        </div>
        {/* 每周一列 */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[5px]">
            {Array.from({ length: 7 }).map((_, di) => {
              const cell = week[di];
              if (!cell) return <div key={di} className="w-[16px] h-[16px]" />;
              return (
                <div
                  key={di}
                  title={`${cell.date.toLocaleDateString()} · ${cell.minutes} 分钟`}
                  className={`w-[16px] h-[16px] rounded-[3px] ${cellStyle(cell.minutes)} transition-transform duration-150 hover:scale-125 hover:ring-1 hover:ring-qz-primary/40 cursor-default`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* 强度图例 */}
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[9.5px] text-qz-text-muted/70 select-none">
        <span>少</span>
        <div className="w-[12px] h-[12px] rounded-[3px] bg-black/[0.04] dark:bg-white/[0.05]" />
        <div className="w-[12px] h-[12px] rounded-[3px] bg-[#9CC8BC] dark:bg-[#3C7468]" />
        <div className="w-[12px] h-[12px] rounded-[3px] bg-[#5BA593]" />
        <div className="w-[12px] h-[12px] rounded-[3px] bg-[#4D9A8B]" />
        <div className="w-[12px] h-[12px] rounded-[3px] bg-[#2D7A6B]" />
        <span>多</span>
      </div>
    </motion.div>
  );
}

/** 模型使用占比：真实模型 vs 本地 fallback */
function ModelUsageDonut({ events }: { events: { llm: { usedFallback: boolean } }[] }) {
  const total = events.length;
  const fallback = events.filter((event) => event.llm.usedFallback).length;
  const real = total - fallback;
  const realPct = total > 0 ? Math.round((real / total) * 100) : 0;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const realLen = total > 0 ? (real / total) * circumference : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="qz-card flex flex-col"
    >
      <div className="flex items-center gap-2 mb-4 text-qz-primary">
        <Activity size={18} />
        <h2 className="font-serif text-[22px] font-bold">模型使用占比</h2>
      </div>

      {total > 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 py-2">
          <div className="relative w-36 h-36 flex items-center justify-center select-none">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="16" className="stroke-amber-400/70 dark:stroke-amber-500/50" />
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#2D7A6B"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${realLen} ${circumference - realLen}`}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${realLen} ${circumference - realLen}` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-serif text-[28px] font-bold text-qz-primary leading-none">{realPct}%</span>
              <span className="text-[9px] text-qz-text-muted mt-1">真实模型</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="rounded-2xl border border-black/[0.03] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#2D7A6B]" />
                <span className="text-[10.5px] text-qz-text-muted font-medium">真实模型</span>
              </div>
              <div className="font-serif text-[22px] font-bold text-qz-primary leading-none">{real}</div>
            </div>
            <div className="rounded-2xl border border-black/[0.03] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10.5px] text-qz-text-muted font-medium">本地 fallback</span>
              </div>
              <div className="font-serif text-[22px] font-bold text-amber-600 dark:text-amber-400 leading-none">{fallback}</div>
            </div>
          </div>
          <p className="text-[11px] text-qz-text-muted/80 italic text-center leading-relaxed">
            {realPct >= 80
              ? "大部分回答来自真实模型，依据质量较稳。"
              : realPct >= 40
              ? "真实模型与本地回答各占一部分，可在设置里检查 API 配置。"
              : "当前多为本地 fallback，配置模型后回答会更准确。"}
          </p>
        </div>
      ) : (
        <div className="flex-1 text-[13px] text-qz-text-muted flex items-center justify-center border border-dashed border-black/[0.05] dark:border-white/[0.05] rounded-xl min-h-[200px]">
          暂无交互记录，提问后会统计模型来源。
        </div>
      )}
    </motion.div>
  );
}

export default function Reports() {
  const data = useMemo(() => loadAppData(), []);
  const events = data.studyRecord.events;
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => event.recordedAt.slice(0, 10) === today);
  const askEvents = events.filter((event) => event.type === "ask");
  const practiceEvents = events.filter(
    (event) => event.generatedPractice || event.type === "practice-generated"
  );
  const fallbackEvents = events.filter((event) => event.llm.usedFallback);
  const hitEvents = events.filter((event) => event.hitResourceTitles.length > 0);
  const recentQuestions = askEvents.slice(-8).reverse();
  const recentHitTitles = Array.from(
    new Set(events.flatMap((event) => event.hitResourceTitles))
  )
    .slice(-8)
    .reverse();

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-[1180px] mx-auto flex flex-col gap-6 select-none">
        <div>
          <h1 className="font-serif text-[34px] text-qz-primary mb-2">学习报告</h1>
          <p className="font-serif italic text-[14px] text-qz-text-muted">
            把学习过程看清楚，才知道下一步怎么走
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="今日提问"
            value={todayEvents.filter((event) => event.type === "ask").length}
            icon={MessageSquareText}
            type="ask"
          />
          <StatCard
            label="学习交互"
            value={events.length}
            icon={BarChart3}
            type="interact"
          />
          <StatCard
            label="资料命中"
            value={hitEvents.length}
            icon={BookMarked}
            type="hit"
          />
          <StatCard
            label="Fallback"
            value={fallbackEvents.length}
            icon={RotateCcw}
            type="fallback"
          />
          <StatCard
            label="练习生成"
            value={practiceEvents.length}
            icon={Award}
            type="practice"
          />
        </div>

        {/* 图表区域 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <WeeklyBarChart dailyMinutes={data.studyStats.dailyMinutes} />
          <TopResourcesChart events={events} />
        </div>

        <div className="grid lg:grid-cols-[1.45fr,0.55fr] gap-6">
          <ActivityHeatmap dailyMinutes={data.studyStats.dailyMinutes} />
          <ModelUsageDonut events={events} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <PracticeStatsCard events={events} practiceSets={data.practiceSets} />
          <EventTimeline events={events} />
        </div>

        {/* 原有区域保留，加入 Framer Motion 和高对比玻璃样式 */}
        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="qz-card"
          >
            <div className="flex items-center gap-2 mb-4 text-qz-primary">
              <MessageSquareText size={18} />
              <h2 className="font-serif text-[22px] font-bold">最近问题</h2>
            </div>
            {recentQuestions.length > 0 ? (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 select-text scrollbar-thin">
                {recentQuestions.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="rounded-2xl border border-black/[0.03] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all duration-200"
                  >
                    <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark font-medium leading-relaxed">
                      {event.question}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] text-qz-text-muted font-medium">
                      <span>{new Date(event.recordedAt).toLocaleString()}</span>
                      <span className="text-qz-text-muted/40">•</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.06] font-bold">
                        {event.llm.providerLabel}
                      </span>
                      <span className="text-qz-text-muted/40">•</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          event.llm.usedFallback
                            ? "bg-amber-100/60 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {event.llm.usedFallback ? "fallback" : "真实模型"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-qz-text-muted h-[240px] flex items-center justify-center border border-dashed border-black/[0.05] dark:border-white/[0.05] rounded-xl">
                还没有学习问答记录。
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="qz-card"
          >
            <div className="flex items-center gap-2 mb-4 text-qz-primary">
              <BookMarked size={18} />
              <h2 className="font-serif text-[22px] font-bold">最近命中资料</h2>
            </div>
            {recentHitTitles.length > 0 ? (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 select-text scrollbar-thin">
                {recentHitTitles.map((title, index) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="rounded-2xl border border-black/[0.03] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3.5 text-[13px] text-qz-text-strong dark:text-qz-text-dark font-medium hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200 flex items-center gap-3"
                  >
                    <div className="p-2 rounded-xl bg-qz-primary/10 text-qz-primary flex-shrink-0">
                      <FileText size={16} />
                    </div>
                    <span className="truncate">{title}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-qz-text-muted leading-7 h-[240px] flex items-center justify-center border border-dashed border-black/[0.05] dark:border-white/[0.05] rounded-xl text-center px-6">
                暂时还没有稳定命中的资料。等你在学习空间里围绕资料提问后，这里会显示最近依据来源。
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
