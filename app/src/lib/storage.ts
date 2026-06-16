export type TeachingStyle = "story" | "logic" | "analogy" | "steps";
export type GoalStatus = "active" | "done" | "paused";
export type ResourceType = "PDF" | "DOCX" | "MARKDOWN" | "IMAGE" | "NOTE";
export type PracticeDifficulty = "基础" | "进阶" | "综合";
export type PracticeStatus = "ready" | "generating" | "completed";
export type KnowledgeNodeKind = "topic" | "theorem" | "concept" | "application";
export type KnowledgeNodeState = "mastered" | "current" | "next" | "locked";

export interface AppState {
  onboardingCompleted: boolean;
}

export interface LearningScores {
  visual: number;
  auditory: number;
  reading: number;
  kinesthetic: number;
}

export interface LearningProfile {
  dominantMode: keyof LearningScores;
  secondaryMode: keyof LearningScores;
  scores: LearningScores;
  summary: string;
  teachingStrategies: string[];
  updatedAt: string;
}

export type LlmProviderType = "none" | "openai-compatible" | "anthropic";

export interface LlmProviderConfig {
  provider: LlmProviderType;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AppSettings {
  username?: string;
  pomodoroMinutes: number;
  preferredStyle: TeachingStyle;
  remindersEnabled: boolean;
  autoOpenStudyPanels: boolean;
  autoStartPomodoro: boolean;
  autoAppendNote: boolean;
  autoGenerateSessionTitle: boolean;
  autoSummarizeSessionNote: boolean;
  autoUpdateLearningProfile: boolean;
  requireTerminalConfirmation: "always" | "never";
  contextWindowRounds: number;
  ragSimilarityThreshold: number;
  searchCacheHours: number;
  llm: LlmProviderConfig;
}

export type StudySessionEventType = "ask" | "practice-generated" | "practice-completed" | "progress-updated";

export interface LlmAnswerRecord {
  usedRealModel: boolean;
  providerLabel: string;
  usedFallback: boolean;
}

export interface StudySessionEvent {
  id: string;
  type: StudySessionEventType;
  recordedAt: string;
  question: string;
  resourceId: string | null;
  nodeId: string | null;
  taskId?: string | null;
  hitResourceTitles: string[];
  generatedPractice: boolean;
  practiceScore?: number;
  practiceQuestionCount?: number;
  progressAction?: "task-completed" | "node-reviewed" | "blocked";
  llm: LlmAnswerRecord;
}

export interface StudyRecord {
  events: StudySessionEvent[];
}

export interface GoalTask {
  id: string;
  title: string;
  meta: string;
  estimatedMinutes: number;
  done: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  tasks: GoalTask[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  progress: number;
  subject: string;
  milestones: Milestone[];
}

export interface NoteItem {
  id: string;
  title: string;
  topic: string;
  content: string;
  aiKeyPoints: string[];
  confusingPoints: string[];
  updatedAt: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  originalFileName: string;
  type: ResourceType;
  course: string;
  sizeBytes: number;
  sizeLabel: string;
  status: "indexed" | "processing";
  tags: string[];
  addedAt: string;
  parserStatus: "parsed" | "partial" | "unsupported";
  extractedText: string;
  preview: string;
  summary: string;
  highlights: string[];
  linkedNodeIds: string[];
  pageCount?: number;
}

export interface ParsedLibraryItemInput {
  title: string;
  originalFileName: string;
  type: ResourceType;
  sizeBytes: number;
  course: string;
  tags: string[];
  parserStatus: "parsed" | "partial" | "unsupported";
  extractedText: string;
  preview: string;
  summary: string;
  highlights: string[];
  linkedNodeIds: string[];
  pageCount?: number;
}

export interface PracticeQuestionEvidence {
  sourceTitle: string;
  sourceSnippet: string;
  sourceHighlights: string[];
  sourceReason?: string;
  reasons?: string[];
  isTopHit?: boolean;
  isCurrentResource?: boolean;
  isCurrentNodeLinked?: boolean;
  confidence?: "strong" | "medium" | "weak";
}

export interface PracticeQuestion {
  id: string;
  prompt: string;
  type: "判断" | "简答" | "填空";
  answerHint: string;
  evidence?: PracticeQuestionEvidence;
}

export interface PracticeSet {
  id: string;
  title: string;
  resourceId: string | null;
  difficulty: PracticeDifficulty;
  questionCount: number;
  status: PracticeStatus;
  generatedAt: string;
  questions: PracticeQuestion[];
}

export interface KnowledgeNode {
  id: string;
  label: string;
  kind: KnowledgeNodeKind;
  state: KnowledgeNodeState;
  x: number;
  y: number;
  summary: string;
  related: string[];
  studyHint: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface StudyStats {
  dailyMinutes: number[];
}

export interface AppData {
  appState: AppState;
  learningProfile: LearningProfile | null;
  settings: AppSettings;
  goals: Goal[];
  notes: NoteItem[];
  libraryItems: LibraryItem[];
  practiceSets: PracticeSet[];
  knowledgeGraph: KnowledgeGraph;
  studyStats: StudyStats;
  studyRecord: StudyRecord;
}

export interface UploadableFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

const STORAGE_KEY = "qizen:mvp:v2";

const defaultSettings: AppSettings = {
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
    provider: "none",
    apiKey: "",
    model: "",
    baseUrl: "https://api.openai.com/v1",
  },
};

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function detectResourceType(fileName: string, mimeType: string): ResourceType {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith(".pdf") || mimeType.includes("pdf")) return "PDF";
  if (lowerFileName.endsWith(".doc") || lowerFileName.endsWith(".docx")) return "DOCX";
  if (lowerFileName.endsWith(".md") || lowerFileName.endsWith(".txt")) return "MARKDOWN";
  if (mimeType.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/i.test(lowerFileName)) return "IMAGE";
  return "NOTE";
}

function inferTags(fileName: string): string[] {
  const lowerFileName = fileName.toLowerCase();
  const tags: string[] = [];
  if (lowerFileName.includes("中值") || lowerFileName.includes("导数")) tags.push("微积分");
  if (lowerFileName.includes("线代") || lowerFileName.includes("矩阵")) tags.push("线性代数");
  if (lowerFileName.includes("英语") || lowerFileName.includes("vocab")) tags.push("英语");
  if (tags.length === 0) tags.push("待整理");
  return tags;
}

function seedGoals(): Goal[] {
  return [];
}

function seedNotes(): NoteItem[] {
  return [];
}

function seedLibraryItems(): LibraryItem[] {
  return [];
}

function inferNodeKind(label: string): KnowledgeNodeKind {
  const lower = label.toLowerCase();
  if (lower.includes("定理") || lower.includes("theorem") || lower.includes("lemma")) return "theorem";
  if (lower.includes("应用") || lower.includes("题型") || lower.includes("练习")) return "application";
  return "concept";
}

function extractTermsFromText(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .replace(/[，。、；：""''《》【】（）\[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const segments = normalized.split(/[，。、；：\s,;:]+/).filter((s) => s.length >= 2 && s.length <= 10);
  return segments;
}

function extractTermsFromLibraryItem(item: { title: string; summary: string; highlights: string[] }): string[] {
  const candidates: string[] = [];
  candidates.push(...extractTermsFromText(item.title));
  candidates.push(...extractTermsFromText(item.summary));
  for (const h of item.highlights) {
    candidates.push(...extractTermsFromText(h));
  }
  return candidates;
}

function findLinkedNodeIdsForItem(
  item: { title: string; summary: string; highlights: string[] },
  nodes: KnowledgeNode[]
): string[] {
  const haystack = [item.title, item.summary, ...item.highlights].filter(Boolean).join(" ");
  if (!haystack) return [];
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.label && node.label.length >= 2 && haystack.includes(node.label)) {
      ids.push(node.id);
    }
  }
  return Array.from(new Set(ids)).slice(0, 8);
}

function buildKnowledgeNodesFromLibraryItems(
  existingGraph: KnowledgeGraph,
  newItems: { title: string; summary: string; highlights: string[]; linkedNodeIds: string[] }[],
): KnowledgeGraph {
  const existingLabels = new Set(existingGraph.nodes.map((n) => n.label));
  const existingIds = new Set(existingGraph.nodes.map((n) => n.id));
  const addedLabels = new Set<string>();

  const newNodes: KnowledgeNode[] = [];
  const newEdges: KnowledgeEdge[] = [];
  let edgeCounter = existingGraph.edges.length + 1;

  const centerX = existingGraph.nodes.length > 0
    ? existingGraph.nodes.reduce((s, n) => s + n.x, 0) / existingGraph.nodes.length
    : 400;
  const centerY = existingGraph.nodes.length > 0
    ? existingGraph.nodes.reduce((s, n) => s + n.y, 0) / existingGraph.nodes.length
    : 250;
  let angleStep = 0;
  let nodeCounter = 0;

  for (const item of newItems) {
    const terms = extractTermsFromLibraryItem(item);
    for (const term of terms) {
      if (existingLabels.has(term) || addedLabels.has(term)) continue;
      addedLabels.add(term);

      const nodeId = `node-auto-${Date.now()}-${nodeCounter++}-${Math.random().toString(36).slice(2, 6)}`;
      const angle = angleStep;
      const radius = 160 + Math.random() * 60;
      angleStep += 0.8 + Math.random() * 0.4;

      newNodes.push({
        id: nodeId,
        label: term,
        kind: inferNodeKind(term),
        state: "next",
        x: Math.round(centerX + Math.cos(angle) * radius),
        y: Math.round(centerY + Math.sin(angle) * radius),
        summary: `从资料《${item.title}》中提取的知识点。`,
        related: [...item.linkedNodeIds],
        studyHint: "刚发现的新节点，可以从关联资料开始了解。",
      });

      for (const linkedId of item.linkedNodeIds) {
        if (existingIds.has(linkedId)) {
          newEdges.push({
            id: `edge-auto-${edgeCounter++}`,
            source: linkedId,
            target: nodeId,
          });
        }
      }
    }
  }

  return {
    nodes: [...existingGraph.nodes, ...newNodes],
    edges: [...existingGraph.edges, ...newEdges],
  };
}

function createPracticeQuestionsFromText(
  title: string,
  summary: string,
  highlights: string[],
  difficulty: PracticeDifficulty
): PracticeQuestion[] {
  const seedHighlights = highlights.length > 0 ? highlights : [summary].filter(Boolean);
  const first = seedHighlights[0] ?? `${title}的核心条件`;
  const second = seedHighlights[1] ?? `${title}的几何意义`;
  const third = seedHighlights[2] ?? `${title}的应用方式`;

  return [
    {
      id: `${title}-q1`,
      type: "判断",
      prompt: `判断：${first} 是这个知识点成立时必须优先检查的内容。`,
      answerHint: "先回到资料里的条件与前提。",
    },
    {
      id: `${title}-q2`,
      type: "简答",
      prompt: `用你自己的话解释「${second}」是什么意思。`,
      answerHint: "尽量把抽象概念换成直觉场景。",
    },
    {
      id: `${title}-q3`,
      type: difficulty === "基础" ? "填空" : "简答",
      prompt:
        difficulty === "基础"
          ? `填空：${title} 最容易考察的切入点通常是 ______ 。`
          : `简答：如果题目要求你实际应用 ${title}，你会先想到「${third}」中的哪一步？`,
      answerHint: "结合资料里的重点提炼操作顺序。",
    },
  ];
}

function seedPracticeSets(): PracticeSet[] {
  return [];
}

function seedKnowledgeGraph(): KnowledgeGraph {
  return {
    nodes: [],
    edges: [],
  };
}

function seedStats(): StudyStats {
  return {
    dailyMinutes: Array.from({ length: 30 }, () => 0),
  };
}

function seedStudyRecord(): StudyRecord {
  return {
    events: [],
  };
}

function defaultData(): AppData {
  return {
    appState: { onboardingCompleted: false },
    learningProfile: null,
    settings: defaultSettings,
    goals: seedGoals(),
    notes: seedNotes(),
    libraryItems: seedLibraryItems(),
    practiceSets: seedPracticeSets(),
    knowledgeGraph: seedKnowledgeGraph(),
    studyStats: seedStats(),
    studyRecord: seedStudyRecord(),
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeLibraryItem(item: Partial<LibraryItem>): LibraryItem {
  const originalFileName = item.originalFileName ?? item.title ?? "未命名资料";
  const sizeBytes = typeof item.sizeBytes === "number" ? item.sizeBytes : 0;
  const type = item.type ?? detectResourceType(originalFileName, "");

  return {
    id: item.id ?? `library-legacy-${Date.now()}`,
    title: item.title ?? stripExtension(originalFileName),
    originalFileName,
    type,
    course: item.course ?? "待归类",
    sizeBytes,
    sizeLabel: item.sizeLabel ?? formatBytes(sizeBytes),
    status: item.status ?? "indexed",
    tags: Array.isArray(item.tags) ? item.tags : inferTags(originalFileName),
    addedAt: item.addedAt ?? new Date().toISOString(),
    parserStatus: item.parserStatus ?? "unsupported",
    extractedText: item.extractedText ?? "",
    preview: item.preview ?? "暂未解析正文。",
    summary: item.summary ?? "当前仅完成资料收纳，正文解析尚未执行。",
    highlights: Array.isArray(item.highlights) ? item.highlights : [],
    linkedNodeIds: Array.isArray(item.linkedNodeIds) ? item.linkedNodeIds : [],
    pageCount: item.pageCount,
  };
}

const LEGACY_SEED_GOAL_IDS = new Set(["goal-math", "goal-english", "goal-python"]);
const LEGACY_SEED_NOTE_IDS = new Set(["note-1"]);
const LEGACY_SEED_LIBRARY_IDS = new Set(["library-1", "library-2", "library-3"]);
const LEGACY_SEED_PRACTICE_IDS = new Set(["practice-1", "practice-2", "practice-3"]);
const LEGACY_SEED_NODE_IDS = new Set([
  "node-limits",
  "node-continuity",
  "node-derivative",
  "node-rolle",
  "node-mvt",
  "node-cauchy",
  "node-applications",
]);
const LEGACY_SEED_STATS = [18, 32, 24, 46, 38, 52, 28, 16, 22, 40, 58, 44, 30, 26, 50, 62, 48, 36, 20, 34, 56, 42, 28, 18, 38, 60, 54, 46, 32, 24];

function isLegacySeedStats(minutes?: number[]) {
  return Array.isArray(minutes) && minutes.length === LEGACY_SEED_STATS.length && minutes.every((value, index) => value === LEGACY_SEED_STATS[index]);
}

function normalizeKnowledgeGraph(graph?: Partial<KnowledgeGraph>): KnowledgeGraph {
  if (!graph || !Array.isArray(graph.nodes)) return seedKnowledgeGraph();
  const nodes = graph.nodes.filter((node): node is KnowledgeNode => {
    return Boolean(node && typeof node.id === "string" && !LEGACY_SEED_NODE_IDS.has(node.id));
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = Array.isArray(graph.edges)
    ? graph.edges.filter((edge): edge is KnowledgeEdge => {
        return Boolean(
          edge &&
            typeof edge.id === "string" &&
            typeof edge.source === "string" &&
            typeof edge.target === "string" &&
            nodeIds.has(edge.source) &&
            nodeIds.has(edge.target)
        );
      })
    : [];
  return { nodes, edges };
}

export function loadAppData(): AppData {
  if (!canUseStorage()) return defaultData();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const data = defaultData();
    saveAppData(data);
    return data;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const data: AppData = {
      appState: parsed.appState ?? { onboardingCompleted: false },
      learningProfile: parsed.learningProfile ?? null,
      settings: {
        ...defaultSettings,
        ...(parsed.settings ?? {}),
        llm: {
          ...defaultSettings.llm,
          ...(parsed.settings?.llm ?? {}),
        },
      },
      goals: Array.isArray(parsed.goals) ? parsed.goals.filter((goal) => !LEGACY_SEED_GOAL_IDS.has(goal.id)) : seedGoals(),
      notes: Array.isArray(parsed.notes) ? parsed.notes.filter((note) => !LEGACY_SEED_NOTE_IDS.has(note.id)) : seedNotes(),
      libraryItems: parsed.libraryItems?.length
        ? parsed.libraryItems
            .filter((item) => !LEGACY_SEED_LIBRARY_IDS.has((item as Partial<LibraryItem>).id ?? ""))
            .map((item) => normalizeLibraryItem(item as Partial<LibraryItem>))
        : seedLibraryItems(),
      practiceSets: parsed.practiceSets?.length
        ? parsed.practiceSets.filter((practice) => !LEGACY_SEED_PRACTICE_IDS.has(practice.id))
        : seedPracticeSets(),
      knowledgeGraph: normalizeKnowledgeGraph(parsed.knowledgeGraph),
      studyStats:
        parsed.studyStats?.dailyMinutes?.length && !isLegacySeedStats(parsed.studyStats.dailyMinutes)
          ? parsed.studyStats
          : seedStats(),
      studyRecord: {
        events: Array.isArray(parsed.studyRecord?.events)
          ? parsed.studyRecord.events.filter((event): event is StudySessionEvent => {
              return Boolean(event && typeof event === "object" && typeof event.id === "string" && typeof event.type === "string");
            })
          : [],
      },
    };
    if (JSON.stringify(data) !== raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    return data;
  } catch {
    const data = defaultData();
    saveAppData(data);
    return data;
  }
}

export function saveAppData(data: AppData) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("qizen-appdata-change", { detail: data }));
}

export function updateAppData(updater: (data: AppData) => AppData) {
  const next = updater(loadAppData());
  saveAppData(next);
  return next;
}

export function buildLearningProfile(answers: (keyof LearningScores)[]): LearningProfile {
  const scores: LearningScores = {
    visual: 0,
    auditory: 0,
    reading: 0,
    kinesthetic: 0,
  };

  answers.forEach((answer) => {
    scores[answer] += 1;
  });

  const sorted = (Object.entries(scores) as [keyof LearningScores, number][]).sort((a, b) => b[1] - a[1]);
  const dominantMode = sorted[0][0];
  const secondaryMode = sorted[1][0];

  const summaryMap: Record<keyof LearningScores, string> = {
    visual: "你更容易通过图像、结构和关系图来理解知识。",
    auditory: "你更容易通过对话、讲解和复述来吸收知识。",
    reading: "你更容易通过文字、提纲和笔记来建立理解。",
    kinesthetic: "你更容易通过练习、操作和实际应用来真正学会。",
  };

  const strategyMap: Record<keyof LearningScores, string[]> = {
    visual: ["多用图示和结构图", "先看全局再看细节", "用知识地图串联章节"],
    auditory: ["多用对话式讲解", "学完后复述一遍", "让 AI 通过问答带着你走"],
    reading: ["整理提纲和关键定义", "通过笔记和摘要巩固", "适合逐段拆解理解"],
    kinesthetic: ["边学边做题", "尽早进入练习", "用具体场景类比抽象概念"],
  };

  return {
    dominantMode,
    secondaryMode,
    scores,
    summary: `${summaryMap[dominantMode]} 当前第二偏好是${modeLabel(secondaryMode)}型。`,
    teachingStrategies: strategyMap[dominantMode],
    updatedAt: new Date().toISOString(),
  };
}

export function modeLabel(mode: keyof LearningScores) {
  const labels: Record<keyof LearningScores, string> = {
    visual: "视觉",
    auditory: "听觉",
    reading: "阅读",
    kinesthetic: "动手",
  };
  return labels[mode];
}

export function completeOnboarding(profile: LearningProfile) {
  return updateAppData((data) => ({
    ...data,
    appState: { onboardingCompleted: true },
    learningProfile: profile,
  }));
}

export function resetOnboarding() {
  return updateAppData((data) => ({
    ...data,
    appState: { onboardingCompleted: false },
    learningProfile: null,
  }));
}

export function updateSettings(patch: Partial<AppSettings>) {
  return updateAppData((data) => ({
    ...data,
    settings: { ...data.settings, ...patch },
  }));
}

export function toggleTask(taskId: string) {
  return updateAppData((data) => ({
    ...data,
    goals: data.goals.map((goal) => {
      const milestones = goal.milestones.map((milestone) => {
        const tasks = milestone.tasks.map((task) =>
          task.id === taskId ? { ...task, done: !task.done } : task
        );
        return {
          ...milestone,
          done: tasks.length > 0 && tasks.every((task) => task.done),
          tasks,
        };
      });
      const tasks = milestones.flatMap((milestone) => milestone.tasks);
      const progress = tasks.length > 0 ? tasks.filter((task) => task.done).length / tasks.length : 0;
      return {
        ...goal,
        milestones,
        progress,
        status: progress >= 1 ? "done" : goal.status === "done" ? "active" : goal.status,
      };
    }),
  }));
}

export function addGoal(input: { title: string; description?: string; subject?: string; firstTaskTitle?: string; estimatedMinutes?: number }) {
  const now = Date.now();
  const title = input.title.trim();
  const firstTaskTitle = (input.firstTaskTitle ?? title).trim();
  return updateAppData((data) => ({
    ...data,
    goals: [
      {
        id: `goal-${now}`,
        title,
        description: input.description?.trim() || "从一个明确任务开始推进。",
        status: "active",
        progress: 0,
        subject: input.subject?.trim() || "未分类",
        milestones: [
          {
            id: `milestone-${now}`,
            title: "第一阶段",
            done: false,
            tasks: [
              {
                id: `task-${now}`,
                title: firstTaskTitle,
                meta: `约 ${input.estimatedMinutes ?? 25} 分钟 · 学习`,
                estimatedMinutes: input.estimatedMinutes ?? 25,
                done: false,
              },
            ],
          },
        ],
      },
      ...data.goals,
    ],
  }));
}

export function addLearningPlanGoal(input: {
  title: string;
  description?: string;
  subject?: string;
  steps: Array<{ title: string; minutes: number }>;
}) {
  const now = Date.now();
  const title = input.title.trim() || "新的学习计划";
  const steps = input.steps.length > 0 ? input.steps : [{ title, minutes: 25 }];
  const midpoint = Math.max(1, Math.ceil(steps.length / 2));
  const groups = [steps.slice(0, midpoint), steps.slice(midpoint)].filter((group) => group.length > 0);

  return updateAppData((data) => ({
    ...data,
    goals: [
      {
        id: `goal-${now}`,
        title,
        description: input.description?.trim() || "由学习对话确认后生成的执行计划。",
        status: "active",
        progress: 0,
        subject: input.subject?.trim() || "AI 学习计划",
        milestones: groups.map((group, groupIndex) => ({
          id: `milestone-${now}-${groupIndex}`,
          title: groupIndex === 0 ? "建立理解" : "练习巩固",
          done: false,
          tasks: group.map((step, stepIndex) => ({
            id: `task-${now}-${groupIndex}-${stepIndex}`,
            title: step.title.trim() || `学习任务 ${groupIndex * midpoint + stepIndex + 1}`,
            meta: `约 ${Math.max(5, Math.round(step.minutes))} 分钟 · 学习计划`,
            estimatedMinutes: Math.max(5, Math.round(step.minutes)),
            done: false,
          })),
        })),
      },
      ...data.goals,
    ],
  }));
}

export function updatePracticeSetStatus(practiceSetId: string, status: PracticeStatus) {
  return updateAppData((data) => ({
    ...data,
    practiceSets: data.practiceSets.map((practiceSet) =>
      practiceSet.id === practiceSetId ? { ...practiceSet, status } : practiceSet
    ),
  }));
}

export function updateNote(noteId: string, content: string) {
  return updateAppData((data) => ({
    ...data,
    notes: data.notes.map((note) =>
      note.id === noteId ? { ...note, content, updatedAt: new Date().toISOString() } : note
    ),
  }));
}

export function addNote(input: { title: string; topic?: string; content?: string }) {
  const now = new Date().toISOString();
  return updateAppData((data) => ({
    ...data,
    notes: [
      {
        id: `note-${Date.now()}`,
        title: input.title.trim(),
        topic: input.topic?.trim() || "未分类",
        content: input.content ?? "",
        aiKeyPoints: [],
        confusingPoints: [],
        updatedAt: now,
      },
      ...data.notes,
    ],
  }));
}

export function exportAppData() {
  return JSON.stringify(loadAppData(), null, 2);
}

export function resetAppData() {
  const data = defaultData();
  saveAppData(data);
  return data;
}

export function addLibraryFiles(files: UploadableFile[]) {
  return updateAppData((data) => {
    const addedAt = new Date().toISOString();
    const newLibraryItems: LibraryItem[] = files.map((file, index) => {
      const resourceType = detectResourceType(file.name, file.type);
      return {
        id: `library-upload-${Date.now()}-${index}`,
        title: stripExtension(file.name),
        originalFileName: file.name,
        type: resourceType,
        course: "待归类",
        sizeBytes: file.size,
        sizeLabel: formatBytes(file.size),
        status: "indexed",
        tags: inferTags(file.name),
        addedAt,
        parserStatus: "unsupported",
        extractedText: "",
        preview: "",
        summary: "这份资料已收纳，正文解析需要通过资料库上传入口完成。",
        highlights: [],
        linkedNodeIds: [],
      };
    });

    return {
      ...data,
      libraryItems: [...newLibraryItems, ...data.libraryItems],
    };
  });
}

export function addParsedLibraryItems(items: ParsedLibraryItemInput[]) {
  return updateAppData((data) => {
    const addedAt = new Date().toISOString();
    const newLibraryItems: LibraryItem[] = items.map((item, index) => ({
      id: `library-upload-${Date.now()}-${index}`,
      title: item.title,
      originalFileName: item.originalFileName,
      type: item.type,
      course: item.course,
      sizeBytes: item.sizeBytes,
      sizeLabel: formatBytes(item.sizeBytes),
      status: "indexed",
      tags: item.tags,
      addedAt,
      parserStatus: item.parserStatus,
      extractedText: item.extractedText,
      preview: item.preview,
      summary: item.summary,
      highlights: item.highlights,
      // 先关联到已存在的图谱节点，使建图时能生成连边；建图后再补上新建节点。
      linkedNodeIds: findLinkedNodeIdsForItem(item, data.knowledgeGraph.nodes),
      pageCount: item.pageCount,
    }));

    const newPracticeSets: PracticeSet[] = newLibraryItems.map((item, index) => {
      const difficulty: PracticeDifficulty = item.parserStatus === "parsed" ? "进阶" : "基础";
      const questionCount = item.type === "PDF" ? 8 : item.type === "DOCX" ? 6 : 5;
      return {
        id: `practice-upload-${Date.now()}-${index}`,
        title: `基于《${item.title}》生成的 ${questionCount} 题练习`,
        resourceId: item.id,
        difficulty,
        questionCount,
        status: "ready",
        generatedAt: addedAt,
        questions: createPracticeQuestionsFromText(item.title, item.summary, item.highlights, difficulty),
      };
    });

    const nextGraph = buildKnowledgeNodesFromLibraryItems(
      data.knowledgeGraph,
      newLibraryItems.map((item) => ({
        title: item.title,
        summary: item.summary,
        highlights: item.highlights,
        linkedNodeIds: item.linkedNodeIds,
      })),
    );

    // 建图后，关联范围扩展到新建节点，让资料"关联知识节点"展示真实可点的节点。
    const linkedLibraryItems = newLibraryItems.map((item) => ({
      ...item,
      linkedNodeIds: findLinkedNodeIdsForItem(item, nextGraph.nodes),
    }));

    return {
      ...data,
      libraryItems: [...linkedLibraryItems, ...data.libraryItems],
      practiceSets: [...newPracticeSets, ...data.practiceSets],
      knowledgeGraph: nextGraph,
    };
  });
}

export function appendStudySessionEvent(event: StudySessionEvent) {
  return updateAppData((data) => ({
    ...data,
    studyRecord: {
      events: [...data.studyRecord.events, event],
    },
    studyStats: {
      dailyMinutes: data.studyStats.dailyMinutes.map((minutes, index, list) =>
        index === list.length - 1 ? minutes + (event.type === "ask" ? 3 : event.type === "practice-completed" ? 5 : 1) : minutes
      ),
    },
  }));
}

export function getStudyInteractionCount(data?: AppData) {
  const source = data ?? loadAppData();
  return source.studyRecord.events.length;
}

export function getTodayTasks(data: AppData) {
  return data.goals
    .flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks))
    .slice(0, 3);
}
