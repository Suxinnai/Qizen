import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SQLITE_SCHEMA_VERSION,
  buildSqliteMigrationBundle,
} from "../src/lib/persistence/sqlite-migration.ts";

function fixtureData() {
  return {
    appState: { onboardingCompleted: true },
    learningProfile: {
      dominantMode: "visual",
      secondaryMode: "reading",
      scores: { visual: 4, auditory: 1, reading: 2, kinesthetic: 1 },
      summary: "profile",
      teachingStrategies: ["画图"],
      updatedAt: "2026-08-20T00:00:00.000Z",
    },
    settings: {
      username: "Qizen User",
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
        apiKey: "must-not-enter-sqlite",
        model: "test-model",
        baseUrl: "https://example.test/v1",
      },
    },
    goals: [
      {
        id: "goal-1",
        title: "学习 TS",
        description: "desc",
        status: "active",
        progress: 0.5,
        subject: "TypeScript",
        milestones: [
          {
            id: "milestone-1",
            title: "基础",
            done: false,
            tasks: [
              { id: "task-1", title: "类型", meta: "25m", estimatedMinutes: 25, done: true },
              { id: "task-2", title: "泛型", meta: "30m", estimatedMinutes: 30, done: false },
            ],
          },
        ],
      },
    ],
    notes: [
      {
        id: "note-1",
        title: "TS 笔记",
        topic: "TS",
        content: "content",
        aiKeyPoints: ["type"],
        confusingPoints: ["generic"],
        updatedAt: "2026-08-20T01:00:00.000Z",
      },
    ],
    libraryItems: [
      {
        id: "lib-1",
        title: "TS Handbook",
        originalFileName: "ts.pdf",
        type: "PDF",
        course: "TS",
        sizeBytes: 100,
        sizeLabel: "100 B",
        status: "indexed",
        tags: ["TS"],
        addedAt: "2026-08-20T02:00:00.000Z",
        parserStatus: "parsed",
        extractedText: "text",
        preview: "preview",
        summary: "summary",
        highlights: ["highlight"],
        linkedNodeIds: ["node-1"],
        pageCount: 2,
      },
    ],
    practiceSets: [
      {
        id: "practice-1",
        title: "TS practice",
        resourceId: "lib-1",
        difficulty: "进阶",
        questionCount: 1,
        status: "completed",
        generatedAt: "2026-08-20T03:00:00.000Z",
        questions: [
          {
            id: "question-1",
            prompt: "什么是 type?",
            type: "简答",
            answerHint: "hint",
            evidence: { sourceTitle: "TS Handbook", sourceSnippet: "snippet", sourceHighlights: [] },
          },
        ],
      },
    ],
    knowledgeGraph: {
      nodes: [
        {
          id: "node-1",
          label: "Type",
          kind: "concept",
          state: "current",
          x: 10,
          y: 20,
          summary: "node summary",
          related: [],
          studyHint: "study",
        },
      ],
      edges: [],
    },
    studyStats: { dailyMinutes: [0, 25, 30] },
    studyRecord: {
      events: [
        {
          id: "event-1",
          type: "practice-completed",
          recordedAt: "2026-08-20T04:00:00.000Z",
          question: "TS practice",
          resourceId: "lib-1",
          nodeId: "node-1",
          taskId: "task-1",
          hitResourceTitles: ["TS Handbook"],
          generatedPractice: true,
          practiceScore: 80,
          practiceQuestionCount: 1,
          weakQuestionPrompts: ["什么是 type?"],
          progressAction: "task-completed",
          llm: { usedRealModel: true, providerLabel: "Provider", usedFallback: false },
        },
      ],
    },
  };
}

function fixtureConversation() {
  return {
    id: "conv-1",
    title: "TS session",
    createdAt: "2026-08-20T05:00:00.000Z",
    updatedAt: "2026-08-20T06:00:00.000Z",
    isFreeConversation: false,
    context: { source: "goal", taskId: "task-1" },
    selectedTaskId: "task-1",
    teachingStyle: "analogy",
    noteDraft: "draft",
    messages: [
      { id: "m1", role: "user", content: "解释 type" },
      {
        id: "m2",
        role: "assistant",
        content: "answer",
        kind: "normal",
        providerLabel: "Provider",
        usedFallback: false,
        triggers: ["resource"],
      },
    ],
  };
}

test("SQLite schema v1 contains core normalized tables and foreign keys", () => {
  const schema = readFileSync(resolve(import.meta.dirname, "../electron/db/schema-v1.sql"), "utf8");
  for (const table of [
    "goals",
    "milestones",
    "goal_tasks",
    "library_items",
    "practice_sets",
    "practice_questions",
    "knowledge_nodes",
    "study_events",
    "study_conversations",
    "study_messages",
  ]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  }
  assert.match(schema, /PRAGMA foreign_keys = ON/);
  assert.match(schema, /ON DELETE CASCADE/);
});

