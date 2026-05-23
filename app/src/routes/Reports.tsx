import { useMemo } from "react";
import { BarChart3, BookMarked, Brain, CalendarDays, MessageSquareText, RotateCcw, Sparkles, TrendingUp } from "lucide-react";

import { loadAppData } from "../lib/storage";

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof BarChart3 }) {
  return (
    <div className="qz-card !p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-qz-text-muted">{label}</div>
        <Icon size={16} className="text-qz-primary" />
      </div>
      <div className="font-serif text-[32px] text-qz-primary">{value}</div>
    </div>
  );
}

/** 纯 CSS 柱状图：最近 7 天学习时间 */
function WeeklyBarChart({ dailyMinutes }: { dailyMinutes: number[] }) {
  const last7 = dailyMinutes.slice(-7);
  const max = Math.max(...last7, 1);
  const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

  // 根据数组长度计算起始星期标签
  const todayDow = new Date().getDay(); // 0=Sun
  const startIndex = ((todayDow - last7.length % 7 + 7) % 7);

  return (
    <div className="qz-card">
      <div className="flex items-center gap-2 mb-4 text-qz-primary">
        <CalendarDays size={17} />
        <h2 className="font-serif text-[22px]">最近 7 天学习时间</h2>
      </div>
      <div className="flex items-end gap-3 h-[160px]">
        {last7.map((min, i) => {
          const ratio = min / max;
          const isToday = i === last7.length - 1;
          const dayIndex = (startIndex + i) % 7;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="text-[11px] text-qz-text-muted font-medium">{min}m</div>
              <div className="w-full relative" style={{ height: "120px" }}>
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500"
                  style={{
                    height: `${Math.max(ratio * 100, 4)}%`,
                    background: isToday
                      ? "linear-gradient(180deg, #2D7A6B 0%, #5BA593 100%)"
                      : ratio > 0.7
                      ? "#5BA593"
                      : ratio > 0.4
                      ? "rgba(91,165,147,0.6)"
                      : "rgba(91,165,147,0.3)",
                  }}
                />
              </div>
              <div className={`text-[11px] ${isToday ? "text-qz-primary font-medium" : "text-qz-text-muted"}`}>
                {dayLabels[dayIndex]}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[11px] text-qz-text-muted text-right">
        7 天平均 {Math.round(last7.reduce((a, b) => a + b, 0) / last7.length)} 分钟/天
      </div>
    </div>
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

  return (
    <div className="qz-card">
      <div className="flex items-center gap-2 mb-4 text-qz-primary">
        <BookMarked size={17} />
        <h2 className="font-serif text-[22px]">提问分布 Top 5</h2>
      </div>
      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map(([title, count], i) => (
            <div key={title}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] text-qz-text-strong dark:text-qz-text-dark truncate max-w-[70%]">
                  {i + 1}. {title}
                </span>
                <span className="text-[12px] text-qz-primary font-medium">{count} 次</span>
              </div>
              <div className="h-2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    background: "linear-gradient(90deg, #2D7A6B, #5BA593)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[13px] text-qz-text-muted">暂无资料命中记录，提问后会自动统计。</div>
      )}
    </div>
  );
}

/** 练习统计 */
function PracticeStatsCard({ events, practiceSets }: { events: { type: string }[]; practiceSets: { status: string }[] }) {
  const generated = events.filter((e) => e.type === "practice-generated").length + practiceSets.length;
  const completed = practiceSets.filter((p) => p.status === "completed").length;

  return (
    <div className="qz-card">
      <div className="flex items-center gap-2 mb-4 text-qz-primary">
        <Sparkles size={17} />
        <h2 className="font-serif text-[22px]">练习统计</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[18px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-4 text-center">
          <div className="text-[11px] text-qz-text-muted mb-1">已生成</div>
          <div className="font-serif text-[30px] text-qz-primary">{generated}</div>
          <div className="text-[11px] text-qz-text-muted">套练习</div>
        </div>
        <div className="rounded-[18px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-4 text-center">
          <div className="text-[11px] text-qz-text-muted mb-1">已完成</div>
          <div className="font-serif text-[30px] text-qz-mastered">{completed}</div>
          <div className="text-[11px] text-qz-text-muted">套练习</div>
        </div>
      </div>
      {generated > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-qz-text-muted">完成率</span>
            <span className="text-[12px] text-qz-primary font-medium">{Math.round((completed / generated) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-qz-mastered transition-all duration-500"
              style={{ width: `${(completed / generated) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 事件时间线 */
function EventTimeline({ events }: { events: { id: string; type: string; recordedAt: string; question: string; hitResourceTitles: string[] }[] }) {
  const recent = events.slice(-10).reverse();

  const typeLabel: Record<string, string> = {
    ask: "提问",
    "practice-generated": "生成练习",
    "practice-completed": "完成练习",
    "progress-updated": "进度更新",
  };

  const typeColor: Record<string, string> = {
    ask: "bg-qz-primary",
    "practice-generated": "bg-qz-info",
    "practice-completed": "bg-qz-mastered",
    "progress-updated": "bg-qz-learning",
  };

  return (
    <div className="qz-card">
      <div className="flex items-center gap-2 mb-4 text-qz-primary">
        <TrendingUp size={17} />
        <h2 className="font-serif text-[22px]">事件时间线</h2>
      </div>
      {recent.length > 0 ? (
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
          <div className="space-y-4">
            {recent.map((event) => (
              <div key={event.id} className="relative">
                <div className={`absolute left-[-13px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-qz-card-dark ${typeColor[event.type] ?? "bg-qz-text-muted"}`} />
                <div className="rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-qz-primary/10 text-qz-primary">
                      {typeLabel[event.type] ?? event.type}
                    </span>
                    <span className="text-[11px] text-qz-text-muted">
                      {new Date(event.recordedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark leading-6 truncate">
                    {event.question}
                  </div>
                  {event.hitResourceTitles.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {event.hitResourceTitles.map((title) => (
                        <span key={title} className="text-[10px] px-1.5 py-0.5 rounded bg-qz-light/20 text-qz-text-muted">
                          {title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[13px] text-qz-text-muted">还没有学习事件记录。</div>
      )}
    </div>
  );
}

export default function Reports() {
  const data = useMemo(() => loadAppData(), []);
  const events = data.studyRecord.events;
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => event.recordedAt.slice(0, 10) === today);
  const askEvents = events.filter((event) => event.type === "ask");
  const practiceEvents = events.filter((event) => event.generatedPractice || event.type === "practice-generated");
  const fallbackEvents = events.filter((event) => event.llm.usedFallback);
  const hitEvents = events.filter((event) => event.hitResourceTitles.length > 0);
  const recentQuestions = askEvents.slice(-8).reverse();
  const recentHitTitles = Array.from(new Set(events.flatMap((event) => event.hitResourceTitles))).slice(-8).reverse();

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-[1180px] mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-[34px] text-qz-primary mb-2">学习报告</h1>
          <p className="font-serif italic text-[14px] text-qz-text-muted">把学习过程看清楚，才知道下一步怎么走</p>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          <StatCard label="今日提问" value={todayEvents.filter((event) => event.type === "ask").length} icon={MessageSquareText} />
          <StatCard label="学习交互" value={events.length} icon={BarChart3} />
          <StatCard label="资料命中" value={hitEvents.length} icon={BookMarked} />
          <StatCard label="Fallback" value={fallbackEvents.length} icon={RotateCcw} />
          <StatCard label="练习生成" value={practiceEvents.length} icon={Sparkles} />
        </div>

        {/* 图表区域 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <WeeklyBarChart dailyMinutes={data.studyStats.dailyMinutes} />
          <TopResourcesChart events={events} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <PracticeStatsCard events={events} practiceSets={data.practiceSets} />
          <EventTimeline events={events} />
        </div>

        {/* 原有区域保留 */}
        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
          <div className="qz-card">
            <div className="flex items-center gap-2 mb-4 text-qz-primary">
              <MessageSquareText size={17} />
              <h2 className="font-serif text-[22px]">最近问题</h2>
            </div>
            {recentQuestions.length > 0 ? (
              <div className="space-y-3">
                {recentQuestions.map((event) => (
                  <div key={event.id} className="rounded-[16px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                    <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark leading-6">{event.question}</div>
                    <div className="mt-2 text-[11px] text-qz-text-muted">
                      {new Date(event.recordedAt).toLocaleString()} · {event.llm.providerLabel} · {event.llm.usedFallback ? "fallback" : "真实模型"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-qz-text-muted">还没有学习问答记录。</div>
            )}
          </div>

          <div className="qz-card">
            <div className="flex items-center gap-2 mb-4 text-qz-primary">
              <Brain size={17} />
              <h2 className="font-serif text-[22px]">最近命中资料</h2>
            </div>
            {recentHitTitles.length > 0 ? (
              <div className="space-y-3">
                {recentHitTitles.map((title) => (
                  <div key={title} className="rounded-[16px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3 text-[13px] text-qz-text-strong dark:text-qz-text-dark">
                    {title}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-qz-text-muted leading-7">
                暂时还没有稳定命中的资料。等你在学习空间里围绕资料提问后，这里会显示最近依据来源。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
