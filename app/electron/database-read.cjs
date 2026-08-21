function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function all(db, sql) {
  return db.prepare(sql).all();
}

function get(db, sql) {
  return db.prepare(sql).get();
}

function readGoals(db) {
  const goals = all(db, "SELECT * FROM goals ORDER BY position ASC");
  const milestones = all(db, "SELECT * FROM milestones ORDER BY goal_id ASC, position ASC");
  const tasks = all(db, "SELECT * FROM goal_tasks ORDER BY milestone_id ASC, position ASC");

  const tasksByMilestone = new Map();
  for (const row of tasks) {
    const list = tasksByMilestone.get(row.milestone_id) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      meta: row.meta,
      estimatedMinutes: Number(row.estimated_minutes),
      done: Boolean(row.done),
    });
    tasksByMilestone.set(row.milestone_id, list);
  }

  const milestonesByGoal = new Map();
  for (const row of milestones) {
    const list = milestonesByGoal.get(row.goal_id) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      done: Boolean(row.done),
      tasks: tasksByMilestone.get(row.id) ?? [],
    });
    milestonesByGoal.set(row.goal_id, list);
  }

  return goals.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    progress: Number(row.progress),
    subject: row.subject,
    milestones: milestonesByGoal.get(row.id) ?? [],
  }));
}

function readNotes(db) {
  return all(db, "SELECT * FROM notes ORDER BY updated_at ASC, id ASC").map((row) => ({
    id: row.id,
    title: row.title,
    topic: row.topic,
    content: row.content,
    aiKeyPoints: parseJson(row.ai_key_points_json, []),
    confusingPoints: parseJson(row.confusing_points_json, []),
    updatedAt: row.updated_at,
  }));
}

function readLibraryItems(db) {
  return all(db, "SELECT * FROM library_items ORDER BY added_at ASC, id ASC").map((row) => ({
    id: row.id,
    title: row.title,
    originalFileName: row.original_file_name,
    type: row.type,
    course: row.course,
    sizeBytes: Number(row.size_bytes),
    sizeLabel: row.size_label,
    status: row.status,
    tags: parseJson(row.tags_json, []),
    addedAt: row.added_at,
    parserStatus: row.parser_status,
    extractedText: row.extracted_text,
    preview: row.preview,
    summary: row.summary,
    highlights: parseJson(row.highlights_json, []),
    linkedNodeIds: parseJson(row.linked_node_ids_json, []),
    pageCount: row.page_count === null ? undefined : Number(row.page_count),
  }));
}

function readPracticeSets(db) {
  const questions = all(db, "SELECT * FROM practice_questions ORDER BY practice_set_id ASC, position ASC");
  const questionsBySet = new Map();
  for (const row of questions) {
    const list = questionsBySet.get(row.practice_set_id) ?? [];
    list.push({
      id: row.id,
      prompt: row.prompt,
      type: row.type,
      answerHint: row.answer_hint,
      ...(row.evidence_json ? { evidence: parseJson(row.evidence_json, undefined) } : {}),
    });
    questionsBySet.set(row.practice_set_id, list);
  }

  return all(db, "SELECT * FROM practice_sets ORDER BY position ASC").map((row) => ({
    id: row.id,
    title: row.title,
    resourceId: row.resource_id,
    difficulty: row.difficulty,
    questionCount: Number(row.question_count),
    status: row.status,
    generatedAt: row.generated_at,
    questions: questionsBySet.get(row.id) ?? [],
  }));
}

function readKnowledgeGraph(db) {
  const nodes = all(db, "SELECT * FROM knowledge_nodes ORDER BY id ASC").map((row) => ({
    id: row.id,
    label: row.label,
    kind: row.kind,
    state: row.state,
    x: Number(row.x),
    y: Number(row.y),
    summary: row.summary,
    related: parseJson(row.related_json, []),
    studyHint: row.study_hint,
  }));
  const edges = all(db, "SELECT * FROM knowledge_edges ORDER BY id ASC").map((row) => ({
    id: row.id,
    source: row.source,
    target: row.target,
  }));
  return { nodes, edges };
}

