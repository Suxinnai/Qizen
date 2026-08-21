import test from "node:test";
import assert from "node:assert/strict";

import { verifyFreshSqliteShadowForCutover } from "../src/lib/persistence/sqlite-cutover-verify.ts";

function appData() {
  return {
    appState: { onboardingCompleted: true },
    learningProfile: null,
    settings: {
      username: "Cutover",
      pomodoroMinutes: 25,
      preferredStyle: "analogy",
      remindersEnabled: true,
      autoOpenStudyPanels: true,
      autoStartPomodoro: true,
      autoAppendNote: true,
      autoGenerateSessionTitle: true,
      autoSummarizeSessionNote: false,
      autoUpdateLearningProfile: true,
      requireTerminalConfirmation: "always",
      contextWindowRounds: 10,
      ragSimilarityThreshold: 0.75,
      searchCacheHours: 24,
      llm: {
        provider: "openai-compatible",
        apiKey: "must-not-reach-sqlite",
        model: "model",
        baseUrl: "https://example.test/v1",
      },
    },
    goals: [],
    notes: [
      {
        id: "note-1",
        title: "Note",
        topic: "topic",
        content: "content",
        aiKeyPoints: [],
        confusingPoints: [],
        updatedAt: "2026-08-21T00:00:00.000Z",
      },
    ],
    libraryItems: [],
    practiceSets: [],
    knowledgeGraph: { nodes: [], edges: [] },
    studyStats: { dailyMinutes: [0, 15] },
    studyRecord: { events: [] },
  };
}

function conversations() {
  return [
    {
      id: "conv-1",
      title: "Session",
      createdAt: "2026-08-21T01:00:00.000Z",
      updatedAt: "2026-08-21T01:01:00.000Z",
      isFreeConversation: true,
      context: null,
      selectedTaskId: "",
      teachingStyle: "analogy",
      noteDraft: "",
      messages: [{ id: "m1", role: "user", content: "hello" }],
    },
  ];
}

function matchingSnapshot(data, items) {
  const clonedData = structuredClone(data);
  clonedData.settings.llm.apiKey = "";
  return {
    schemaVersion: 1,
    importedAt: "2026-08-21T02:00:00.000Z",
    data: clonedData,
    conversations: structuredClone(items),
    conversationState: {
      activeId: "conv-1",
      sidebarMode: "sessions",
      legacySchemaVersion: 2,
    },
  };
}

test("fresh cutover verification is unavailable when no SQLite bridge exists", async () => {
  let loaded = false;
  const result = await verifyFreshSqliteShadowForCutover({
    loadData: () => {
      loaded = true;
      return appData();
    },
  });

  assert.deepEqual(result, { kind: "unavailable" });
  assert.equal(loaded, false);
});

test("fresh cutover verification imports current legacy data before reading the snapshot", async () => {
  const data = appData();
  const items = conversations();
  const calls = [];
  let capturedBundle = null;

  const result = await verifyFreshSqliteShadowForCutover({
    database: {
      importBundle: async (bundle) => {
        calls.push("import");
        capturedBundle = bundle;
        return {};
      },
      snapshot: async () => {
        calls.push("snapshot");
        return matchingSnapshot(data, items);
      },
    },
    loadData: () => data,
    listConversations: () => items,
    getActiveConversationId: () => "conv-1",
    getSidebarMode: () => "sessions",
    now: () => "2026-08-21T02:00:00.000Z",
  });

  assert.deepEqual(calls, ["import", "snapshot"]);
  assert.equal(result.kind, "verified");
  assert.equal(result.verification.matches, true);
  assert.equal(result.importedAt, "2026-08-21T02:00:00.000Z");
  assert.equal(capturedBundle.generatedAt, "2026-08-21T02:00:00.000Z");
  assert.equal(JSON.stringify(capturedBundle).includes("must-not-reach-sqlite"), false);
});

test("fresh cutover verification reports domain mismatches instead of promoting them", async () => {
  const data = appData();
  const items = conversations();
  const snapshot = matchingSnapshot(data, items);
  snapshot.data.notes[0].content = "sqlite drift";

  const result = await verifyFreshSqliteShadowForCutover({
    database: {
      importBundle: async () => ({}),
      snapshot: async () => snapshot,
    },
    loadData: () => data,
    listConversations: () => items,
    getActiveConversationId: () => "conv-1",
    getSidebarMode: () => "sessions",
  });

  assert.equal(result.kind, "mismatch");
  assert.equal(result.verification.matches, false);
  assert.deepEqual(result.verification.mismatches, ["notes"]);
});

test("fresh cutover verification propagates import failures and never reads a snapshot", async () => {
  let snapshotCalled = false;

  await assert.rejects(
    verifyFreshSqliteShadowForCutover({
      database: {
        importBundle: async () => {
          throw new Error("sqlite write failed");
        },
        snapshot: async () => {
          snapshotCalled = true;
          return {};
        },
      },
      loadData: appData,
      listConversations: conversations,
      getActiveConversationId: () => "conv-1",
      getSidebarMode: () => "sessions",
    }),
    /sqlite write failed/
  );

  assert.equal(snapshotCalled, false);
});
