import type { AppData } from "../storage";
import type { PersistedStudyConversation, StudySidebarMode } from "../studyConversations";

export const SQLITE_SCHEMA_VERSION = 1;

export interface StudyConversationMigrationState {
  activeId: string | null;
  sidebarMode: StudySidebarMode;
  legacySchemaVersion?: number;
}

export interface SqliteMigrationBundle {
  schemaVersion: number;
  generatedAt: string;
  tables: {
    appState: Array<Record<string, unknown>>;
    settings: Array<Record<string, unknown>>;
    learningProfile: Array<Record<string, unknown>>;
    goals: Array<Record<string, unknown>>;
    milestones: Array<Record<string, unknown>>;
    goalTasks: Array<Record<string, unknown>>;
    notes: Array<Record<string, unknown>>;
    libraryItems: Array<Record<string, unknown>>;
    practiceSets: Array<Record<string, unknown>>;
    practiceQuestions: Array<Record<string, unknown>>;
    knowledgeNodes: Array<Record<string, unknown>>;
    knowledgeEdges: Array<Record<string, unknown>>;
    studyStats: Array<Record<string, unknown>>;
    studyEvents: Array<Record<string, unknown>>;
    studyConversationState: Array<Record<string, unknown>>;
    studyConversations: Array<Record<string, unknown>>;
    studyMessages: Array<Record<string, unknown>>;
  };
}

function bool(value: boolean) {
  return value ? 1 : 0;
}

function json(value: unknown) {
  return JSON.stringify(value ?? null);
}

function sanitizeSettings(data: AppData) {
  return {
    ...data.settings,
    llm: {
      ...data.settings.llm,
      apiKey: "",
    },
  };
}

function messageMetadata(message: PersistedStudyConversation["messages"][number]) {
  const {
    id: _id,
    role: _role,
    content: _content,
    ...metadata
  } = message;
  return metadata;
}

/**
 * Convert the current localStorage-shaped data into deterministic SQLite rows.
 *
 * This function is intentionally pure: it does not read localStorage, open a
 * database, or mutate the source objects. The Electron persistence layer can
 * later consume the returned rows in one transaction.
 */