function readStudyEvents(db) {
  return all(db, "SELECT * FROM study_events ORDER BY recorded_at ASC, id ASC").map((row) => ({
    id: row.id,
    type: row.type,
    recordedAt: row.recorded_at,
    question: row.question,
    resourceId: row.resource_id,
    nodeId: row.node_id,
    taskId: row.task_id,
    hitResourceTitles: parseJson(row.hit_resource_titles_json, []),
    generatedPractice: Boolean(row.generated_practice),
    ...(row.practice_score === null ? {} : { practiceScore: Number(row.practice_score) }),
    ...(row.practice_question_count === null
      ? {}
      : { practiceQuestionCount: Number(row.practice_question_count) }),
    ...(row.weak_question_prompts_json
      ? { weakQuestionPrompts: parseJson(row.weak_question_prompts_json, []) }
      : {}),
    ...(row.progress_action ? { progressAction: row.progress_action } : {}),
    llm: parseJson(row.llm_json, {
      usedRealModel: false,
      providerLabel: "本地回答",
      usedFallback: true,
    }),
  }));
}

function readConversations(db) {
  const messages = all(
    db,
    "SELECT * FROM study_messages ORDER BY conversation_id ASC, position ASC"
  );
  const messagesByConversation = new Map();
  for (const row of messages) {
    const list = messagesByConversation.get(row.conversation_id) ?? [];
    list.push({
      id: row.id,
      role: row.role,
      content: row.content,
      ...parseJson(row.metadata_json, {}),
    });
    messagesByConversation.set(row.conversation_id, list);
  }

  return all(db, "SELECT * FROM study_conversations ORDER BY updated_at DESC, id ASC").map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isFreeConversation: Boolean(row.is_free_conversation),
    context: parseJson(row.context_json, null),
    selectedTaskId: row.selected_task_id,
    teachingStyle: row.teaching_style,
    noteDraft: row.note_draft,
    messages: messagesByConversation.get(row.id) ?? [],
  }));
}

function readQizenDatabaseSnapshot(db) {
  const appState = get(db, "SELECT * FROM app_state WHERE id = 1");
  const settings = get(db, "SELECT * FROM settings WHERE id = 1");
  const learningProfile = get(db, "SELECT * FROM learning_profile WHERE id = 1");
  const studyStats = get(db, "SELECT * FROM study_stats WHERE id = 1");
  const conversationState = get(db, "SELECT * FROM study_conversation_state WHERE id = 1");
  const schemaVersion = get(db, "SELECT value FROM schema_meta WHERE key = 'schema_version'");
  const importedAt = get(db, "SELECT value FROM schema_meta WHERE key = 'local_storage_imported_at'");

  const settingsData = parseJson(settings?.data_json, {});
  if (settingsData?.llm?.apiKey) settingsData.llm.apiKey = "";

  return {
    schemaVersion: Number(schemaVersion?.value || 0),
    importedAt: importedAt?.value || null,
    data: {
      appState: { onboardingCompleted: Boolean(appState?.onboarding_completed) },
      learningProfile: learningProfile ? parseJson(learningProfile.data_json, null) : null,
      settings: settingsData,
      goals: readGoals(db),
      notes: readNotes(db),
      libraryItems: readLibraryItems(db),
      practiceSets: readPracticeSets(db),
      knowledgeGraph: readKnowledgeGraph(db),
      studyStats: {
        dailyMinutes: parseJson(studyStats?.daily_minutes_json, []),
      },
      studyRecord: {
        events: readStudyEvents(db),
      },
    },
    conversations: readConversations(db),
    conversationState: {
      activeId: conversationState?.active_id || null,
      sidebarMode: conversationState?.sidebar_mode === "sessions" ? "sessions" : "menu",
      legacySchemaVersion: Number(conversationState?.legacy_schema_version || 2),
    },
  };
}

module.exports = {
  readQizenDatabaseSnapshot,
};
