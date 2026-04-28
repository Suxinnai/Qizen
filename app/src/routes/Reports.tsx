import { useMemo } from "react";
import { BarChart3, BookMarked, Brain, MessageSquareText, RotateCcw, Sparkles } from "lucide-react";

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
