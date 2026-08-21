import test from "node:test";
import assert from "node:assert/strict";

import { buildSqliteMigrationBundle } from "../src/lib/persistence/sqlite-migration.ts";
import { hydrateSqliteMigrationBundle } from "../src/lib/persistence/sqlite-hydration.ts";

function sourceData() {
  return {
    appState: { onboardingCompleted: true },
    learningProfile: {
      dominantMode: "reading",
      secondaryMode: "visual",
      scores: { visual: 2, auditory: 1, reading: 4, kinesthetic: 1 },
      summary: "reading profile",
      teachingStrategies: ["outline", "notes"],
      updatedAt: "2026-08-21T01:00:00.000Z",
    },
    settings: {
      username: "Round Trip",
      pomodoroMinutes: 30,
      preferredStyle: "steps",
      remindersEnabled: false,
      autoOpenStudyPanels: true,
      autoStartPomodoro: false,
      autoAppendNote: true,
      autoGenerateSessionTitle: true,
      autoSummarizeSessionNote: false,
      autoUpdateLearningProfile: true,
      requireTerminalConfirmation: "always",
      contextWindowRounds: 12,
      ragSimilarityThreshold: 0.8,
      searchCacheHours: 6,
      llm: {
        provider: "openai-compatible",
        apiKey: "secret-never-round-trips",
        model: "roundtrip-model",
        baseUrl: "https://example.test/v1",
      },
    },
    goals: [
      {
        id: "goal-a",
        title: "Goal A",
        description: "desc",
        status: "active",
        progress: 0.5,
        subject: "subject",
        milestones: [
          {
            id: "mile-a",
            title: "Milestone",
            done: false,
            tasks: [
              { id: "task-a", title: "Task A", meta: "20 min", estimatedMinutes: 20, done: true },
              { id: "task-b", title: "Task B", meta: "30 min", estimatedMinutes: 30, done: false },
            ],
          },
        ],
      },
    ],
    notes: [
      {
        id: "note-a",
        title: "Note A",
        topic: "topic",
        content: "content",
        aiKeyPoints: ["key"],
        confusingPoints: ["confusing"],
        updatedAt: "2026-08-21T02:00:00.000Z",
      },
    ],
    libraryItems: [
      {
        id: "lib-a",
        title: "Library A",
        originalFileName: "a.pdf",
        type: "PDF",
        course: "course",
        sizeBytes: 512,
        sizeLabel: "512 B",
        status: "indexed",
        tags: ["tag-a", "tag-b"],
        addedAt: "2026-08-21T03:00:00.000Z",
        parserStatus: "parsed",
        extractedText: "full text",
        preview: "preview",
        summary: "summary",
        highlights: ["highlight"],
        linkedNodeIds: ["node-a"],
        pageCount: 4,
      },
    ],
    practiceSets: [
      {
        id: "practice-a",
        title: "Practice A",
        resourceId: "lib-a",
        difficulty: "综合",
        questionCount: 1,
        status: "completed",
        generatedAt: "2026-08-21T04:00:00.000Z",
        questions: [
          {
            id: "question-a",
            prompt: "Explain A",
            type: "简答",
            answerHint: "hint",
            evidence: {
              sourceTitle: "Library A",
              sourceSnippet: "snippet",
              sourceHighlights: ["highlight"],
              confidence: "strong",
            },
          },
        ],
      },
    ],
    knowledgeGraph: {
      nodes: [
        {
          id: "node-a",
          label: "Node A",
          kind: "concept",
          state: "current",
          x: 120,
          y: 240,
          summary: "node summary",
          related: ["node-b"],
          studyHint: "study hint",
        },
      ],
      edges: [{ id: "edge-a", source: "node-a", target: "node-a" }],
    },
    studyStats: { dailyMinutes: [0, 10, 25] },
    studyRecord: {
      events: [
        {
          id: "event-a",
          type: "practice-completed",
          recordedAt: "2026-08-21T05:00:00.000Z",
          question: "Practice A",
          resourceId: "lib-a",
          nodeId: "node-a",
          taskId: "task-a",
          hitResourceTitles: ["Library A"],
          generatedPractice: true,
          practiceScore: 75,
          practiceQuestionCount: 1,
          weakQuestionPrompts: ["Explain A"],
          progressAction: "task-completed",
          llm: { usedRealModel: true, providerLabel: "Provider A", usedFallback: false },
        },
      ],
    },
  };
}

