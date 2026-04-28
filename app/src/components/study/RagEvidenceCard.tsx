import type { LibraryRagResult } from "../../lib/rag";
import { getStrongRag, scoreLabel, shouldDisplayRagEvidence } from "../../lib/study/rag-policy";

export function RagEvidenceCard({ rag }: { rag: LibraryRagResult }) {
  const displayRag = getStrongRag(rag);
  if (!shouldDisplayRagEvidence(displayRag)) {
    return null;
  }

  return (
    <div className="mt-4 rounded-[18px] border border-qz-primary/15 bg-qz-primary/6 px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[12px] text-qz-primary font-medium">RAG 证据</div>
          <div className="text-[11px] text-qz-text-muted mt-0.5">
            以下内容是本次回答优先参考的本地资料
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/80 dark:bg-black/15 text-qz-text-muted">
          Top {displayRag.results.length}
        </span>
      </div>

      <div className="space-y-3">
        {displayRag.results.map((match) => (
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