test("migration bundle uses schema version 1 and deterministic generatedAt", () => {
  const bundle = buildSqliteMigrationBundle(fixtureData(), [], undefined, "2026-08-21T00:00:00.000Z");
  assert.equal(bundle.schemaVersion, SQLITE_SCHEMA_VERSION);
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.generatedAt, "2026-08-21T00:00:00.000Z");
});

test("migration never copies the LLM API key into SQLite settings", () => {
  const bundle = buildSqliteMigrationBundle(fixtureData());
  const settings = JSON.parse(bundle.tables.settings[0].dataJson);
  assert.equal(settings.llm.apiKey, "");
  assert.equal(settings.llm.model, "test-model");
  assert.equal(JSON.stringify(bundle).includes("must-not-enter-sqlite"), false);
});

test("goal hierarchy is normalized with stable parent ids and positions", () => {
  const bundle = buildSqliteMigrationBundle(fixtureData());
  assert.deepEqual(bundle.tables.goals.map((row) => [row.id, row.position]), [["goal-1", 0]]);
  assert.deepEqual(bundle.tables.milestones.map((row) => [row.id, row.goalId, row.position]), [["milestone-1", "goal-1", 0]]);
  assert.deepEqual(bundle.tables.goalTasks.map((row) => [row.id, row.milestoneId, row.position, row.done]), [
    ["task-1", "milestone-1", 0, 1],
    ["task-2", "milestone-1", 1, 0],
  ]);
});

test("arrays and optional rich objects are encoded as JSON without losing values", () => {
  const bundle = buildSqliteMigrationBundle(fixtureData());
  assert.deepEqual(JSON.parse(bundle.tables.libraryItems[0].tagsJson), ["TS"]);
  assert.deepEqual(JSON.parse(bundle.tables.libraryItems[0].linkedNodeIdsJson), ["node-1"]);
  assert.equal(JSON.parse(bundle.tables.practiceQuestions[0].evidenceJson).sourceTitle, "TS Handbook");
  assert.deepEqual(JSON.parse(bundle.tables.studyEvents[0].weakQuestionPromptsJson), ["什么是 type?"]);
  assert.equal(JSON.parse(bundle.tables.studyEvents[0].llmJson).providerLabel, "Provider");
});

test("conversations and messages preserve order while moving message extras into metadata JSON", () => {
  const conversation = fixtureConversation();
  const bundle = buildSqliteMigrationBundle(fixtureData(), [conversation], {
    activeId: "conv-1",
    sidebarMode: "sessions",
    legacySchemaVersion: 2,
  });

  assert.equal(bundle.tables.studyConversations[0].id, "conv-1");
  assert.equal(bundle.tables.studyConversationState[0].activeId, "conv-1");
  assert.equal(bundle.tables.studyConversationState[0].sidebarMode, "sessions");
  assert.deepEqual(bundle.tables.studyMessages.map((row) => [row.id, row.position, row.role]), [
    ["m1", 0, "user"],
    ["m2", 1, "assistant"],
  ]);

  const metadata = JSON.parse(bundle.tables.studyMessages[1].metadataJson);
  assert.equal(metadata.kind, "normal");
  assert.equal(metadata.providerLabel, "Provider");
  assert.equal("id" in metadata, false);
  assert.equal("role" in metadata, false);
  assert.equal("content" in metadata, false);
});

test("invalid active conversation ids are cleared during migration", () => {
  const bundle = buildSqliteMigrationBundle(fixtureData(), [fixtureConversation()], {
    activeId: "missing-conversation",
    sidebarMode: "menu",
  });
  assert.equal(bundle.tables.studyConversationState[0].activeId, null);
});

test("nullable profile and optional fields remain nullable instead of inventing data", () => {
  const data = fixtureData();
  data.learningProfile = null;
  data.libraryItems[0].pageCount = undefined;
  data.studyRecord.events[0].practiceScore = undefined;
  data.studyRecord.events[0].weakQuestionPrompts = undefined;

  const bundle = buildSqliteMigrationBundle(data);
  assert.deepEqual(bundle.tables.learningProfile, []);
  assert.equal(bundle.tables.libraryItems[0].pageCount, null);
  assert.equal(bundle.tables.studyEvents[0].practiceScore, null);
  assert.equal(bundle.tables.studyEvents[0].weakQuestionPromptsJson, null);
});