function sourceConversation() {
  return {
    id: "conv-a",
    title: "Conversation A",
    createdAt: "2026-08-21T06:00:00.000Z",
    updatedAt: "2026-08-21T06:10:00.000Z",
    isFreeConversation: false,
    context: { source: "goal", taskId: "task-a" },
    selectedTaskId: "task-a",
    teachingStyle: "steps",
    noteDraft: "draft",
    messages: [
      { id: "msg-u", role: "user", content: "Question A" },
      {
        id: "msg-a",
        role: "assistant",
        content: "Answer A",
        kind: "normal",
        providerLabel: "Provider A",
        usedFallback: false,
        triggers: ["resource", "note"],
      },
    ],
  };
}

test("migration bundle hydrates back into the current AppData shape", () => {
  const source = sourceData();
  const bundle = buildSqliteMigrationBundle(source, [], undefined, "2026-08-21T07:00:00.000Z");
  const hydrated = hydrateSqliteMigrationBundle(bundle).data;

  assert.deepEqual(hydrated.appState, source.appState);
  assert.deepEqual(hydrated.learningProfile, source.learningProfile);
  assert.equal(hydrated.settings.username, source.settings.username);
  assert.equal(hydrated.settings.llm.model, source.settings.llm.model);
  assert.equal(hydrated.settings.llm.apiKey, "");
  assert.deepEqual(hydrated.goals, source.goals);
  assert.deepEqual(hydrated.notes, source.notes);
  assert.deepEqual(hydrated.libraryItems, source.libraryItems);
  assert.deepEqual(hydrated.practiceSets, source.practiceSets);
  assert.deepEqual(hydrated.knowledgeGraph, source.knowledgeGraph);
  assert.deepEqual(hydrated.studyStats, source.studyStats);
  assert.deepEqual(hydrated.studyRecord, source.studyRecord);
});

test("conversation messages and metadata hydrate in original order", () => {
  const conversation = sourceConversation();
  const bundle = buildSqliteMigrationBundle(sourceData(), [conversation], {
    activeId: "conv-a",
    sidebarMode: "sessions",
    legacySchemaVersion: 2,
  });
  const hydrated = hydrateSqliteMigrationBundle(bundle);

  assert.deepEqual(hydrated.conversations, [conversation]);
  assert.deepEqual(hydrated.conversationState, {
    activeId: "conv-a",
    sidebarMode: "sessions",
    legacySchemaVersion: 2,
  });
});

test("hydration refuses unknown schema versions", () => {
  const bundle = buildSqliteMigrationBundle(sourceData());
  bundle.schemaVersion = 99;
  assert.throws(() => hydrateSqliteMigrationBundle(bundle), /Unsupported SQLite hydration schema/);
});

test("hydration uses defensive JSON fallbacks instead of crashing on corrupted optional JSON", () => {
  const bundle = buildSqliteMigrationBundle(sourceData());
  bundle.tables.notes[0].aiKeyPointsJson = "{broken";
  bundle.tables.libraryItems[0].tagsJson = "not json";
  bundle.tables.studyEvents[0].weakQuestionPromptsJson = "[broken";

  const hydrated = hydrateSqliteMigrationBundle(bundle).data;
  assert.deepEqual(hydrated.notes[0].aiKeyPoints, []);
  assert.deepEqual(hydrated.libraryItems[0].tags, []);
  assert.deepEqual(hydrated.studyRecord.events[0].weakQuestionPrompts, []);
});
