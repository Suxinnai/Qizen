import type {
  AppData,
  AppSettings,
  Goal,
  GoalStatus,
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeNodeKind,
  KnowledgeNodeState,
  LearningProfile,
  LibraryItem,
  NoteItem,
  PracticeDifficulty,
  PracticeQuestion,
  PracticeSet,
  PracticeStatus,
  ResourceType,
  StudySessionEvent,
  StudySessionEventType,
  TeachingStyle,
} from "../storage.ts";
import type {
  PersistedStudyConversation,
  StudySidebarMode,
} from "../studyConversations.ts";
import type { SqliteMigrationBundle } from "./sqlite-migration.ts";

export interface HydratedSqliteSnapshot {
  data: AppData;
  conversations: PersistedStudyConversation[];
  conversationState: {
    activeId: string | null;
    sidebarMode: StudySidebarMode;
    legacySchemaVersion: number;
  };
}

function text(row: Record<string, unknown>, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function nullableText(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function numberValue(row: Record<string, unknown>, key: string, fallback = 0) {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(row: Record<string, unknown>, key: string) {
  return numberValue(row, key) !== 0;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function position(row: Record<string, unknown>) {
  return numberValue(row, "position");
}

function byPosition(a: Record<string, unknown>, b: Record<string, unknown>) {
  return position(a) - position(b);
}

function hydrateSettings(row: Record<string, unknown> | undefined): AppSettings {
  const parsed = parseJson<Partial<AppSettings>>(row?.dataJson, {});
  const llm = parsed.llm ?? {
    provider: "none",
    apiKey: "",
    model: "",
    baseUrl: "https://api.openai.com/v1",
  };

  return {
    username: parsed.username ?? "",
    pomodoroMinutes: parsed.pomodoroMinutes ?? 25,
    preferredStyle: parsed.preferredStyle ?? "analogy",
    remindersEnabled: parsed.remindersEnabled ?? true,
    autoOpenStudyPanels: parsed.autoOpenStudyPanels ?? true,
    autoStartPomodoro: parsed.autoStartPomodoro ?? true,
    autoAppendNote: parsed.autoAppendNote ?? true,
    autoGenerateSessionTitle: parsed.autoGenerateSessionTitle ?? true,
    autoSummarizeSessionNote: parsed.autoSummarizeSessionNote ?? false,
    autoUpdateLearningProfile: parsed.autoUpdateLearningProfile ?? true,
    requireTerminalConfirmation: parsed.requireTerminalConfirmation ?? "always",
    contextWindowRounds: parsed.contextWindowRounds ?? 10,
    ragSimilarityThreshold: parsed.ragSimilarityThreshold ?? 0.75,
    searchCacheHours: parsed.searchCacheHours ?? 24,
    llm: {
      provider: llm.provider ?? "none",
      apiKey: "",
      model: llm.model ?? "",
      baseUrl: llm.baseUrl ?? "https://api.openai.com/v1",
    },
  };
}

function hydrateGoals(bundle: SqliteMigrationBundle): Goal[] {
  const milestonesByGoal = new Map<string, Array<Record<string, unknown>>>();
  for (const row of bundle.tables.milestones) {
    const goalId = text(row, "goalId");
    const list = milestonesByGoal.get(goalId) ?? [];
    list.push(row);
    milestonesByGoal.set(goalId, list);
  }

  const tasksByMilestone = new Map<string, Array<Record<string, unknown>>>();
  for (const row of bundle.tables.goalTasks) {
    const milestoneId = text(row, "milestoneId");
    const list = tasksByMilestone.get(milestoneId) ?? [];
    list.push(row);
    tasksByMilestone.set(milestoneId, list);
  }

  return [...bundle.tables.goals].sort(byPosition).map((goalRow) => {
    const goalId = text(goalRow, "id");
    const milestones = (milestonesByGoal.get(goalId) ?? []).sort(byPosition).map((milestoneRow) => {
      const milestoneId = text(milestoneRow, "id");
      const tasks = (tasksByMilestone.get(milestoneId) ?? []).sort(byPosition).map((taskRow) => ({
        id: text(taskRow, "id"),
        title: text(taskRow, "title"),
        meta: text(taskRow, "meta"),
        estimatedMinutes: numberValue(taskRow, "estimatedMinutes", 25),
        done: boolValue(taskRow, "done"),
      }));
      return {
        id: milestoneId,
        title: text(milestoneRow, "title"),
        done: boolValue(milestoneRow, "done"),
        tasks,
      };
    });

    return {
      id: goalId,
      title: text(goalRow, "title"),
      description: text(goalRow, "description"),
      status: text(goalRow, "status", "active") as GoalStatus,
      progress: numberValue(goalRow, "progress"),
      subject: text(goalRow, "subject"),
      milestones,
    };
  });
}

function hydrateNotes(bundle: SqliteMigrationBundle): NoteItem[] {
  return bundle.tables.notes.map((row) => ({
    id: text(row, "id"),
    title: text(row, "title"),
    topic: text(row, "topic"),
    content: text(row, "content"),
    aiKeyPoints: parseJson<string[]>(row.aiKeyPointsJson, []),
    confusingPoints: parseJson<string[]>(row.confusingPointsJson, []),
    updatedAt: text(row, "updatedAt"),
  }));
}

function hydrateLibrary(bundle: SqliteMigrationBundle): LibraryItem[] {
  return bundle.tables.libraryItems.map((row) => ({
    id: text(row, "id"),
    title: text(row, "title"),
    originalFileName: text(row, "originalFileName"),
    type: text(row, "type", "NOTE") as ResourceType,
    course: text(row, "course"),
    sizeBytes: numberValue(row, "sizeBytes"),
    sizeLabel: text(row, "sizeLabel"),
    status: text(row, "status", "indexed") as LibraryItem["status"],
    tags: parseJson<string[]>(row.tagsJson, []),
    addedAt: text(row, "addedAt"),
    parserStatus: text(row, "parserStatus", "unsupported") as LibraryItem["parserStatus"],
    extractedText: text(row, "extractedText"),
    preview: text(row, "preview"),
    summary: text(row, "summary"),
    highlights: parseJson<string[]>(row.highlightsJson, []),
    linkedNodeIds: parseJson<string[]>(row.linkedNodeIdsJson, []),
    pageCount: typeof row.pageCount === "number" ? row.pageCount : undefined,
  }));
}

function hydratePractice(bundle: SqliteMigrationBundle): PracticeSet[] {
  const questionsBySet = new Map<string, Array<Record<string, unknown>>>();
  for (const row of bundle.tables.practiceQuestions) {
    const setId = text(row, "practiceSetId");
    const list = questionsBySet.get(setId) ?? [];
    list.push(row);
    questionsBySet.set(setId, list);
  }

  return [...bundle.tables.practiceSets].sort(byPosition).map((row) => {
    const setId = text(row, "id");
    const questions: PracticeQuestion[] = (questionsBySet.get(setId) ?? []).sort(byPosition).map((questionRow) => ({
      id: text(questionRow, "id"),
      prompt: text(questionRow, "prompt"),
      type: text(questionRow, "type", "简答") as PracticeQuestion["type"],
      answerHint: text(questionRow, "answerHint"),
      evidence:
        typeof questionRow.evidenceJson === "string" && questionRow.evidenceJson
          ? parseJson<PracticeQuestion["evidence"]>(questionRow.evidenceJson, undefined)
          : undefined,
    }));

    return {
      id: setId,
      title: text(row, "title"),
      resourceId: nullableText(row, "resourceId"),
      difficulty: text(row, "difficulty", "基础") as PracticeDifficulty,
      questionCount: numberValue(row, "questionCount", questions.length),
      status: text(row, "status", "ready") as PracticeStatus,
      generatedAt: text(row, "generatedAt"),
      questions,
    };
  });
}

function hydrateKnowledgeGraph(bundle: SqliteMigrationBundle) {
  const nodes: KnowledgeNode[] = bundle.tables.knowledgeNodes.map((row) => ({
    id: text(row, "id"),
    label: text(row, "label"),
    kind: text(row, "kind", "concept") as KnowledgeNodeKind,
    state: text(row, "state", "next") as KnowledgeNodeState,
    x: numberValue(row, "x"),
    y: numberValue(row, "y"),
    summary: text(row, "summary"),
    related: parseJson<string[]>(row.relatedJson, []),
    studyHint: text(row, "studyHint"),
  }));
  const edges: KnowledgeEdge[] = bundle.tables.knowledgeEdges.map((row) => ({
    id: text(row, "id"),
    source: text(row, "source"),
    target: text(row, "target"),
  }));
  return { nodes, edges };
}

function hydrateStudyEvents(bundle: SqliteMigrationBundle): StudySessionEvent[] {
  return bundle.tables.studyEvents.map((row) => ({
    id: text(row, "id"),
    type: text(row, "type", "ask") as StudySessionEventType,
    recordedAt: text(row, "recordedAt"),
    question: text(row, "question"),
    resourceId: nullableText(row, "resourceId"),
    nodeId: nullableText(row, "nodeId"),
    taskId: nullableText(row, "taskId"),
    hitResourceTitles: parseJson<string[]>(row.hitResourceTitlesJson, []),
    generatedPractice: boolValue(row, "generatedPractice"),
    practiceScore: typeof row.practiceScore === "number" ? row.practiceScore : undefined,
    practiceQuestionCount:
      typeof row.practiceQuestionCount === "number" ? row.practiceQuestionCount : undefined,
    weakQuestionPrompts:
      typeof row.weakQuestionPromptsJson === "string"
        ? parseJson<string[]>(row.weakQuestionPromptsJson, [])
        : undefined,
    progressAction:
      typeof row.progressAction === "string"
        ? (row.progressAction as StudySessionEvent["progressAction"])
        : undefined,
    llm: parseJson<StudySessionEvent["llm"]>(row.llmJson, {
      usedRealModel: false,
      providerLabel: "本地回答",
      usedFallback: true,
    }),
  }));
}

function hydrateConversations(bundle: SqliteMigrationBundle) {
  const messagesByConversation = new Map<string, Array<Record<string, unknown>>>();
  for (const row of bundle.tables.studyMessages) {
    const conversationId = text(row, "conversationId");
    const list = messagesByConversation.get(conversationId) ?? [];
    list.push(row);
    messagesByConversation.set(conversationId, list);
  }

  const conversations: PersistedStudyConversation[] = bundle.tables.studyConversations.map((row) => {
    const conversationId = text(row, "id");
    const messages = (messagesByConversation.get(conversationId) ?? []).sort(byPosition).map((messageRow) => {
      const metadata = parseJson<Record<string, unknown>>(messageRow.metadataJson, {});
      return {
        ...metadata,
        id: text(messageRow, "id"),
        role: text(messageRow, "role", "assistant") as "assistant" | "user",
        content: text(messageRow, "content"),
      } as PersistedStudyConversation["messages"][number];
    });

    return {
      id: conversationId,
      title: text(row, "title", "新建学习会话"),
      createdAt: text(row, "createdAt"),
      updatedAt: text(row, "updatedAt"),
      isFreeConversation: boolValue(row, "isFreeConversation"),
      context:
        typeof row.contextJson === "string"
          ? parseJson<PersistedStudyConversation["context"]>(row.contextJson, null)
          : null,
      selectedTaskId: text(row, "selectedTaskId"),
      teachingStyle: text(row, "teachingStyle", "analogy") as TeachingStyle,
      noteDraft: text(row, "noteDraft"),
      messages,
    };
  });

  const stateRow = bundle.tables.studyConversationState[0];
  const ids = new Set(conversations.map((item) => item.id));
  const requestedActiveId = stateRow ? nullableText(stateRow, "activeId") : null;
  const conversationState = {
    activeId: requestedActiveId && ids.has(requestedActiveId) ? requestedActiveId : null,
    sidebarMode: (stateRow && text(stateRow, "sidebarMode") === "sessions" ? "sessions" : "menu") as StudySidebarMode,
    legacySchemaVersion: stateRow ? numberValue(stateRow, "legacySchemaVersion", 2) : 2,
  };

  return { conversations, conversationState };
}

export function hydrateSqliteMigrationBundle(bundle: SqliteMigrationBundle): HydratedSqliteSnapshot {
  if (bundle.schemaVersion !== 1) {
    throw new Error(`Unsupported SQLite hydration schema: ${bundle.schemaVersion}`);
  }

  const appStateRow = bundle.tables.appState[0];
  const learningProfileRow = bundle.tables.learningProfile[0];
  const studyStatsRow = bundle.tables.studyStats[0];
  const { conversations, conversationState } = hydrateConversations(bundle);

  const data: AppData = {
    appState: {
      onboardingCompleted: appStateRow ? boolValue(appStateRow, "onboardingCompleted") : false,
    },
    learningProfile: learningProfileRow
      ? parseJson<LearningProfile | null>(learningProfileRow.dataJson, null)
      : null,
    settings: hydrateSettings(bundle.tables.settings[0]),
    goals: hydrateGoals(bundle),
    notes: hydrateNotes(bundle),
    libraryItems: hydrateLibrary(bundle),
    practiceSets: hydratePractice(bundle),
    knowledgeGraph: hydrateKnowledgeGraph(bundle),
    studyStats: {
      dailyMinutes: studyStatsRow ? parseJson<number[]>(studyStatsRow.dailyMinutesJson, []) : [],
    },
    studyRecord: {
      events: hydrateStudyEvents(bundle),
    },
  };

  return { data, conversations, conversationState };
}