export function buildSqliteMigrationBundle(
  data: AppData,
  conversations: PersistedStudyConversation[] = [],
  conversationState: StudyConversationMigrationState = {
    activeId: null,
    sidebarMode: "menu",
    legacySchemaVersion: 2,
  },
  generatedAt = new Date().toISOString()
): SqliteMigrationBundle {
  const goals: Array<Record<string, unknown>> = [];
  const milestones: Array<Record<string, unknown>> = [];
  const goalTasks: Array<Record<string, unknown>> = [];

  data.goals.forEach((goal, goalIndex) => {
    goals.push({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: goal.status,
      progress: goal.progress,
      subject: goal.subject,
      position: goalIndex,
    });

    goal.milestones.forEach((milestone, milestoneIndex) => {
      milestones.push({
        id: milestone.id,
        goalId: goal.id,
        title: milestone.title,
        done: bool(milestone.done),
        position: milestoneIndex,
      });

      milestone.tasks.forEach((task, taskIndex) => {
        goalTasks.push({
          id: task.id,
          milestoneId: milestone.id,
          title: task.title,
          meta: task.meta,
          estimatedMinutes: task.estimatedMinutes,
          done: bool(task.done),
          position: taskIndex,
        });
      });
    });
  });

  const practiceSets: Array<Record<string, unknown>> = [];
  const practiceQuestions: Array<Record<string, unknown>> = [];
  data.practiceSets.forEach((set, setIndex) => {
    practiceSets.push({
      id: set.id,
      title: set.title,
      resourceId: set.resourceId,
      difficulty: set.difficulty,
      questionCount: set.questionCount,
      status: set.status,
      generatedAt: set.generatedAt,
      position: setIndex,
    });

    set.questions.forEach((question, questionIndex) => {
      practiceQuestions.push({
        id: question.id,
        practiceSetId: set.id,
        prompt: question.prompt,
        type: question.type,
        answerHint: question.answerHint,
        evidenceJson: question.evidence ? json(question.evidence) : null,
        position: questionIndex,
      });
    });
  });

  const studyConversations: Array<Record<string, unknown>> = [];
  const studyMessages: Array<Record<string, unknown>> = [];
  conversations.forEach((conversation) => {
    studyConversations.push({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      isFreeConversation: bool(conversation.isFreeConversation),
      contextJson: conversation.context ? json(conversation.context) : null,
      selectedTaskId: conversation.selectedTaskId,
      teachingStyle: conversation.teachingStyle,
      noteDraft: conversation.noteDraft,
    });

    conversation.messages.forEach((message, messageIndex) => {
      studyMessages.push({
        id: message.id,
        conversationId: conversation.id,
        role: message.role,
        content: message.content,
        metadataJson: json(messageMetadata(message)),
        position: messageIndex,
      });
    });
  });

  return {
    schemaVersion: SQLITE_SCHEMA_VERSION,
    generatedAt,
    tables: {
      appState: [
        {
          id: 1,
          onboardingCompleted: bool(data.appState.onboardingCompleted),
        },
      ],
      settings: [
        {
          id: 1,
          dataJson: json(sanitizeSettings(data)),
        },
      ],
      learningProfile: data.learningProfile
        ? [{ id: 1, dataJson: json(data.learningProfile) }]
        : [],
      goals,
      milestones,
      goalTasks,
      notes: data.notes.map((note) => ({
        id: note.id,
        title: note.title,
        topic: note.topic,
        content: note.content,
        aiKeyPointsJson: json(note.aiKeyPoints),
        confusingPointsJson: json(note.confusingPoints),
        updatedAt: note.updatedAt,
      })),
      libraryItems: data.libraryItems.map((item) => ({
        id: item.id,
        title: item.title,
        originalFileName: item.originalFileName,
        type: item.type,
        course: item.course,
        sizeBytes: item.sizeBytes,
        sizeLabel: item.sizeLabel,
        status: item.status,
        tagsJson: json(item.tags),
        addedAt: item.addedAt,
        parserStatus: item.parserStatus,
        extractedText: item.extractedText,
        preview: item.preview,
        summary: item.summary,
        highlightsJson: json(item.highlights),
        linkedNodeIdsJson: json(item.linkedNodeIds),
        pageCount: item.pageCount ?? null,
      })),
      practiceSets,
      practiceQuestions,
      knowledgeNodes: data.knowledgeGraph.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        kind: node.kind,
        state: node.state,
        x: node.x,
        y: node.y,
        summary: node.summary,
        relatedJson: json(node.related),
        studyHint: node.studyHint,
      })),
      knowledgeEdges: data.knowledgeGraph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      studyStats: [
        {
          id: 1,
          dailyMinutesJson: json(data.studyStats.dailyMinutes),
        },
      ],
      studyEvents: data.studyRecord.events.map((event) => ({
        id: event.id,
        type: event.type,
        recordedAt: event.recordedAt,
        question: event.question,
        resourceId: event.resourceId,
        nodeId: event.nodeId,
        taskId: event.taskId ?? null,
        hitResourceTitlesJson: json(event.hitResourceTitles),
        generatedPractice: bool(event.generatedPractice),
        practiceScore: event.practiceScore ?? null,
        practiceQuestionCount: event.practiceQuestionCount ?? null,
        weakQuestionPromptsJson: event.weakQuestionPrompts ? json(event.weakQuestionPrompts) : null,
        progressAction: event.progressAction ?? null,
        llmJson: json(event.llm),
      })),
      studyConversationState: [
        {
          id: 1,
          activeId:
            conversationState.activeId && conversations.some((item) => item.id === conversationState.activeId)
              ? conversationState.activeId
              : null,
          sidebarMode: conversationState.sidebarMode,
          legacySchemaVersion: conversationState.legacySchemaVersion ?? 2,
        },
      ],
      studyConversations,
      studyMessages,
    },
  };
}
