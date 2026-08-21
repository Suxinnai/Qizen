import test from "node:test";
import assert from "node:assert/strict";

import {
  ensureSqliteShadowImport,
  hasMeaningfulLocalData,
  runSqliteShadowImportAtStartup,
} from "../src/lib/persistence/sqlite-shadow-import.ts";

function emptyData() {
  return {
    appState: { onboardingCompleted: false },
    learningProfile: null,
    settings: {
      username: "",
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
        apiKey: "",
        model: "test-model",
        baseUrl: "https://example.test/v1",
      },
    },
    goals: [],
    notes: [],
    libraryItems: [],
    practiceSets: [],
    knowledgeGraph: { nodes: [], edges: [] },
    studyStats: { dailyMinutes: Array.from({ length: 30 }, () => 0) },
    studyRecord: { events: [] },
  };
}

function status(overrides = {}) {
  return {
    schemaVersion: 1,
    importedAt: null,
    counts: {
      goals: 0,
      libraryItems: 0,
      notes: 0,
      practiceSets: 0,
      knowledgeNodes: 0,
      studyEvents: 0,
      studyConversations: 0,
      studyMessages: 0,
    },
    ...overrides,
  };
}

test("empty fresh installs are not considered meaningful migration sources", () => {
  assert.equal(hasMeaningfulLocalData(emptyData(), []), false);
});

test("completed onboarding or persisted learning content makes local data meaningful", () => {
  const onboarded = emptyData();
  onboarded.appState.onboardingCompleted = true;
  assert.equal(hasMeaningfulLocalData(onboarded, []), true);

  const withNote = emptyData();
  withNote.notes.push({ id: "note-1" });
  assert.equal(hasMeaningfulLocalData(withNote, []), true);

  const conversationOnly = emptyData();
  assert.equal(hasMeaningfulLocalData(conversationOnly, [{ id: "conv-1" }]), true);
});

test("shadow import is unavailable outside Electron and does not touch local data", async () => {
  let loaded = false;
  const result = await ensureSqliteShadowImport({
    loadData: () => {
      loaded = true;
      return emptyData();
    },
  });
  assert.deepEqual(result, { kind: "unavailable" });
  assert.equal(loaded, false);
});

test("already imported databases skip localStorage reads and duplicate imports", async () => {
  let loaded = false;
  let imported = false;
  const existing = status({ importedAt: "2026-08-21T01:00:00.000Z" });
  const result = await ensureSqliteShadowImport({
    database: {
      status: async () => existing,
      importBundle: async () => {
        imported = true;
        return existing;
      },
    },
    loadData: () => {
      loaded = true;
      return emptyData();
    },
  });

  assert.equal(result.kind, "already-imported");
  assert.equal(loaded, false);
  assert.equal(imported, false);
});

test("empty local data leaves the SQLite import marker unset", async () => {
  let imported = false;
  const initial = status();
  const result = await ensureSqliteShadowImport({
    database: {
      status: async () => initial,
      importBundle: async () => {
        imported = true;
        return status({ importedAt: "unexpected" });
      },
    },
    loadData: emptyData,
    listConversations: () => [],
  });

  assert.equal(result.kind, "empty");
  assert.equal(imported, false);
  assert.equal(result.status.importedAt, null);
});

test("meaningful local data is bundled once with conversation state and no API key", async () => {
  const data = emptyData();
  data.appState.onboardingCompleted = true;
  data.settings.llm.apiKey = "must-not-cross-ipc";
  data.goals.push({
    id: "goal-1",
    title: "Goal",
    description: "desc",
    status: "active",
    progress: 0,
    subject: "subject",
    milestones: [],
  });

  const conversations = [
    {
      id: "conv-1",
      title: "Session",
      createdAt: "2026-08-21T02:00:00.000Z",
      updatedAt: "2026-08-21T02:01:00.000Z",
      isFreeConversation: true,
      context: null,
      selectedTaskId: "",
      teachingStyle: "analogy",
      noteDraft: "",
      messages: [{ id: "m1", role: "user", content: "hello" }],
    },
  ];

  let capturedBundle = null;
  const importedStatus = status({
    importedAt: "2026-08-21T03:00:00.000Z",
    counts: { ...status().counts, goals: 1, studyConversations: 1, studyMessages: 1 },
  });

  const result = await ensureSqliteShadowImport({
    database: {
      status: async () => status(),
      importBundle: async (bundle) => {
        capturedBundle = bundle;
        return importedStatus;
      },
    },
    loadData: () => data,
    listConversations: () => conversations,
    getActiveConversationId: () => "conv-1",
    getSidebarMode: () => "sessions",
    now: () => "2026-08-21T03:00:00.000Z",
  });

  assert.equal(result.kind, "imported");
  assert.equal(result.status.importedAt, "2026-08-21T03:00:00.000Z");
  assert.equal(capturedBundle.generatedAt, "2026-08-21T03:00:00.000Z");
  assert.equal(capturedBundle.tables.goals.length, 1);
  assert.equal(capturedBundle.tables.studyConversations.length, 1);
  assert.equal(capturedBundle.tables.studyMessages.length, 1);
  assert.equal(capturedBundle.tables.studyConversationState[0].activeId, "conv-1");
  assert.equal(capturedBundle.tables.studyConversationState[0].sidebarMode, "sessions");
  assert.equal(JSON.stringify(capturedBundle).includes("must-not-cross-ipc"), false);
});

test("database import errors are surfaced so startup can log and retry later", async () => {
  const data = emptyData();
  data.appState.onboardingCompleted = true;

  await assert.rejects(
    ensureSqliteShadowImport({
      database: {
        status: async () => status(),
        importBundle: async () => {
          throw new Error("transaction failed");
        },
      },
      loadData: () => data,
      listConversations: () => [],
      getActiveConversationId: () => null,
      getSidebarMode: () => "menu",
    }),
    /transaction failed/
  );
});

test("startup shadow import preserves successful results", async () => {
  const existing = status({ importedAt: "2026-08-21T04:00:00.000Z" });
  const result = await runSqliteShadowImportAtStartup({
    database: {
      status: async () => existing,
      importBundle: async () => existing,
    },
  });

  assert.equal(result.kind, "already-imported");
  assert.equal(result.status.importedAt, "2026-08-21T04:00:00.000Z");
});

test("startup shadow import converts failures into a non-blocking failed result", async () => {
  const data = emptyData();
  data.appState.onboardingCompleted = true;
  const logged = [];

  const result = await runSqliteShadowImportAtStartup(
    {
      database: {
        status: async () => status(),
        importBundle: async () => {
          throw new Error("disk unavailable");
        },
      },
      loadData: () => data,
      listConversations: () => [],
      getActiveConversationId: () => null,
      getSidebarMode: () => "menu",
    },
    (error) => logged.push(error)
  );

  assert.deepEqual(result, { kind: "failed", errorSummary: "disk unavailable" });
  assert.equal(logged.length, 1);
  assert.match(String(logged[0]?.message || logged[0]), /disk unavailable/);
});
