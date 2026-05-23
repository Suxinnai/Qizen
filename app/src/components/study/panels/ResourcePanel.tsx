import { BookMarked } from "lucide-react";
import { PracticePanel } from "../PracticePanel";
import { scoreLabel } from "../../../lib/study/rag-policy";
import type { LibraryItem } from "../../../lib/storage";
import type { LibraryRagResult, RagPracticeSet } from "../../../lib/rag";

const RESOURCES = [
  { id: "res-1", title: "3Blue1Brown：导数与变化率直觉", type: "视频", duration: "12 分钟" },
  { id: "res-2", title: "MIT 单变量微积分课程节选", type: "课程", duration: "20 分钟" },
  { id: "res-3", title: "用开车理解中值定理的小论文", type: "文章", duration: "5 分钟" },
];

export function ResourcePanel({
  selectedResource,
  latestRag,
  practiceSet,
  practiceHint,
  onGeneratePractice,
  onCompletePractice,
}: {
  selectedResource?: LibraryItem;
  latestRag: LibraryRagResult | null;
  practiceSet: RagPracticeSet | null;
  practiceHint: string;
  onGeneratePractice: () => void;
  onCompletePractice: () => void;
}) {
  return (
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
              onClick={onGeneratePractice}
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
                  <span className="text-[10px] px-2 py-1 rounded-full bg-qz-primary/10 text-qz-primary">{scoreLabel(match.score)}</span>
                </div>
                <div className="mt-2 text-[11px] text-qz-text-muted leading-6">命中原因：{match.reasonDetails.join("；") || "关键词命中"}</div>
                <div className="mt-2 text-[11px] text-qz-text-muted leading-6 line-clamp-4">命中片段：{match.matchedSnippet || match.matchedSummary}</div>
                <div className="mt-2 text-[11px] text-qz-text-muted leading-6 line-clamp-3">
                  命中重点：{match.matchedHighlights.length > 0 ? match.matchedHighlights.join("；") : "暂无明确重点"}
                </div>
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

      <PracticePanel practice={practiceSet} onComplete={onCompletePractice} />

      <div>
        <div className="text-[12px] text-qz-text-muted mb-2">推荐补充资源</div>
        <ul className="space-y-2">
          {RESOURCES.map((resource) => (
            <li key={resource.id}>
              <button type="button" className="w-full text-left rounded-[12px] p-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors group">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-6 h-6 rounded-full bg-qz-primary/10 flex items-center justify-center shrink-0 text-qz-primary">
                    <BookMarked size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark leading-[1.5]">{resource.title}</div>
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
  );
}

