import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_HISTORY_CHAR_BUDGET,
  buildConversationHistory,
  buildContextualUserQuery,
} from "../src/lib/study/conversation-context.ts";

test("conversation context keeps the most recent N user rounds in chronological order", () => {
  const history = buildConversationHistory(
    [
      { role: "user", content: "u1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "u2" },
      { role: "assistant", content: "a2-1" },
      { role: "assistant", content: "a2-2" },
      { role: "user", content: "u3" },
      { role: "assistant", content: "a3" },
    ],
    2
  );

  assert.deepEqual(history, [
    { role: "user", content: "u2" },
    { role: "assistant", content: "a2-1" },
    { role: "assistant", content: "a2-2" },
    { role: "user", content: "u3" },
    { role: "assistant", content: "a3" },
  ]);
});

test("conversation context returns empty history when rounds are disabled or no user turn exists", () => {
  assert.deepEqual(buildConversationHistory([{ role: "user", content: "hello" }], 0), []);
  assert.deepEqual(buildConversationHistory([{ role: "assistant", content: "hello" }], 10), []);
});

test("conversation context trims blank messages", () => {
  const history = buildConversationHistory(
    [
      { role: "user", content: "  topic  " },
      { role: "assistant", content: "   " },
      { role: "assistant", content: " answer " },
    ],
    1
  );
  assert.deepEqual(history, [
    { role: "user", content: "topic" },
    { role: "assistant", content: "answer" },
  ]);
});

test("conversation context applies the character budget from newest to oldest without orphan assistant messages", () => {
  const history = buildConversationHistory(
    [
      { role: "user", content: "old-user" },
      { role: "assistant", content: "old-assistant" },
      { role: "user", content: "new-user" },
      { role: "assistant", content: "new-answer" },
    ],
    2,
    "new-user".length + "new-answer".length
  );

  assert.deepEqual(history, [
    { role: "user", content: "new-user" },
    { role: "assistant", content: "new-answer" },
  ]);
});

test("conversation context compacts individual oversized messages before applying the total budget", () => {
  const oversized = "A".repeat(5_000);
  const history = buildConversationHistory(
    [
      { role: "user", content: "topic" },
      { role: "assistant", content: oversized },
    ],
    1,
    DEFAULT_HISTORY_CHAR_BUDGET
  );

  assert.equal(history.length, 2);
  assert.equal(history[1].content.length < oversized.length, true);
  assert.equal(history[1].content.includes("…"), true);
  assert.equal(history[1].content.length <= 3_000, true);
});

test("contextual query stays equal to the raw current question when there is no history", () => {
  assert.equal(buildContextualUserQuery("  当前问题  ", []), "当前问题");
});

test("contextual query labels historical roles and keeps the current question separate", () => {
  const query = buildContextualUserQuery("解释一下上面的第二点", [
    { role: "user", content: "先讲闭包" },
    { role: "assistant", content: "闭包会捕获词法作用域。" },
  ]);

  assert.match(query, /--- 最近对话历史 ---/);
  assert.match(query, /用户：先讲闭包/);
  assert.match(query, /助手：闭包会捕获词法作用域。/);
  assert.match(query, /--- 当前问题 ---\n解释一下上面的第二点$/);
  assert.match(query, /不要把历史内容当作资料库证据/);
});
