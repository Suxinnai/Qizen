import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LibraryRagResult } from "../../lib/rag";
import { getStrongRag, scoreLabel, shouldDisplayRagEvidence } from "../../lib/study/rag-policy";
import { splitStudyParagraphs } from "../../lib/study/sanitize";

function MessageCitations({ rag }: { rag: LibraryRagResult }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const displayRag = getStrongRag(rag);
  if (!shouldDisplayRagEvidence(displayRag)) return null;

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="text-[11px] text-qz-text-muted mb-1.5">引用资料</div>
      {displayRag.results.map((match) => {
        const expanded = expandedIds.has(match.resource.id);
        const snippetSummary = match.matchedSnippet
          ? match.matchedSnippet.length <= 80
            ? match.matchedSnippet
            : match.matchedSnippet.slice(0, 77) + "..."
          : match.matchedSummary;

        return (
          <div
            key={match.resource.id}
            className="rounded-[12px] border border-qz-primary/10 bg-qz-primary/4 px-3 py-2.5"
          >
            <button
              type="button"
              onClick={() => toggleExpand(match.resource.id)}
              className="w-full flex items-start gap-2 text-left"
            >
              <span className="mt-0.5 shrink-0 text-qz-text-muted">
                {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-qz-text-strong dark:text-qz-text-dark truncate">
                    {match.resource.title}
                  </span>
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-qz-primary/10 text-qz-primary">
                    {scoreLabel(match.score)}
                  </span>
                </div>
                <div className="text-[11px] text-qz-text-muted mt-0.5 leading-5">
                  {snippetSummary}
                </div>
              </div>
            </button>

            {expanded ? (
              <div className="mt-2.5 pt-2.5 border-t border-qz-primary/8 space-y-2 text-[11px] text-qz-text-muted leading-5">
                {match.matchedSnippet ? (
                  <div>
                    <span className="text-qz-text-strong dark:text-qz-text-dark">命中片段：</span>
                    {match.matchedSnippet}
                  </div>
                ) : null}
                {match.matchedHighlights.length > 0 ? (
                  <div>
                    <span className="text-qz-text-strong dark:text-qz-text-dark">命中重点：</span>
                    {match.matchedHighlights.join("；")}
                  </div>
                ) : null}
                <div>
                  <span className="text-qz-text-strong dark:text-qz-text-dark">命中原因：</span>
                  {match.reasonDetails.length > 0 ? match.reasonDetails.join("；") : match.reasons.join(" · ") || "关键词命中"}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function MessageBody({ content, rag }: { content: string; rag?: LibraryRagResult }) {
  const paragraphs = splitStudyParagraphs(content);
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 8)}`} className="leading-[1.85]">
          {paragraph}
        </p>
      ))}
      {rag ? <MessageCitations rag={rag} /> : null}
    </div>
  );
}
