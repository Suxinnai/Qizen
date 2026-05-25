import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { 
  ChevronDown, 
  ChevronRight, 
  Target,
  BookOpen,
  Flame,
  FileText,
  Clock,
  Trophy,
  Plus,
  ArrowRight,
  Check,
  Award,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { loadAppData } from "../lib/storage";

export default function Goals() {
  const navigate = useNavigate();
  const data = useMemo(() => loadAppData(), []);
  const [selectedGoalId, setSelectedGoalId] = useState(data.goals[0]?.id ?? "");
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

  const selectedGoal = data.goals.find((goal) => goal.id === selectedGoalId) ?? data.goals[0];

  // Helper for task icon selection
  const getTaskIcon = (title: string, meta: string) => {
    const searchStr = (title + " " + meta).toLowerCase();
    if (searchStr.includes("阅读") || searchStr.includes("read") || searchStr.includes("书") || searchStr.includes("人类简史")) {
      return <BookOpen size={15} className="text-blue-500 dark:text-blue-400" />;
    }
    if (searchStr.includes("练习") || searchStr.includes("practice") || searchStr.includes("题") || searchStr.includes("册")) {
      return <Flame size={15} className="text-amber-500 dark:text-amber-400" />;
    }
    if (searchStr.includes("笔记") || searchStr.includes("note") || searchStr.includes("整理")) {
      return <FileText size={15} className="text-emerald-500 dark:text-emerald-400" />;
    }
    if (searchStr.includes("复习") || searchStr.includes("review") || searchStr.includes("强化")) {
      return <Sparkles size={15} className="text-purple-500 dark:text-purple-400" />;
    }
    return <Target size={15} className="text-qz-primary dark:text-qz-light" />;
  };

  // Helper to get soft colorful background for task icons
  const getTaskIconBg = (title: string, meta: string) => {
    const searchStr = (title + " " + meta).toLowerCase();
    if (searchStr.includes("阅读") || searchStr.includes("read") || searchStr.includes("书") || searchStr.includes("人类简史")) {
      return "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/30";
    }
    if (searchStr.includes("练习") || searchStr.includes("practice") || searchStr.includes("题") || searchStr.includes("册")) {
      return "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/30";
    }
    if (searchStr.includes("笔记") || searchStr.includes("note") || searchStr.includes("整理")) {
      return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/30";
    }
    if (searchStr.includes("复习") || searchStr.includes("review") || searchStr.includes("强化")) {
      return "bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/30";
    }
    return "bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/30";
  };

  // Toggle milestone collapse/expand
  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones((prev) => ({
      ...prev,
      [milestoneId]: !prev[milestoneId],
    }));
  };

  // Helper to check if expanded (default to true)
  const isMilestoneExpanded = (milestoneId: string) => {
    return expandedMilestones[milestoneId] !== false;
  };

  // Get subject styles
  const getSubjectStyle = (subject: string, status: string, isSelected: boolean) => {
    if (status === "done") {
      return {
        cardBg: "bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-zinc-900/40 dark:to-zinc-900/10",
        border: isSelected 
          ? "border-slate-400 dark:border-zinc-500 shadow-[0_8px_30px_rgba(148,163,184,0.12)] scale-[1.01]" 
          : "border-[#EFEDE8] dark:border-white/5 hover:border-slate-300 dark:hover:border-zinc-700",
        subjectBadge: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border-slate-200/50 dark:border-zinc-700/50",
        progressBarBg: "bg-slate-200/60 dark:bg-zinc-800",
        progressBarFill: "bg-slate-400 dark:bg-zinc-500",
        glowEffect: "bg-slate-400/5 dark:bg-slate-500/5",
        textTitle: "text-slate-700 dark:text-slate-300",
      };
    }

    switch (subject) {
      case "数学":
        return {
          cardBg: "bg-gradient-to-br from-emerald-50/40 to-teal-50/10 dark:from-teal-950/10 dark:to-emerald-950/5",
          border: isSelected 
            ? "border-qz-primary shadow-[0_8px_30px_rgba(45,122,107,0.14)] scale-[1.01]" 
            : "border-[#EFEDE8] dark:border-white/5 hover:border-qz-primary/30 dark:hover:border-qz-primary/20",
          subjectBadge: "bg-qz-primary/10 text-qz-primary dark:bg-qz-primary/20 dark:text-qz-light border-qz-primary/20 dark:border-qz-primary/30",
          progressBarBg: "bg-teal-100/40 dark:bg-teal-950/30",
          progressBarFill: "bg-qz-primary",
          glowEffect: "bg-qz-primary/5",
          textTitle: "text-qz-primary dark:text-qz-light",
        };
      case "英语":
        return {
          cardBg: "bg-gradient-to-br from-blue-50/40 to-indigo-50/10 dark:from-blue-950/10 dark:to-indigo-950/5",
          border: isSelected 
            ? "border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.14)] scale-[1.01]" 
            : "border-[#EFEDE8] dark:border-white/5 hover:border-blue-500/30 dark:hover:border-blue-500/20",
          subjectBadge: "bg-blue-500/10 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
          progressBarBg: "bg-blue-100/40 dark:bg-blue-950/30",
          progressBarFill: "bg-blue-500",
          glowEffect: "bg-blue-500/5",
          textTitle: "text-blue-600 dark:text-blue-400",
        };
      case "编程":
      default:
        return {
          cardBg: "bg-gradient-to-br from-purple-50/40 to-pink-50/10 dark:from-purple-950/10 dark:to-pink-950/5",
          border: isSelected 
            ? "border-purple-500 shadow-[0_8px_30px_rgba(168,85,247,0.14)] scale-[1.01]" 
            : "border-[#EFEDE8] dark:border-white/5 hover:border-purple-500/30 dark:hover:border-purple-500/20",
          subjectBadge: "bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/30",
          progressBarBg: "bg-purple-100/40 dark:bg-purple-950/30",
          progressBarFill: "bg-purple-500",
          glowEffect: "bg-purple-500/5",
          textTitle: "text-purple-600 dark:text-purple-400",
        };
    }
  };

  // Calculate detailed progress stats for the selected goal
  const selectedGoalStats = useMemo(() => {
    if (!selectedGoal) return { total: 0, completed: 0, time: 0, ratio: 0, completedMilestones: 0, totalMilestones: 0 };
    let total = 0;
    let completed = 0;
    let time = 0;
    selectedGoal.milestones.forEach((m) => {
      m.tasks.forEach((t) => {
        total++;
        if (t.done) completed++;
        time += t.estimatedMinutes || 0;
      });
    });
    const totalMilestones = selectedGoal.milestones.length;
    const completedMilestones = selectedGoal.milestones.filter(m => m.tasks.every(t => t.done)).length;
    return {
      total,
      completed,
      time,
      ratio: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedMilestones,
      totalMilestones,
    };
  }, [selectedGoal]);

  // Overall database goal statistics
  const overallStats = useMemo(() => {
    const goals = data.goals;
    const total = goals.length;
    const active = goals.filter((g) => g.status === "active").length;
    const completed = goals.filter((g) => g.status === "done").length;
    return { total, active, completed };
  }, [data]);

  return (
    <div className="h-full overflow-y-auto bg-qz-bg dark:bg-qz-bg-dark transition-colors duration-200">
      <div className="p-8 max-w-[1180px] mx-auto flex flex-col gap-8">
        
        {/* Header Block with Stats Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-qz-divider dark:border-qz-divider-dark pb-6">
          <div>
            <h1 className="font-serif text-[34px] text-qz-text-strong dark:text-qz-text-dark mb-1.5 flex items-center gap-2">
              我的目标
              <Award size={26} className="text-qz-primary dark:text-qz-light opacity-80" />
            </h1>
            <p className="font-serif italic text-[14px] text-qz-text-muted">千里之行，始于栖叶</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Soft Stats Box */}
            <div className="hidden md:flex items-center gap-3 bg-white dark:bg-qz-card-dark border border-black/5 dark:border-white/5 rounded-qz px-4 py-2 text-[12px] shadow-sm">
              <div className="flex items-center gap-1.5 border-r border-qz-divider dark:border-qz-divider-dark pr-3">
                <span className="w-2 h-2 rounded-full bg-qz-primary animate-pulse" />
                <span className="text-qz-text-muted">进行中</span>
                <span className="font-bold text-qz-text-strong dark:text-qz-text-dark">{overallStats.active}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy size={13} className="text-amber-500" />
                <span className="text-qz-text-muted">已达标</span>
                <span className="font-bold text-qz-text-strong dark:text-qz-text-dark">{overallStats.completed}</span>
              </div>
            </div>

            <button className="qz-btn-primary px-5 py-2.5 text-[13px] flex items-center gap-2 group shadow-md transition-all duration-300">
              <Plus size={15} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>新建目标</span>
            </button>
          </div>
        </div>

        {/* Goal Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {data.goals.map((goal) => {
            const isSelected = selectedGoalId === goal.id;
            const style = getSubjectStyle(goal.subject, goal.status, isSelected);
            const totalTasks = goal.milestones.reduce((acc, m) => acc + m.tasks.length, 0);
            const completedTasks = goal.milestones.reduce((acc, m) => acc + m.tasks.filter(t => t.done).length, 0);

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => setSelectedGoalId(goal.id)}
                className={clsx(
                  "qz-card text-left relative overflow-hidden transition-all duration-300 p-6 flex flex-col justify-between min-h-[175px] group",
                  style.cardBg,
                  style.border
                )}
              >
                {/* Glow backdrop decorator */}
                <div className={clsx("absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-all duration-500", style.glowEffect)} />

                {/* Top Section */}
                <div className="w-full relative z-10">
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={clsx("text-[11px] font-bold px-2 py-0.5 rounded border tracking-wider", style.subjectBadge)}>
                      {goal.subject}
                    </span>
                    {goal.status === "done" ? (
                      <div className="bg-amber-100 dark:bg-amber-950/50 p-1 rounded-full text-amber-600 dark:text-amber-400 shadow-sm">
                        <Trophy size={13} />
                      </div>
                    ) : isSelected ? (
                      <span className="w-2 h-2 rounded-full bg-qz-primary shadow-[0_0_8px_#2D7A6B]" />
                    ) : null}
                  </div>

                  <h3 className="font-serif text-[21px] text-qz-text-strong dark:text-qz-text-dark font-semibold leading-snug mb-1 group-hover:text-qz-primary dark:group-hover:text-qz-light transition-colors duration-200">
                    {goal.title}
                  </h3>
                  <p className="text-[12px] text-qz-text-muted line-clamp-1 mb-4">
                    {goal.description}
                  </p>
                </div>

                {/* Bottom Progress Area */}
                <div className="w-full relative z-10 mt-auto">
                  <div className="flex items-center justify-between text-[11.5px] text-qz-text-muted mb-2 font-medium">
                    <span>已完成 {completedTasks}/{totalTasks} 任务</span>
                    <span className={clsx("font-bold", goal.status === "done" ? "text-slate-500" : "text-qz-text-strong dark:text-qz-text-dark")}>
                      {Math.round(goal.progress * 100)}%
                    </span>
                  </div>
                  <div className={clsx("h-1.5 rounded-full overflow-hidden w-full", style.progressBarBg)}>
                    <div 
                      className={clsx("h-full rounded-full transition-all duration-500 ease-out", style.progressBarFill)} 
                      style={{ width: `${goal.progress * 100}%` }} 
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Goal Workspace */}
        {selectedGoal && (
          <div className="bg-white dark:bg-qz-card-dark border border-[#EFEDE8] dark:border-white/5 rounded-qz shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
            
            {/* Dashboard Banner Header */}
            <div className={clsx(
              "px-8 py-6 border-b border-qz-divider dark:border-qz-divider-dark flex flex-col md:flex-row md:items-center justify-between gap-6",
              getSubjectStyle(selectedGoal.subject, selectedGoal.status, true).cardBg
            )}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-qz-card-dark border border-black/5 dark:border-white/5 rounded-qz shadow-sm shrink-0">
                  <Target size={24} className="text-qz-primary dark:text-qz-light" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-[26px] text-qz-text-strong dark:text-qz-text-dark font-semibold leading-tight">
                      {selectedGoal.title}
                    </h2>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-qz-primary/10 text-qz-primary font-bold dark:bg-qz-primary/20 dark:text-qz-light">
                      {selectedGoal.subject}
                    </span>
                  </div>
                  <p className="text-[13px] text-qz-text-muted mt-1.5 max-w-2xl leading-relaxed">
                    {selectedGoal.description}
                  </p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 md:min-w-[340px]">
                <div className="bg-white/80 dark:bg-qz-card-dark/60 border border-black/5 dark:border-white/5 p-3 rounded-qz text-center shadow-sm">
                  <div className="text-[11px] text-qz-text-muted font-medium mb-0.5">总进度</div>
                  <div className="text-[18px] font-bold text-qz-primary dark:text-qz-light">{selectedGoalStats.ratio}%</div>
                </div>
                <div className="bg-white/80 dark:bg-qz-card-dark/60 border border-black/5 dark:border-white/5 p-3 rounded-qz text-center shadow-sm">
                  <div className="text-[11px] text-qz-text-muted font-medium mb-0.5">预计用时</div>
                  <div className="text-[18px] font-bold text-qz-text-strong dark:text-qz-text-dark flex items-center justify-center gap-1">
                    <Clock size={14} className="text-qz-text-muted" />
                    <span>{selectedGoalStats.time}m</span>
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-qz-card-dark/60 border border-black/5 dark:border-white/5 p-3 rounded-qz text-center shadow-sm">
                  <div className="text-[11px] text-qz-text-muted font-medium mb-0.5">里程碑</div>
                  <div className="text-[18px] font-bold text-qz-text-strong dark:text-qz-text-dark">{selectedGoalStats.completedMilestones}/{selectedGoalStats.totalMilestones}</div>
                </div>
              </div>
            </div>

            {/* Milestones Vertical Timeline Section */}
            <div className="p-8 relative">

              <div className="space-y-6">
                {selectedGoal.milestones.map((milestone, mIndex) => {
                  const isExpanded = isMilestoneExpanded(milestone.id);
                  const isCompleted = milestone.tasks.every(t => t.done);
                  const totalTasks = milestone.tasks.length;
                  const completedTasks = milestone.tasks.filter(t => t.done).length;
                  const isLast = mIndex === selectedGoal.milestones.length - 1;
                  
                  return (
                    <div key={milestone.id} className="relative sm:pl-12 pl-12">
                      
                      {/* Timeline Connector Line Segment */}
                      {!isLast && (
                        <div className="absolute left-[19px] top-[38px] bottom-[-30px] w-0.5 bg-qz-divider dark:bg-qz-divider-dark hidden sm:block" />
                      )}

                      {/* Timeline Node Icon */}
                      <div className={clsx(
                        "absolute left-[8px] top-[14px] z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 hidden sm:flex",
                        isCompleted 
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.35)]" 
                          : completedTasks > 0
                          ? "bg-qz-primary border-qz-primary text-white shadow-[0_0_8px_rgba(45,122,107,0.35)] animate-pulse" 
                          : "bg-white dark:bg-qz-card-dark border-qz-divider dark:border-qz-divider-dark text-qz-text-muted"
                      )}>
                        {isCompleted ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          <div className={clsx("w-1.5 h-1.5 rounded-full", completedTasks > 0 ? "bg-white" : "bg-qz-text-muted/55")} />
                        )}
                      </div>

                      {/* Milestone Block Container */}
                      <div className="border border-black/5 dark:border-white/5 rounded-qz overflow-hidden bg-black/[0.005] hover:bg-black/[0.015] dark:bg-white/[0.005] dark:hover:bg-white/[0.015] transition-all duration-300 shadow-sm">
                        
                        {/* Interactive Collapse Header */}
                        <button
                          type="button"
                          onClick={() => toggleMilestone(milestone.id)}
                          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors duration-150 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-qz-text-muted shrink-0 text-[12px] font-bold font-serif opacity-75">
                              阶段 {mIndex + 1}
                            </span>
                            <h4 className="font-serif text-[15px] font-bold text-qz-text-strong dark:text-qz-text-dark truncate">
                              {milestone.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {/* Milestone progress tags */}
                            <span className={clsx(
                              "text-[11.5px] px-2.5 py-0.5 rounded-full font-semibold border",
                              isCompleted 
                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-500/20" 
                                : completedTasks > 0
                                ? "bg-qz-primary/10 text-qz-primary dark:bg-qz-primary/20 dark:text-qz-light border-qz-primary/20"
                                : "bg-black/5 text-qz-text-muted dark:bg-white/5 border-transparent"
                            )}>
                              {completedTasks}/{totalTasks}
                            </span>
                            
                            <div className="text-qz-text-muted transition-transform duration-300">
                              {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                            </div>
                          </div>
                        </button>

                        {/* Expandable Task List Body */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-1 border-t border-qz-divider/50 dark:border-qz-divider-dark/50 bg-white/40 dark:bg-qz-card-dark/20 space-y-3.5 transition-all duration-300">
                            {milestone.tasks.length === 0 ? (
                              <div className="text-[12px] text-qz-text-muted py-3 text-center italic">暂无任务</div>
                            ) : (
                              milestone.tasks.map((task) => (
                                <div 
                                  key={task.id} 
                                  className={clsx(
                                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-qz px-4 py-3.5 transition-all duration-300 group hover:shadow-md",
                                    task.done 
                                      ? "bg-slate-50/50 dark:bg-zinc-900/10 border-[#EFEDE8]/80 dark:border-zinc-800/40 opacity-75 hover:opacity-90" 
                                      : "bg-white dark:bg-qz-card-dark border-[#EFEDE8] dark:border-white/5 hover:border-qz-primary/30 dark:hover:border-qz-primary/20"
                                  )}
                                >
                                  {/* Task Info Left Block */}
                                  <div className="flex items-start gap-3.5 min-w-0">
                                    {/* Styled Task Category Square */}
                                    <div className={clsx(
                                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300",
                                      getTaskIconBg(task.title, task.meta)
                                    )}>
                                      {getTaskIcon(task.title, task.meta)}
                                    </div>
                                    
                                    <div className="min-w-0">
                                      <h5 className={clsx(
                                        "text-[13.5px] font-medium leading-normal text-qz-text-strong dark:text-qz-text-dark transition-all duration-300",
                                        task.done && "line-through text-qz-text-muted/65"
                                      )}>
                                        {task.title}
                                      </h5>
                                      <div className="text-[11.5px] text-qz-text-muted mt-1.5 flex items-center gap-3.5 flex-wrap">
                                        <span className="flex items-center gap-1 font-medium">
                                          <Clock size={12} className="opacity-70" />
                                          {task.meta}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Buttons Right Block */}
                                  <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 border-t sm:border-t-0 border-qz-divider dark:border-qz-divider-dark pt-3 sm:pt-0">
                                    {task.done ? (
                                      <span className="text-[11.5px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
                                        <CheckCircle2 size={13} />
                                        <span>已完成</span>
                                      </span>
                                    ) : (
                                      <span className="text-[11.5px] px-3 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 flex items-center gap-1 font-medium">
                                        <span>待学习</span>
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => navigate("/study", { state: { source: "goal", taskId: task.id } })}
                                      className={clsx(
                                        "qz-btn-secondary text-[12px] px-4 py-1.5 rounded-full font-bold group flex items-center gap-1.5 shrink-0 transition-all duration-300",
                                        task.done && "opacity-80 hover:opacity-100"
                                      )}
                                    >
                                      <span>去学习</span>
                                      <ArrowRight size={13} className="opacity-70 group-hover:translate-x-0.5 transition-transform duration-200" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

