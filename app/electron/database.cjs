const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const SQLITE_SCHEMA_VERSION = 1;
const REQUIRED_TABLE_KEYS = [
  "appState",
  "settings",
  "learningProfile",
  "goals",
  "milestones",
  "goalTasks",
  "notes",
  "libraryItems",
  "practiceSets",
  "practiceQuestions",
  "knowledgeNodes",
  "knowledgeEdges",
  "studyStats",
  "studyEvents",
  "studyConversationState",
  "studyConversations",
  "studyMessages",
];

const DELETE_ORDER = [
  "study_messages",
  "study_conversations",
  "study_conversation_state",
  "study_events",
  "study_stats",
  "knowledge_edges",
  "knowledge_nodes",
  "practice_questions",
  "practice_sets",
  "library_items",
  "notes",
  "goal_tasks",
  "milestones",
  "goals",
  "learning_profile",
  "settings",
  "app_state",
];

function defaultSchemaPath() {
  return path.join(__dirname, "db", "schema-v1.sql");
}

function openQizenDatabase(options = {}) {
  const userDataDir = options.userDataDir;
  if (!userDataDir) throw new Error("Missing userDataDir for Qizen database");

  fs.mkdirSync(userDataDir, { recursive: true });
  const databasePath = options.databasePath || path.join(userDataDir, "qizen.sqlite3");
  const schemaPath = options.schemaPath || defaultSchemaPath();
  const schema = fs.readFileSync(schemaPath, "utf8");

  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(schema);
  return db;
}

function parseSettingsRow(bundle) {
  const row = bundle.tables.settings[0];
  if (!row || typeof row.dataJson !== "string") {
    throw new Error("SQLite migration bundle is missing the singleton settings row");
  }

  let settings;
  try {
    settings = JSON.parse(row.dataJson);
  } catch {
    throw new Error("SQLite migration settings row contains invalid JSON");
  }

  if (settings?.llm?.apiKey && String(settings.llm.apiKey).trim()) {
    throw new Error("Refusing SQLite import because settings contain an API key");
  }
}

function validateMigrationBundle(bundle) {
  if (!bundle || typeof bundle !== "object") throw new Error("Invalid SQLite migration bundle");
  if (bundle.schemaVersion !== SQLITE_SCHEMA_VERSION) {
    throw new Error(`Unsupported SQLite migration bundle schema: ${bundle.schemaVersion}`);
  }
  if (!bundle.tables || typeof bundle.tables !== "object") {
    throw new Error("SQLite migration bundle is missing tables");
  }

  for (const key of REQUIRED_TABLE_KEYS) {
    if (!Array.isArray(bundle.tables[key])) {
      throw new Error(`SQLite migration bundle table ${key} must be an array`);
    }
  }

  if (bundle.tables.appState.length !== 1 || bundle.tables.settings.length !== 1 || bundle.tables.studyStats.length !== 1) {
    throw new Error("SQLite migration bundle is missing required singleton rows");
  }
  if (bundle.tables.studyConversationState.length !== 1) {
    throw new Error("SQLite migration bundle is missing conversation state");
  }

  parseSettingsRow(bundle);
  return true;
}

function runRows(db, sql, rows, values) {
  if (rows.length === 0) return;
  const statement = db.prepare(sql);
  for (const row of rows) statement.run(...values(row));
}

