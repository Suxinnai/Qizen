import { useState } from "react";
import clsx from "clsx";
import type { RagPracticeSet } from "../../lib/rag";
import type { PracticeQuestionEvidence } from "../../lib/storage";

function getEvidenceTone(confidence?: PracticeQuestionEvidence["confidence"]) {
  if (confidence === "strong") {
    return {
      label: "证据较强",
      chipClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      panelClass: "border-emerald-500/15 bg-emerald-500/5",
      hint: "该题可直接回看命中片段与重点。",
    };
  }
  if (confidence === "medium") {
    return {
      label: "证据一般",
      chipClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      panelClass: "border-amber-500/15 bg-amber-500/5",
      hint: "建议结合原文再确认一遍。",
    };
  }
  return {
    label: "证据较弱",
    chipClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    panelClass: "border-rose-500/15 bg-rose-500/5",
    hint: "该题的依据较弱，仅供参考。",
  };
}

export function PracticeEvidencePanel({ evidence }: { evidence?: PracticeQuestionEvidence }) {
  if (!evidence) {
    return (
      <div className="mt-3 rounded-[12px] border border-rose-500/15 bg-rose-500/5 px-3 py-3 text-[11px] text-qz-text-muted leading-6">
        这道题暂时没有可展示的证据回链，建议谨慎参考。
      </div>
    );
  }

  const tone = getEvidenceTone(evidence.confidence);
  const flags = [
    evidence.isTopHit ? "来自 top hit" : "",
    evidence.isCurrentResource ? "来自当前资料" : "",
    evidence.isCurrentNodeLinked ? "来自节点关联资料" : "",
  ].filter(Boolean);

  return (
    <div className={clsx("mt-3 rounded-[12px] border px-3 py-3 text-[11px] leading-6", tone.panelClass)}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={clsx("px-2 py-1 rounded-full text-[10px]", tone.chipClass)}>{tone.label}</span>
        {flags.map((flag) => (
          <span key={flag} className="px-2 py-1 rounded-full bg-white/75 dark:bg-black/10 text-qz-text-muted text-[10px]">
            {flag}
          </span>
        ))}
      </div>
      <div className="text-qz-text-muted">
        <span className="text-qz-text-strong dark:text-qz-text-dark">来源资料：</span>
        《{evidence.sourceTitle}》
      </div>
      <div className="mt-2 text-qz-text-muted">
        <span className="text-qz-text-strong dark:text-qz-text-dark">证据片段：</span>
        {evidence.sourceSnippet || "暂无可展示片段"}
      </div>
      <div className="mt-2 text-qz-text-muted">
        <span className="text-qz-text-strong dark:text-qz-text-dark">对应重点：</span>
        {evidence.sourceHighlights.length > 0 ? evidence.sourceHighlights.join("；") : "暂无明确重点"}
      </div>
      <div className="mt-2 text-qz-text-muted">
        <span className="text-qz-text-strong dark:text-qz-text-dark">命中原因：</span>
        {evidence.reasons && evidence.reasons.length > 0 ? evidence.reasons.join("；") : evidence.sourceReason || "关键词命中"}
      </div>
      <div className={clsx("mt-2", evidence.confidence === "weak" ? "text-rose-700 dark:text-rose-300" : "text-qz-text-muted")}>
        {tone.hint}
      </div>
    </div>
  );
}

export type PracticeVerdict = "对" | "部分" | "错";
export interface PracticeQuestionResult {
  verdict: PracticeVerdict;
  comment: string;
}

const VERDICT_WEIGHT: Record<PracticeVerdict, number> = { 对: 1, 部分: 0.5, 错: 0 };

function verdictChipClass(verdict: PracticeVerdict) {
  if (verdict === "对") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  if (verdict === "部分") return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
}

