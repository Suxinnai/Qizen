import test from "node:test";
import assert from "node:assert/strict";

import { deriveLearnerMemory } from "../src/lib/study/memory.ts";
import {
  collectHitResourceTitles,
  createEmptyRag,
  getStrongRag,
  isStrongRagMatch,
  scoreLabel,
  shouldDisplayRagEvidence,
} from "../src/lib/study/rag-policy.ts";
import { derivePracticeSummary } from "../src/lib/study/report-metrics.ts";

function studyEvent(overrides = {}) {
  return {
    id: `event-${Math.random()}`,
    type: "ask",
    recordedAt: "2026-08-21T08:00:00.000Z",
    question: "学习 TypeScript",
    resourceId: null,
    nodeId: null,
    taskId: null,
    hitResourceTitles: [],
    generatedPractice: false,
    llm: {
      usedRealModel: true,
      providerLabel: "OpenAI-compatible",
      usedFallback: false,
    },
    ...overrides,
  };
}

function ragMatch(score, title = "资料 A") {
  return {
    score,
    resource: { id: title, title },
    sourceSnippet: "snippet",
    sourceHighlights: [],
  };
}

test("rag score labels preserve the documented thresholds", () => {
  assert.equal(scoreLabel(9.99), "弱相关");
  assert.equal(scoreLabel(10), "中相关");
  assert.equal(scoreLabel(19.99), "中相关");
  assert.equal(scoreLabel(20), "高相关");
});

test("rag strong-match policy is slightly stricter after the top result", () => {
  assert.equal(isStrongRagMatch(ragMatch(10), 0), true);
  assert.equal(isStrongRagMatch(ragMatch(9.9), 0), false);
  assert.equal(isStrongRagMatch(ragMatch(11.9), 1), false);
  assert.equal(isStrongRagMatch(ragMatch(12), 1), true);
});

test("getStrongRag hides insufficient or weak evidence and keeps strong titles", () => {
  const insufficient = getStrongRag({
    query: "闭包",
    topK: 2,
    totalCandidates: 2,
    sufficient: false,
    results: [ragMatch(30)],
  });
  assert.deepEqual(insufficient, createEmptyRag("闭包"));
  assert.equal(shouldDisplayRagEvidence(insufficient), false);

  const filtered = getStrongRag({
    query: "闭包",
    topK: 3,
    totalCandidates: 3,
    sufficient: true,
    results: [ragMatch(15, "资料 A"), ragMatch(11, "资料 B"), ragMatch(12, "资料 C")],
  });
  assert.equal(filtered.sufficient, true);
  assert.deepEqual(collectHitResourceTitles(filtered), ["资料 A", "资料 C"]);
  assert.equal(shouldDisplayRagEvidence(filtered), true);
});

test("learner memory derives streak, active days, model ratio and preferred provider", () => {
  const data = {
    studyStats: { dailyMinutes: [25, 0, 10, 30] },
    studyRecord: {
      events: [
        studyEvent({ llm: { usedRealModel: true, providerLabel: "Provider A", usedFallback: false } }),
        studyEvent({ llm: { usedRealModel: true, providerLabel: "Provider A", usedFallback: false } }),
        studyEvent({ llm: { usedRealModel: false, providerLabel: "本地回答", usedFallback: true } }),
      ],
    },
  };

  const memory = deriveLearnerMemory(data);
  assert.equal(memory.streak.current, 2);
  assert.equal(memory.streak.longest, 2);
  assert.equal(memory.totalActiveDays, 3);
  assert.equal(memory.totalInteractions, 3);
  assert.equal(memory.realModelRatio, 2 / 3);
  assert.equal(memory.preferredProvider, "Provider A");
  assert.match(memory.streak.lastStudyDate ?? "", /^\d{4}-\d{2}-\d{2}$/);
});

test("learner memory prioritizes graded weak questions and repeated learning signals", () => {
  const data = {
    studyStats: { dailyMinutes: [] },
    studyRecord: {
      events: [
        studyEvent({
          recordedAt: "2026-08-19T08:00:00.000Z",
          question: "学习 TypeScript",
          hitResourceTitles: ["TS 手册"],
        }),
        studyEvent({
          recordedAt: "2026-08-20T08:00:00.000Z",
          question: "学习 TypeScript",
          hitResourceTitles: ["TS 手册"],
        }),
        studyEvent({
          type: "practice-completed",
          recordedAt: "2026-08-21T08:00:00.000Z",
          question: "TypeScript 练习",
          weakQuestionPrompts: ["简答：请解释 TypeScript 中 interface 与 type 的主要区别，并举例说明"],
        }),
      ],
    },
  };

  const memory = deriveLearnerMemory(data);
  assert.equal(memory.hasGradedWeakPoints, true);
  assert.equal(memory.weakPoints[0].kind, "practice");
  assert.equal(memory.weakPoints[0].occurrences, 1);
  assert.equal(memory.weakPoints.some((point) => point.key === "TS 手册" && point.occurrences === 2), true);
  assert.equal(memory.weakPoints.some((point) => point.kind === "topic" && point.occurrences === 2), true);
});

test("empty learner memory is stable", () => {
  const memory = deriveLearnerMemory({
    studyStats: { dailyMinutes: [] },
    studyRecord: { events: [] },
  });
  assert.equal(memory.streak.current, 0);
  assert.equal(memory.streak.longest, 0);
  assert.equal(memory.streak.lastStudyDate, null);
  assert.equal(memory.totalActiveDays, 0);
  assert.equal(memory.realModelRatio, 0);
  assert.equal(memory.preferredProvider, null);
  assert.deepEqual(memory.weakPoints, []);
  assert.equal(memory.hasGradedWeakPoints, false);
});

test("Reports practice summary does not double count modern completion data", () => {
  const summary = derivePracticeSummary(
    [
      { type: "practice-generated" },
      { type: "practice-generated" },
      { type: "practice-completed" },
    ],
    [{ status: "completed" }]
  );
  assert.deepEqual(summary, { generated: 2, completed: 1, percentage: 50 });
});

test("Reports practice summary uses completed sets only as a legacy fallback", () => {
  const summary = derivePracticeSummary(
    [{ type: "practice-generated" }, { type: "practice-generated" }],
    [{ status: "completed" }, { status: "completed" }]
  );
  assert.deepEqual(summary, { generated: 2, completed: 2, percentage: 100 });
});

test("Reports practice summary never exceeds 100 percent even for migrated incomplete histories", () => {
  const summary = derivePracticeSummary(
    [{ type: "practice-completed" }, { type: "practice-completed" }, { type: "practice-completed" }],
    []
  );
  assert.deepEqual(summary, { generated: 3, completed: 3, percentage: 100 });
});

test("Reports practice summary is zero-safe", () => {
  assert.deepEqual(derivePracticeSummary([], []), { generated: 0, completed: 0, percentage: 0 });
});
