const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");
const {
  openQizenDatabase,
  replaceFromMigrationBundle,
  getDatabaseStatus,
  closeQizenDatabase,
} = require("./database.cjs");
const { readQizenDatabaseSnapshot } = require("./database-read.cjs");

const smokeDir = path.join(os.tmpdir(), `qizen-sqlite-smoke-${process.pid}`);
fs.mkdirSync(smokeDir, { recursive: true });
app.setPath("userData", smokeDir);

function emptyTables() {
  return {
    appState: [{ id: 1, onboardingCompleted: 1 }],
    settings: [{ id: 1, dataJson: JSON.stringify({ llm: { apiKey: "", model: "smoke" } }) }],
    learningProfile: [],
    goals: [
      {
        id: "goal-smoke",
        title: "SQLite smoke",
        description: "transaction check",
        status: "active",
        progress: 0,
        subject: "test",
        position: 0,
      },
    ],
    milestones: [],
    goalTasks: [],
    notes: [
      {
        id: "note-array-first",
        title: "First in source array",
        topic: "order",
        content: "first",
        aiKeyPointsJson: "[]",
        confusingPointsJson: "[]",
        updatedAt: "2026-08-21T10:00:00.000Z",
      },
      {
        id: "note-array-second",
        title: "Second in source array",
        topic: "order",
        content: "second",
        aiKeyPointsJson: "[]",
        confusingPointsJson: "[]",
        updatedAt: "2026-08-20T10:00:00.000Z",
      },
    ],
    libraryItems: [],
    practiceSets: [],
    practiceQuestions: [],
    knowledgeNodes: [],
    knowledgeEdges: [],
    studyStats: [{ id: 1, dailyMinutesJson: "[0,1]" }],
    studyEvents: [],
    studyConversationState: [{ id: 1, activeId: "conv-smoke", sidebarMode: "sessions", legacySchemaVersion: 2 }],
    studyConversations: [
      {
        id: "conv-smoke",
        title: "Smoke conversation",
        createdAt: "2026-08-21T00:00:00.000Z",
        updatedAt: "2026-08-21T00:01:00.000Z",
        isFreeConversation: 1,
        contextJson: null,
        selectedTaskId: "",
        teachingStyle: "analogy",
        noteDraft: "",
      },
    ],
    studyMessages: [
      {
        id: "message-smoke",
        conversationId: "conv-smoke",
        role: "user",
        content: "hello sqlite",
        metadataJson: "{}",
        position: 0,
      },
    ],
  };
}

function smokeBundle() {
  return {
    schemaVersion: 1,
    generatedAt: "2026-08-21T00:02:00.000Z",
    tables: emptyTables(),
  };
}

app.whenReady().then(() => {
  let db;
  try {
    db = openQizenDatabase({ userDataDir: smokeDir });
    const imported = replaceFromMigrationBundle(db, smokeBundle());
    if (imported.schemaVersion !== 1) throw new Error("SQLite smoke expected schema version 1");
    if (imported.importedAt !== "2026-08-21T00:02:00.000Z") throw new Error("SQLite smoke import timestamp mismatch");
    if (imported.counts.goals !== 1 || imported.counts.studyConversations !== 1 || imported.counts.studyMessages !== 1) {
      throw new Error(`SQLite smoke unexpected counts: ${JSON.stringify(imported.counts)}`);
    }

    const snapshot = readQizenDatabaseSnapshot(db);
    if (snapshot.schemaVersion !== 1 || snapshot.importedAt !== "2026-08-21T00:02:00.000Z") {
      throw new Error("SQLite smoke snapshot metadata mismatch");
    }
    if (!snapshot.data.appState.onboardingCompleted) throw new Error("SQLite smoke failed to restore app state");
    if (snapshot.data.goals[0]?.id !== "goal-smoke" || snapshot.data.goals[0]?.title !== "SQLite smoke") {
      throw new Error("SQLite smoke failed to restore goal data");
    }
    if (JSON.stringify(snapshot.data.studyStats.dailyMinutes) !== "[0,1]") {
      throw new Error("SQLite smoke failed to restore study stats");
    }
    if (snapshot.data.notes[0]?.id !== "note-array-first" || snapshot.data.notes[1]?.id !== "note-array-second") {
      throw new Error("SQLite smoke did not preserve legacy note array order");
    }
    if (snapshot.conversationState.activeId !== "conv-smoke" || snapshot.conversationState.sidebarMode !== "sessions") {
      throw new Error("SQLite smoke failed to restore conversation state");
    }
    if (snapshot.conversations[0]?.messages[0]?.content !== "hello sqlite") {
      throw new Error("SQLite smoke failed to restore conversation messages");
    }
    if (JSON.stringify(snapshot).includes("must-be-rejected")) {
      throw new Error("SQLite smoke snapshot unexpectedly exposed an API key");
    }

    const malicious = smokeBundle();
    malicious.tables.settings = [
      { id: 1, dataJson: JSON.stringify({ llm: { apiKey: "must-be-rejected", model: "smoke" } }) },
    ];
    let secretRejected = false;
    try {
      replaceFromMigrationBundle(db, malicious);
    } catch (error) {
      secretRejected = /API key/i.test(String(error?.message || error));
    }
    if (!secretRejected) throw new Error("SQLite smoke expected API key import rejection");

    const broken = smokeBundle();
    broken.tables.milestones = [
      { id: "broken-milestone", goalId: "missing-goal", title: "broken", done: 0, position: 0 },
    ];
    let rollbackTriggered = false;
    try {
      replaceFromMigrationBundle(db, broken);
    } catch {
      rollbackTriggered = true;
    }
    if (!rollbackTriggered) throw new Error("SQLite smoke expected foreign-key import failure");

    const afterRollback = getDatabaseStatus(db);
    if (afterRollback.counts.goals !== 1 || afterRollback.counts.studyConversations !== 1) {
      throw new Error("SQLite smoke rollback did not preserve the previous committed data");
    }

    console.log("Electron SQLite smoke passed.");
    closeQizenDatabase(db);
    db = null;
    fs.rmSync(smokeDir, { recursive: true, force: true });
    app.quit();
  } catch (error) {
    if (db) {
      try {
        closeQizenDatabase(db);
      } catch {
        // best effort cleanup
      }
    }
    console.error(error);
    app.exit(1);
  }
});