export function PracticePanel({
  practice,
  answers,
  results,
  isGrading,
  graded,
  selfAssessMode,
  gradeHint,
  onAnswerChange,
  onSubmitGrade,
  onSelfVerdict,
}: {
  practice: RagPracticeSet | null;
  answers: Record<string, string>;
  results: Record<string, PracticeQuestionResult> | null;
  isGrading: boolean;
  graded: boolean;
  selfAssessMode: boolean;
  gradeHint?: string;
  onAnswerChange: (id: string, value: string) => void;
  onSubmitGrade: () => void;
  onSelfVerdict: (id: string, verdict: PracticeVerdict) => void;
}) {
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<string[]>([]);

  if (!practice) return null;

  const scoreValue = graded && results
    ? practice.questions.reduce((sum, q) => sum + (results[q.id] ? VERDICT_WEIGHT[results[q.id].verdict] : 0), 0)
    : 0;
  const scoreText = Number.isInteger(scoreValue) ? `${scoreValue}` : scoreValue.toFixed(1);

  return (
    <div className="mt-4 rounded-[18px] border border-qz-primary/15 bg-qz-primary/6 px-4 py-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[12px] text-qz-primary font-medium">基于当前命中资料出题</div>
          <div className="text-[11px] text-qz-text-muted mt-0.5">
            主要依据《{practice.primaryTitle}》
            {practice.basedOnTitles.length > 1 ? `，并参考 ${practice.basedOnTitles.slice(1).join("、")}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {graded ? (
            <span className="text-[10px] px-2 py-1 rounded-full bg-qz-primary text-white font-bold">
              得分 {scoreText} / {practice.questions.length}
            </span>
          ) : null}
          <span className="text-[10px] px-2 py-1 rounded-full bg-qz-primary/10 text-qz-primary font-bold">
            {practice.difficulty}
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-white/80 dark:bg-black/15 text-qz-text-muted">
            {practice.questions.length} 题
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {practice.questions.map((question, index) => {
          const expanded = expandedQuestionIds.includes(question.id);
          const result = results?.[question.id];

          return (
            <div key={question.id} className="rounded-[14px] border border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-black/10 px-3.5 py-3">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-full bg-qz-primary/10 text-qz-primary">{question.type}</span>
                <span className="text-[11px] text-qz-text-muted">第 {index + 1} 题</span>
                {result ? (
                  <span className={clsx("text-[10px] px-2 py-1 rounded-full border font-bold", verdictChipClass(result.verdict))}>
                    {result.verdict}
                  </span>
                ) : null}
              </div>
              <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark leading-6">{question.prompt}</div>
              <div className="mt-2 text-[11px] text-qz-text-muted leading-6">提示：{question.answerHint}</div>

              {/* 答题输入 */}
              <textarea
                value={answers[question.id] ?? ""}
                onChange={(event) => onAnswerChange(question.id, event.target.value)}
                disabled={isGrading || graded}
                placeholder="在这里写下你的作答…"
                rows={2}
                className="mt-2.5 w-full rounded-[10px] border border-black/[0.08] dark:border-white/[0.1] bg-white/80 dark:bg-black/20 px-3 py-2 text-[12.5px] leading-6 outline-none focus:border-qz-primary/60 transition-colors resize-y disabled:opacity-70"
              />

              {/* 自评 chips（无模型降级） */}
              {selfAssessMode && !graded ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[11px] text-qz-text-muted">自评：</span>
                  {(["对", "部分", "错"] as PracticeVerdict[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => onSelfVerdict(question.id, v)}
                      className={clsx(
                        "text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
                        result?.verdict === v
                          ? verdictChipClass(v) + " font-bold"
                          : "border-black/[0.08] dark:border-white/[0.12] text-qz-text-muted hover:border-qz-primary/40"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* 批改意见 */}
              {result && result.comment ? (
                <div className="mt-2 text-[11.5px] leading-6 text-qz-text-muted">
                  <span className="text-qz-text-strong dark:text-qz-text-dark">批改：</span>
                  {result.comment}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  setExpandedQuestionIds((prev) =>
                    prev.includes(question.id) ? prev.filter((id) => id !== question.id) : [...prev, question.id]
                  )
                }
                className="mt-3 text-[11px] text-qz-primary hover:text-qz-dark transition-colors"
              >
                {expanded ? "收起依据" : "查看依据"}
              </button>
              {expanded ? <PracticeEvidencePanel evidence={question.evidence} /> : null}
            </div>
          );
        })}
      </div>

      {gradeHint ? (
        <div className="mt-3 text-[11px] text-qz-text-muted leading-6">{gradeHint}</div>
      ) : null}

      {!graded ? (
        <button
          type="button"
          onClick={onSubmitGrade}
          disabled={isGrading}
          className="mt-4 w-full h-9 rounded-full bg-qz-primary text-white text-[12px] hover:bg-qz-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGrading ? "批改中…" : selfAssessMode ? "记录自评结果" : "提交批改"}
        </button>
      ) : (
        <div className="mt-4 text-center text-[12px] text-qz-primary font-medium">
          本组已批改完成，得分 {scoreText} / {practice.questions.length}
        </div>
      )}
    </div>
  );
}
