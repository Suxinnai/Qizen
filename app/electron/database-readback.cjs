const SQLITE_SCHEMA_VERSION = 1;

function all(db, sql) {
  return db.prepare(sql).all().map((row) => ({ ...row }));
}

function scalar(db, key) {
  const row = db.prepare("SELECT value FROM schema_meta WHERE key = ?").get(key);
  return row?.value ?? null;
}

/**
 * Export SQLite through the same structured row protocol used by migration.
 * No raw SQL or database handle crosses the preload boundary.
 *
 * Tables without an explicit position in schema v1 use rowid to preserve the
 * original one-time import order. A future writable-source schema must replace
 * these rowid orderings with explicit positions before the repository switch.
 */
function readMigrationBundleFromDatabase(db) {
  const schemaVersion = Number(scalar(db, "schema_version") || 0);
  if (schemaVersion !== SQLITE_SCHEMA_VERSION) {
    throw new Error(`Unsupported SQLite readback schema: ${schemaVersion}`);
  }

  const importedAt = scalar(db, "local_storage_imported_at");
  return {
    schemaVersion,
    generatedAt: importedAt || new Date().toISOString(),
    tables: {
      appState: all(db, "SELECT id, onboarding_completed AS onboardingCompleted FROM app_state ORDER BY id"),
      settings: all(db, "SELECT id, data_json AS dataJson FROM settings ORDER BY id"),
      learningProfile: all(db, "SELECT id, data_json AS dataJson FROM learning_profile ORDER BY id"),
      goals: all(
        db,
        "SELECT id, title, description, status, progress, subject, position FROM goals ORDER BY position, rowid"
      ),
      milestones: all(
        db,
        "SELECT id, goal_id AS goalId, title, done, position FROM milestones ORDER BY goal_id, position, rowid"
      ),
      goalTasks: all(
        db,
        "SELECT id, milestone_id AS milestoneId, title, meta, estimated_minutes AS estimatedMinutes, done, position FROM goal_tasks ORDER BY milestone_id, position, rowid"
      ),
      notes: all(
        db,
        "SELECT id, title, topic, content, ai_key_points_json AS aiKeyPointsJson, confusing_points_json AS confusingPointsJson, updated_at AS updatedAt FROM notes ORDER BY rowid"
      ),
      libraryItems: all(
        db,
        "SELECT id, title, original_file_name AS originalFileName, type, course, size_bytes AS sizeBytes, size_label AS sizeLabel, status, tags_json AS tagsJson, added_at AS addedAt, parser_status AS parserStatus, extracted_text AS extractedText, preview, summary, highlights_json AS highlightsJson, linked_node_ids_json AS linkedNodeIdsJson, page_count AS pageCount FROM library_items ORDER BY rowid"
      ),
      practiceSets: all(
        db,
        "SELECT id, title, resource_id AS resourceId, difficulty, question_count AS questionCount, status, generated_at AS generatedAt, position FROM practice_sets ORDER BY position, rowid"
      ),
      practiceQuestions: all(
        db,
        "SELECT id, practice_set_id AS practiceSetId, prompt, type, answer_hint AS answerHint, evidence_json AS evidenceJson, position FROM practice_questions ORDER BY practice_set_id, position, rowid"
      ),
      knowledgeNodes: all(
        db,
        "SELECT id, label, kind, state, x, y, summary, related_json AS relatedJson, study_hint AS studyHint FROM knowledge_nodes ORDER BY rowid"
      ),
      knowledgeEdges: all(
        db,
        "SELECT id, source, target FROM knowledge_edges ORDER BY rowid"
      ),
      studyStats: all(
        db,
        "SELECT id, daily_minutes_json AS dailyMinutesJson FROM study_stats ORDER BY id"
      ),
      studyEvents: all(
        db,
        "SELECT id, type, recorded_at AS recordedAt, question, resource_id AS resourceId, node_id AS nodeId, task_id AS taskId, hit_resource_titles_json AS hitResourceTitlesJson, generated_practice AS generatedPractice, practice_score AS practiceScore, practice_question_count AS practiceQuestionCount, weak_question_prompts_json AS weakQuestionPromptsJson, progress_action AS progressAction, llm_json AS llmJson FROM study_events ORDER BY rowid"
      ),
      studyConversationState: all(
        db,
        "SELECT id, active_id AS activeId, sidebar_mode AS sidebarMode, legacy_schema_version AS legacySchemaVersion FROM study_conversation_state ORDER BY id"
      ),
      studyConversations: all(
        db,
        "SELECT id, title, created_at AS createdAt, updated_at AS updatedAt, is_free_conversation AS isFreeConversation, context_json AS contextJson, selected_task_id AS selectedTaskId, teaching_style AS teachingStyle, note_draft AS noteDraft FROM study_conversations ORDER BY updated_at DESC, rowid"
      ),
      studyMessages: all(
        db,
        "SELECT id, conversation_id AS conversationId, role, content, metadata_json AS metadataJson, position FROM study_messages ORDER BY conversation_id, position, rowid"
      ),
    },
  };
}

module.exports = { readMigrationBundleFromDatabase };
