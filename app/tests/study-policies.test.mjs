import test from "node:test";
import assert from "node:assert/strict";

import {
  inferLearnerLevel,
  PRACTICE_COUNT_BY_DIFFICULTY,
} from "../src/lib/study/adaptive.ts";
import {
  isNonLearningChat,
  shouldSearchKnowledgeBase,
} from "../src/lib/study/intent.ts";
import {
  canAutoOpenPanel,
  getStudySessionStatus,
  shouldAllowLearningProgress,
} from "../src/lib/study/session-policy.ts";

function events(type, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${type}-${index}`,
    type,
  }));
}

test("adaptive difficulty starts at 基础 and uses 3 questions", () => {
  const level = inferLearnerLevel([]);
  assert.equal(level.difficulty, "基础");
  assert.equal(level.completedPractice, 0);
  assert.equal(PRACTICE_COUNT_BY_DIFFICULTY[level.difficulty], 3);
});

test("adaptive difficulty upgrades to 进阶 after two completed practices", () => {
  const level = inferLearnerLevel([
    ...events("practice-generated", 2),
    ...events("practice-completed", 2),
  ]);
  assert.equal(level.difficulty, "进阶");
  assert.equal(level.completedPractice, 2);
  assert.equal(PRACTICE_COUNT_BY_DIFFICULTY[level.difficulty], 4);
});

test("adaptive difficulty upgrades to 进阶 after sustained asking", () => {
  const level = inferLearnerLevel(events("ask", 12));
  assert.equal(level.difficulty, "进阶");
});

test("adaptive difficulty reaches 综合 at six completions and 60% completion ratio", () => {
  const level = inferLearnerLevel([
    ...events("practice-generated", 10),
    ...events("practice-completed", 6),
  ]);
  assert.equal(level.difficulty, "综合");
  assert.equal(PRACTICE_COUNT_BY_DIFFICULTY[level.difficulty], 5);
});

test("adaptive difficulty stays 进阶 when completion ratio is below 60%", () => {
  const level = inferLearnerLevel([
    ...events("practice-generated", 11),
    ...events("practice-completed", 6),
  ]);
  assert.equal(level.difficulty, "进阶");
});

test("non-learning chat bypasses knowledge-base retrieval", () => {
  for (const query of ["", "你好", "Hello!", "你是谁？", "介绍一下你"]) {
    assert.equal(isNonLearningChat(query), true, query);
    assert.equal(shouldSearchKnowledgeBase(query), false, query);
  }
});

test("learning questions still search the knowledge base", () => {
  for (const query of ["解释一下闭包", "什么是牛顿第二定律？", "帮我复习英语时态"]) {
    assert.equal(isNonLearningChat(query), false, query);
    assert.equal(shouldSearchKnowledgeBase(query), true, query);
  }
});

test("session status prioritizes loading and error before conversation state", () => {
  const userMessages = [{ id: "u1", role: "user", content: "hello" }];
  assert.equal(
    getStudySessionStatus({
      isFreeConversation: true,
      context: null,
      messages: userMessages,
      loading: true,
      hasError: true,
    }),
    "loading"
  );
  assert.equal(
    getStudySessionStatus({
      isFreeConversation: true,
      context: null,
      messages: userMessages,
      loading: false,
      hasError: true,
    }),
    "error"
  );
});

test("session status distinguishes chatting, contextual-ready, and empty-free", () => {
  assert.equal(
    getStudySessionStatus({
      isFreeConversation: true,
      context: null,
      messages: [{ id: "u1", role: "user", content: "学习" }],
      loading: false,
    }),
    "chatting"
  );
  assert.equal(
    getStudySessionStatus({
      isFreeConversation: false,
      context: { source: "goal", taskId: "task-1" },
      messages: [],
      loading: false,
    }),
    "contextual-ready"
  );
  assert.equal(
    getStudySessionStatus({
      isFreeConversation: true,
      context: null,
      messages: [],
      loading: false,
    }),
    "empty-free"
  );
});

test("auto-open policy respects global and per-panel settings", () => {
  const base = {
    autoOpenStudyPanels: true,
    autoStartPomodoro: true,
    autoAppendNote: true,
  };

  assert.equal(canAutoOpenPanel("resource", base), true);
  assert.equal(canAutoOpenPanel("graph", base), true);
  assert.equal(canAutoOpenPanel("pomodoro", { ...base, autoStartPomodoro: false }), false);
  assert.equal(canAutoOpenPanel("note", { ...base, autoAppendNote: false }), false);
  assert.equal(canAutoOpenPanel("resource", { ...base, autoOpenStudyPanels: false }), false);
});

test("learning progress requires a task or graph node context", () => {
  assert.equal(shouldAllowLearningProgress(null), false);
  assert.equal(shouldAllowLearningProgress({ source: "library", resourceId: "r1" }), false);
  assert.equal(shouldAllowLearningProgress({ source: "goal", taskId: "t1" }), true);
  assert.equal(shouldAllowLearningProgress({ source: "graph", nodeId: "n1" }), true);
});
