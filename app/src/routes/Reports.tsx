import { useMemo } from "react";
import { BarChart3, BookMarked, Brain, CheckCircle2, MessageSquareText, RotateCcw, Sparkles, Target } from "lucide-react";

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

function lastNDays(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

export default function Reports() {
  const data = useMemo(() => loadAppData(), []);
  const events = data.studyRecord.events;
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => event.recordedAt.slice(0, 10) === today);
  const askEvents = events.filter((event) => event.type === "ask");
  const practiceEvents = events.filter((event) => event.type === "practice-generated");
  const completedPracticeEvents = events.filter((event) => event.type === "practice-completed");
  const progressEvents = events.filter((event) => event.type === "progress-updated");
  const fallbackEvents = events.filter((event) => event.llm.usedFallback);
  const hitEvents = events.filter((event) => event.hitResourceTitles.length > 0);
  const recentQuestions = askEvents.slice(-8).reverse();
  const recentHitTitles = Array.from(new Set(events.flatMap((event) => event.hitResourceTitles))).slice(-8).reverse();
  const fallbackRate = askEvents.length ? Math.round((fallbackEvents.filter((event) => event.type === "ask").length / askEvents.length) * 100) : 0;
  const sevenDayBuckets = lastNDays(7).map((day) => ({
    day,
    asks: events.filter((event) => event.recordedAt.slice(0, 10) === day && event.type === "ask").length,
    hits: events.filter((event) => event.recordedAt.slice(0, 10) === day && event.hitResourceTitles.length > 0).length,
  }));
  const maxBucketValue = Math.max(1, ...sevenDayBuckets.flatMap((item) => [item.asks, item.hits]));
  const resourceFrequency = events
    .flatMap((event) => event.hitResourceTitles)
    .reduce<Record<string, number>>((acc, title) => {
      acc[title] = (acc[title] ?? 0) + 1;
      return acc;
    }, {});
  const rankedResources = Object.entries(resourceFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-[1180px] mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-[34px] text-qz-primary mb-2">学习报告</h1>
          <p className="font-serif italic text-[14px] text-qz-text-muted">把学习过程看清楚，才知道下一步怎么走</p>
        </div>

        <div className="grid md:grid-cols-6 gap-4">
          <StatCard label="今日提问" value={todayEvents.filter((event) => event.type === "ask").length} icon={MessageSquareText} />
          <StatCard label="学习交互" value={events.length} icon={BarChart3} />
          <StatCard label="资料命中" value={hitEvents.length} icon={BookMarked} />
          <StatCard label="Fallback 率" value={`${fallbackRate}%`} icon={RotateCcw} />
          <StatCard label="练习生成" value={practiceEvents.length} icon={Sparkles} />
          <StatCard label="进度记录" value={progressEvents.length} icon={Target} />
        </div>

        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
          <div className="qz-card">
            <div className="flex items-center gap-2 mb-4 text-qz-primary">
              <BarChart3 size={17} />
              <h2 className="font-serif text-[22px]">近 7 日学习走势</h2>
            </div>
            {events.length > 0 ? (
              <div className="space-y-3">
                {sevenDayBuckets.map((bucket) => (
                  <div key={bucket.day} className="grid grid-cols-[76px,1fr] gap-3 items-center">
                    <div className="text-[11px] text-qz-text-muted">{bucket.day.slice(5)}</div>
                    <div className="space-y-1.5">
                      <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-qz-primary" style={{ width: `${(bucket.asks / maxBucketValue) * 100}%` }} />
                      </div>
                      <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-qz-mastered" style={{ width: `${(bucket.hits / maxBucketValue) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-4 text-[11px] text-qz-text-muted pt-2">
                  <span>绿色：提问</span>
                  <span>掌握色：资料命中</span>
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-qz-text-muted leading-7">还没有学习事件，完成一次问答后这里会出现趋势。</div>
            )}
          </div>

          <div className="qz-card">
            <div className="flex items-center gap-2 mb-4 text-qz-primary">
              <CheckCircle2 size={17} />
              <h2 className="font-serif text-[22px]">练习与推进</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-4">
                <div className="text-[11px] text-qz-text-muted mb-1">练习完成</div>
                <div className="font-serif text-[28px] text-qz-primary">{completedPracticeEvents.length}</div>
              </div>
              <div className="rounded-[16px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-4">
                <div className="text-[11px] text-qz-text-muted mb-1">任务/节点推进</div>
                <div className="font-serif text-[28px] text-qz-primary">{progressEvents.filter((event) => event.progressAction !== "blocked").length}</div>
              </div>
            </div>
            <div className="mt-4 text-[12px] text-qz-text-muted leading-7">
              {completedPracticeEvents.length > 0
                ? `最近一次练习记录于 ${new Date(completedPracticeEvents[completedPracticeEvents.length - 1].recordedAt).toLocaleString()}。`
                : "完成 Study 里的练习后，这里会记录真实练习闭环。"}
            </div>
          </div>
        </div>

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
              <h2 className="font-serif text-[22px]">命中资料排行</h2>
            </div>
            {rankedResources.length > 0 ? (
              <div className="space-y-3">
                {rankedResources.map(([title, count]) => (
                  <div key={title} className="rounded-[16px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{title}</div>
                      <div className="text-[11px] text-qz-primary">{count} 次</div>
                    </div>
                  </div>
                ))}
                {recentHitTitles.length > 0 ? (
                  <div className="text-[11px] text-qz-text-muted pt-1">
                    最近命中：{recentHitTitles.slice(0, 3).join("、")}
                  </div>
                ) : null}
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
