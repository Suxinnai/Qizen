import { BookMarked, ExternalLink, Search } from "lucide-react";
import { PracticePanel } from "../PracticePanel";
import { scoreLabel } from "../../../lib/study/rag-policy";
import { loadAppData, type LibraryItem } from "../../../lib/storage";
import type { LibraryRagResult, RagPracticeSet } from "../../../lib/rag";
import type { StudyResourceLead } from "../../../lib/study/types";

export function ResourcePanel({
  selectedResource,
  latestRag,
  resourceLeads,
  practiceSet,
  practiceHint,
  onGeneratePractice,
  onCompletePractice,
  onSelectResource,
}: {
  selectedResource?: LibraryItem;
  latestRag: LibraryRagResult | null;
  resourceLeads?: StudyResourceLead[];
  practiceSet: RagPracticeSet | null;
  practiceHint: string;
  onGeneratePractice: () => void;
  onCompletePractice: () => void;
  onSelectResource?: (id: string | null) => void;
}) {
  const data = loadAppData();
  const otherDocs = data.libraryItems
    .filter((doc) => doc.id !== selectedResource?.id)
    .slice(0, 3);

  return (
    <div className="space-y-4 select-none">
      {resourceLeads?.length ? (
        <div className="rounded-[16px] border border-qz-primary/15 bg-white/75 dark:bg-white/[0.03] px-4 py-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-qz-primary mb-3">
            <Search size={13} />
            <span>Agent 找到的学习资源</span>
          </div>
          <div className="space-y-2">
            {resourceLeads.map((lead) => (
              <a
                key={lead.id}
                href={lead.url ?? "#"}
                onClick={(event) => {
                  if (!lead.url) event.preventDefault();
                }}
                className="block rounded-[12px] border border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-black/10 px-3 py-2.5 hover:border-qz-primary/25 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-qz-text-strong dark:text-qz-text-dark leading-5">
                      {lead.title}
                    </div>
                    <div className="text-[10.5px] text-qz-text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>{lead.source}</span>
                      <span className="opacity-50">·</span>
                      <span>{lead.type}</span>
                      <span className="opacity-50">·</span>
                      <span className={lead.live ? "text-qz-primary font-semibold" : "text-qz-text-muted"}>
                        {lead.live ? "实时结果" : lead.type === "local" ? "本地依据" : "搜索入口"}
                      </span>
                    </div>
                  </div>
                  {lead.url ? <ExternalLink size={12} className="text-qz-text-muted mt-0.5 shrink-0" /> : null}
                </div>
                <div className="text-[11px] leading-5 text-qz-text-muted mt-2">{lead.reason}</div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {selectedResource ? (
        <div className="rounded-[16px] border border-qz-primary/15 bg-qz-primary/6 px-4 py-4 relative group">
          <div className="text-[11px] text-qz-primary font-medium mb-1">当前资料</div>
          <div className="text-[14px] font-medium text-qz-text-strong dark:text-qz-text-dark">{selectedResource.title}</div>
          <div className="text-[11px] text-qz-text-muted mt-1 leading-6">{selectedResource.summary}</div>
          <div className="mt-3 text-[11px] text-qz-text-muted">
            重点：{selectedResource.highlights.length > 0 ? selectedResource.highlights.join("；") : "暂无"}
          </div>
          {onSelectResource && (
            <button
              type="button"
              onClick={() => onSelectResource(null)}
              className="absolute right-3.5 top-3.5 text-[10px] px-2 py-0.5 rounded bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-qz-text-muted opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              title="解除绑定，返回自由对话"
            >
              解除绑定
            </button>
          )}
        </div>
      ) : null}

      {latestRag ? (
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-[12px] text-qz-text-muted">本次检索命中</div>
            <button
              type="button"
              onClick={onGeneratePractice}
              className="text-[11px] px-2.5 py-1 rounded-full bg-qz-primary/10 text-qz-primary hover:bg-qz-primary/15 transition-colors cursor-pointer font-bold"
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

      {/* 推荐资料 */}
      <div>
        <div className="text-[12px] font-semibold text-qz-text-muted mb-2">推荐补充资源</div>
        <ul className="space-y-2">
          {otherDocs.length > 0 ? (
            otherDocs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelectResource?.(doc.id)}
                  className="w-full text-left rounded-[12px] p-3 hover:bg-qz-primary/5 dark:hover:bg-white/[0.03] border border-transparent hover:border-qz-primary/20 transition-all group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-qz-primary/10 flex items-center justify-center shrink-0 text-qz-primary group-hover:bg-qz-primary group-hover:text-white transition-colors">
                      <BookMarked size={12} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-qz-text-strong dark:text-qz-text-dark leading-[1.5] group-hover:text-qz-primary transition-colors">{doc.title}</div>
                      <div className="text-[11px] text-qz-text-muted mt-1 flex items-center gap-2">
                        <span>{doc.type}</span>
                        <span className="opacity-50">·</span>
                        <span>{doc.course}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))
          ) : (
            <li className="rounded-[12px] border border-dashed border-black/[0.06] dark:border-white/[0.08] px-3 py-4 text-[12px] leading-6 text-qz-text-muted">
              暂无其它资料。上传更多资料后会在这里出现可切换的真实资源。
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