function replaceFromMigrationBundle(db, bundle) {
  validateMigrationBundle(bundle);
  const t = bundle.tables;

  db.exec("BEGIN IMMEDIATE;");
  try {
    for (const table of DELETE_ORDER) db.exec(`DELETE FROM ${table};`);

    runRows(db, "INSERT INTO app_state(id, onboarding_completed) VALUES (?, ?)", t.appState, (r) => [r.id, r.onboardingCompleted]);
    runRows(db, "INSERT INTO settings(id, data_json) VALUES (?, ?)", t.settings, (r) => [r.id, r.dataJson]);
    runRows(db, "INSERT INTO learning_profile(id, data_json) VALUES (?, ?)", t.learningProfile, (r) => [r.id, r.dataJson]);

    runRows(
      db,
      "INSERT INTO goals(id, title, description, status, progress, subject, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
      t.goals,
      (r) => [r.id, r.title, r.description, r.status, r.progress, r.subject, r.position]
    );
    runRows(
      db,
      "INSERT INTO milestones(id, goal_id, title, done, position) VALUES (?, ?, ?, ?, ?)",
      t.milestones,
      (r) => [r.id, r.goalId, r.title, r.done, r.position]
    );
    runRows(
      db,
      "INSERT INTO goal_tasks(id, milestone_id, title, meta, estimated_minutes, done, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
      t.goalTasks,
      (r) => [r.id, r.milestoneId, r.title, r.meta, r.estimatedMinutes, r.done, r.position]
    );

    runRows(
      db,
      "INSERT INTO notes(id, title, topic, content, ai_key_points_json, confusing_points_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      t.notes,
      (r) => [r.id, r.title, r.topic, r.content, r.aiKeyPointsJson, r.confusingPointsJson, r.updatedAt]
    );
    runRows(
      db,
      "INSERT INTO library_items(id, title, original_file_name, type, course, size_bytes, size_label, status, tags_json, added_at, parser_status, extracted_text, preview, summary, highlights_json, linked_node_ids_json, page_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      t.libraryItems,
      (r) => [
        r.id,
        r.title,
        r.originalFileName,
        r.type,
        r.course,
        r.sizeBytes,
        r.sizeLabel,
        r.status,
        r.tagsJson,
        r.addedAt,
        r.parserStatus,
        r.extractedText,
        r.preview,
        r.summary,
        r.highlightsJson,
        r.linkedNodeIdsJson,
        r.pageCount,
      ]
    );

    runRows(
      db,
      "INSERT INTO practice_sets(id, title, resource_id, difficulty, question_count, status, generated_at, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      t.practiceSets,
      (r) => [r.id, r.title, r.resourceId, r.difficulty, r.questionCount, r.status, r.generatedAt, r.position]
    );
    runRows(
      db,
      "INSERT INTO practice_questions(id, practice_set_id, prompt, type, answer_hint, evidence_json, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
      t.practiceQuestions,
      (r) => [r.id, r.practiceSetId, r.prompt, r.type, r.answerHint, r.evidenceJson, r.position]
    );

    runRows(
      db,
      "INSERT INTO knowledge_nodes(id, label, kind, state, x, y, summary, related_json, study_hint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      t.knowledgeNodes,
      (r) => [r.id, r.label, r.kind, r.state, r.x, r.y, r.summary, r.relatedJson, r.studyHint]
    );
    runRows(
      db,
      "INSERT INTO knowledge_edges(id, source, target) VALUES (?, ?, ?)",
      t.knowledgeEdges,
      (r) => [r.id, r.source, r.target]
    );

    runRows(db, "INSERT INTO study_stats(id, daily_minutes_json) VALUES (?, ?)", t.studyStats, (r) => [r.id, r.dailyMinutesJson]);
    runRows(
      db,
      "INSERT INTO study_events(id, type, recorded_at, question, resource_id, node_id, task_id, hit_resource_titles_json, generated_practice, practice_score, practice_question_count, weak_question_prompts_json, progress_action, llm_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      t.studyEvents,
      (r) => [
        r.id,
        r.type,
        r.recordedAt,
        r.question,
        r.resourceId,
        r.nodeId,
        r.taskId,
        r.hitResourceTitlesJson,
        r.generatedPractice,
        r.practiceScore,
        r.practiceQuestionCount,
        r.weakQuestionPromptsJson,
        r.progressAction,
        r.llmJson,
      ]
    );

    runRows(
      db,
      "INSERT INTO study_conversations(id, title, created_at, updated_at, is_free_conversation, context_json, selected_task_id, teaching_style, note_draft) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      t.studyConversations,
      (r) => [
        r.id,
        r.title,
        r.createdAt,
        r.updatedAt,
        r.isFreeConversation,
        r.contextJson,
        r.selectedTaskId,
        r.teachingStyle,
        r.noteDraft,
      ]
    );
    runRows(
      db,
      "INSERT INTO study_messages(id, conversation_id, role, content, metadata_json, position) VALUES (?, ?, ?, ?, ?, ?)",
      t.studyMessages,
      (r) => [r.id, r.conversationId, r.role, r.content, r.metadataJson, r.position]
    );
    runRows(
      db,
      "INSERT INTO study_conversation_state(id, active_id, sidebar_mode, legacy_schema_version) VALUES (?, ?, ?, ?)",
      t.studyConversationState,
      (r) => [r.id, r.activeId, r.sidebarMode, r.legacySchemaVersion]
    );

    const importedAt = typeof bundle.generatedAt === "string" && bundle.generatedAt ? bundle.generatedAt : new Date().toISOString();
    db.prepare(
      "INSERT INTO schema_meta(key, value) VALUES ('local_storage_imported_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(importedAt);

    db.exec("COMMIT;");
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // Preserve the original import error.
    }
    throw error;
  }

  return getDatabaseStatus(db);
}

function count(db, table) {
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
}

function getDatabaseStatus(db) {
  const schemaVersionRow = db.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get();
  const importedAtRow = db.prepare("SELECT value FROM schema_meta WHERE key = 'local_storage_imported_at'").get();
  return {
    schemaVersion: Number(schemaVersionRow?.value || 0),
    importedAt: importedAtRow?.value || null,
    counts: {
      goals: count(db, "goals"),
      libraryItems: count(db, "library_items"),
      notes: count(db, "notes"),
      practiceSets: count(db, "practice_sets"),
      knowledgeNodes: count(db, "knowledge_nodes"),
      studyEvents: count(db, "study_events"),
      studyConversations: count(db, "study_conversations"),
      studyMessages: count(db, "study_messages"),
    },
  };
}

function closeQizenDatabase(db) {
  if (db) db.close();
}

module.exports = {
  SQLITE_SCHEMA_VERSION,
  openQizenDatabase,
  validateMigrationBundle,
  replaceFromMigrationBundle,
  getDatabaseStatus,
  closeQizenDatabase,
};
