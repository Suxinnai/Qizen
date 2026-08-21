import test from "node:test";
import assert from "node:assert/strict";

import { verifySqliteShadowSnapshot } from "../src/lib/persistence/sqlite-shadow-verify.ts";

function appData() {
  return {
    appState: { onboardingCompleted: true },
    learningProfile: null,
    settings: {
      username: "Test",
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
        apiKey: "legacy-secret-that-must-not-be-compared",
        model: "model",
        baseUrl: "https://example.test/v1",
      },
    },
    goals: [
      {
        id: "goal-1",
        title: "Goal",
        description: "desc",
        status: "active",
        progress: 50,
        subject: "subject",
        milestones: [
          {
            id: "milestone-1",
            title: "M1",
            done: false,
            tasks: [
              {
                id: "task-1",
                title: "T1",
                meta: "meta",
                estimatedMinutes: 20,
                done: false,
              },
            ],
          },
        ],
      },
    ],
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
    studyStats: { dailyMinutes: [0, 10] },
    studyRecord: {
      events: [
        {
          id: "event-1",
          type: "ask",
          recordedAt: "2026-08-21T01:00:00.000Z",
          question: "hello",
          resourceId: null,
          nodeId: null,
          hitResourceTitles: [],
          generatedPractice: false,
          llm: {
            usedRealModel: true,
            providerLabel: "Provider",
            usedFallback: false,
          },
        },
      ],
    },
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
      messages: [{ id: "message-1", role: "user", content: "hello" }],
    },
  ];
}

function sqliteSnapshot() {
  const data = appData();
  data.settings.llm.apiKey = "";
  data.studyRecord.events[0].taskId = null;
  return {
    schemaVersion: 1,
    importedAt: "2026-08-21T02:00:00.000Z",
    data,
    conversations: conversations(),
    conversationState: {
      activeId: "conv-1",
      sidebarMode: "sessions",
      legacySchemaVersion: 2,
    },
  };
}

test("shadow verification treats secret removal and optional taskId nulling as expected migration differences", () => {
  const result = verifySqliteShadowSnapshot(
    {
      data: appData(),
      conversations: conversations(),
      activeId: "conv-1",
      sidebarMode: "sessions",
    },
    sqliteSnapshot()
  );

  assert.deepEqual(result, { matches: true, mismatches: [] });
});

test("shadow verification reports the exact top-level domain that diverged", () => {
  const snapshot = sqliteSnapshot();
  snapshot.data.notes[0].content = "changed in sqlite";
  snapshot.data.studyStats.dailyMinutes = [0, 99];

  const result = verifySqliteShadowSnapshot(
    {
      data: appData(),
      conversations: conversations(),
      activeId: "conv-1",
      sidebarMode: "sessions",
    },
    snapshot
  );

  assert.equal(result.matches, false);
  assert.deepEqual(result.mismatches, ["notes", "studyStats"]);
});

test("shadow verification catches conversation ordering/content and active state drift", () => {
  const snapshot = sqliteSnapshot();
  snapshot.conversations[0].messages[0].content = "different";
  snapshot.conversationState.activeId = null;

  const result = verifySqliteShadowSnapshot(
    {
      data: appData(),
      conversations: conversations(),
      activeId: "conv-1",
      sidebarMode: "sessions",
    },
    snapshot
  );

  assert.equal(result.matches, false);
  assert.deepEqual(result.mismatches, ["conversations", "conversationState"]);
});

test("shadow verification ignores SQLite-only legacy schema metadata", () => {
  const snapshot = sqliteSnapshot();
  snapshot.conversationState.legacySchemaVersion = 999;

  const result = verifySqliteShadowSnapshot(
    {
      data: appData(),
      conversations: conversations(),
      activeId: "conv-1",
      sidebarMode: "sessions",
    },
    snapshot
  );

  assert.equal(result.matches, true);
});
