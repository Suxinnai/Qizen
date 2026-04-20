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
  pomodoroMinutes: number;
  preferredStyle: TeachingStyle;
  remindersEnabled: boolean;
  llm: LlmProviderConfig;
}

export type StudySessionEventType = "ask" | "practice-generated";

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
  hitResourceTitles: string[];
  generatedPractice: boolean;
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
  pomodoroMinutes: 25,
  preferredStyle: "analogy",
  remindersEnabled: true,
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
  return [
    {
      id: "goal-math",
      title: "高数上",
      description: "本学期期末前完成微分与中值定理的理解和练习。",
      status: "active",
      progress: 0.35,
      subject: "数学",
      milestones: [
        {
          id: "math-m1",
          title: "第 3 章 微分中值定理",
          done: false,
          tasks: [
            {
              id: "task-math-1",
              title: "复习《人类简史》第 4 章",
              meta: "约 25 分钟 · 阅读",
              estimatedMinutes: 25,
              done: true,
            },
            {
              id: "task-math-2",
              title: "完成线性代数练习册 P12-15",
              meta: "约 40 分钟 · 练习",
              estimatedMinutes: 40,
              done: false,
            },
          ],
        },
        {
          id: "math-m2",
          title: "第 4 章 导数应用",
          done: false,
          tasks: [
            {
              id: "task-math-3",
              title: "整理产品设计课堂笔记",
              meta: "约 15 分钟 · 笔记",
              estimatedMinutes: 15,
              done: false,
            },
          ],
        },
      ],
    },
    {
      id: "goal-english",
      title: "考研英语",
      description: "稳步建立阅读理解和词汇复习节奏。",
      status: "active",
      progress: 0.12,
      subject: "英语",
      milestones: [
        {
          id: "eng-m1",
          title: "Unit 12 词汇强化",
          done: false,
          tasks: [
            {
              id: "task-eng-1",
              title: "英语词汇 · Unit 12",
              meta: "约 12 分钟 · 复习",
              estimatedMinutes: 12,
              done: false,
            },
          ],
        },
      ],
    },
    {
      id: "goal-python",
      title: "Python 入门",
      description: "已完成的技能型目标，用来展示已完成状态。",
      status: "done",
      progress: 1,
      subject: "编程",
      milestones: [
        {
          id: "py-m1",
          title: "基础语法与函数",
          done: true,
          tasks: [
            {
              id: "task-py-1",
              title: "完成基础语法练习",
              meta: "约 30 分钟 · 练习",
              estimatedMinutes: 30,
              done: true,
            },
          ],
        },
      ],
    },
  ];
}

function seedNotes(): NoteItem[] {
  return [
    {
      id: "note-1",
      title: "拉格朗日中值定理",
      topic: "高数",
      content:
        "# 拉格朗日中值定理\n\n如果函数在闭区间上连续、在开区间内可导，那么一定存在一点 c，使得整体平均变化率等于某一点的瞬时变化率。\n\n- 关键词：连续、可导、某一点 c\n- 直觉：从起点开到终点，总有一瞬间速度等于平均速度\n\n> 它是把整体和局部连接起来的桥。",
      aiKeyPoints: ["闭区间连续", "开区间可导", "平均变化率 = 某点导数"],
      confusingPoints: ["不要忘记端点连续条件", "罗尔定理是它的特殊情况"],
      updatedAt: new Date().toISOString(),
    },
  ];
}

function seedLibraryItems(): LibraryItem[] {
  return [
    {
      id: "library-1",
      title: "微积分学习手册",
      originalFileName: "微积分学习手册.pdf",
      type: "PDF",
      course: "高数上",
      sizeBytes: 2_420_000,
      sizeLabel: formatBytes(2_420_000),
      status: "indexed",
      tags: ["微积分", "定理", "概念"],
      addedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      parserStatus: "parsed",
      extractedText: "微积分学习手册节选：拉格朗日中值定理要求函数在闭区间上连续、在开区间内可导。它说明整体平均变化率一定能在某一点对应到瞬时变化率。几何上可以理解为某点切线与端点割线平行。",
      preview: "拉格朗日中值定理要求函数在闭区间上连续、在开区间内可导。它把整体平均变化率与局部瞬时变化率联系起来。",
      summary: "这份资料主要讲中值定理的使用条件、几何意义，以及和罗尔定理之间的关系。适合拿来快速回顾概念。",
      highlights: ["闭区间连续", "开区间可导", "切线平行于割线"],
      linkedNodeIds: ["node-continuity", "node-rolle", "node-mvt"],
      pageCount: 24,
    },
    {
      id: "library-2",
      title: "第 3 章课堂笔记",
      originalFileName: "第3章课堂笔记.md",
      type: "MARKDOWN",
      course: "高数上",
      sizeBytes: 16_400,
      sizeLabel: formatBytes(16_400),
      status: "indexed",
      tags: ["微积分", "笔记"],
      addedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      parserStatus: "parsed",
      extractedText: "# 第 3 章 微分中值定理\n\n- 罗尔定理是中值定理的特殊情况\n- 拉格朗日中值定理说明平均变化率与瞬时变化率的联系\n- 柯西中值定理是进一步推广\n\n> 证明题里要先验条件，再套结论。",
      preview: "罗尔定理是中值定理的特殊情况；拉格朗日中值定理说明平均变化率与瞬时变化率的联系。",
      summary: "这是课堂笔记型资料，信息比较凝练，适合用来抽重点和生成判断题。",
      highlights: ["罗尔定理是特殊情况", "先验条件，再套结论", "可用于判断题生成"],
      linkedNodeIds: ["node-rolle", "node-mvt", "node-cauchy"],
    },
    {
      id: "library-3",
      title: "中值定理例题合集",
      originalFileName: "中值定理例题合集.docx",
      type: "DOCX",
      course: "高数上",
      sizeBytes: 680_000,
      sizeLabel: formatBytes(680_000),
      status: "indexed",
      tags: ["微积分", "练习"],
      addedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      parserStatus: "partial",
      extractedText: "文档内容暂未做完整解析，但已识别为中值定理相关例题资料。",
      preview: "例题合集，适合后续生成专项练习。",
      summary: "当前版本能识别这是中值定理练习资料，但对 DOCX 的正文解析还只做到基础元信息层。",
      highlights: ["中值定理例题", "适合专项练习", "后续补 DOCX 深度解析"],
      linkedNodeIds: ["node-mvt", "node-applications"],
    },
  ];
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
  return [
    {
      id: "practice-1",
      title: "基于《微积分学习手册》生成的 8 题基础练习",
      resourceId: "library-1",
      difficulty: "基础",
      questionCount: 8,
      status: "ready",
      generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      questions: createPracticeQuestionsFromText(
        "微积分学习手册",
        "讲中值定理的使用条件、几何意义，以及和罗尔定理之间的关系。",
        ["闭区间连续", "开区间可导", "切线平行于割线"],
        "基础"
      ),
    },
    {
      id: "practice-2",
      title: "中值定理判断题 · 6 题",
      resourceId: "library-2",
      difficulty: "进阶",
      questionCount: 6,
      status: "ready",
      generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      questions: createPracticeQuestionsFromText(
        "第 3 章课堂笔记",
        "课堂笔记型资料，信息凝练，适合抽重点和生成判断题。",
        ["罗尔定理是特殊情况", "先验条件，再套结论", "可用于判断题生成"],
        "进阶"
      ),
    },
    {
      id: "practice-3",
      title: "导数应用综合小测",
      resourceId: null,
      difficulty: "综合",
      questionCount: 10,
      status: "ready",
      generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      questions: createPracticeQuestionsFromText(
        "导数应用综合小测",
        "把中值定理与导数应用题联系起来。",
        ["中值定理", "导数应用", "证明题"],
        "综合"
      ),
    },
  ];
}

function seedKnowledgeGraph(): KnowledgeGraph {
  return {
    nodes: [
      {
        id: "node-limits",
        label: "极限",
        kind: "concept",
        state: "mastered",
        x: 140,
        y: 120,
        summary: "理解函数趋近过程，是连续与导数的前提。",
        related: ["node-continuity", "node-derivative"],
        studyHint: "已经掌握，可以作为回忆入口。",
      },
      {
        id: "node-continuity",
        label: "连续性",
        kind: "concept",
        state: "mastered",
        x: 300,
        y: 90,
        summary: "中值定理的使用条件之一是闭区间连续。",
        related: ["node-limits", "node-rolle", "node-mvt"],
        studyHint: "重点回忆闭区间连续这个前置条件。",
      },
      {
        id: "node-derivative",
        label: "导数",
        kind: "concept",
        state: "mastered",
        x: 300,
        y: 250,
        summary: "中值定理的第二个关键前提是开区间可导。",
        related: ["node-limits", "node-rolle", "node-mvt", "node-applications"],
        studyHint: "和瞬时变化率概念直接相关。",
      },
      {
        id: "node-rolle",
        label: "罗尔定理",
        kind: "theorem",
        state: "mastered",
        x: 470,
        y: 90,
        summary: "中值定理的特殊形式，是很多证明的起点。",
        related: ["node-continuity", "node-derivative", "node-mvt"],
        studyHint: "先想等高端点，再过渡到一般中值定理。",
      },
      {
        id: "node-mvt",
        label: "中值定理",
        kind: "theorem",
        state: "current",
        x: 510,
        y: 180,
        summary: "把整体平均变化率和局部瞬时变化率连接起来。",
        related: ["node-rolle", "node-cauchy", "node-applications"],
        studyHint: "当前学习核心，先抓几何意义再记条件。",
      },
      {
        id: "node-cauchy",
        label: "柯西中值定理",
        kind: "theorem",
        state: "next",
        x: 700,
        y: 130,
        summary: "中值定理的推广形式，为不等式和极限证明提供工具。",
        related: ["node-mvt"],
        studyHint: "下一步会自然接上。",
      },
      {
        id: "node-applications",
        label: "导数应用",
        kind: "application",
        state: "locked",
        x: 720,
        y: 260,
        summary: "用中值定理处理单调性、估值和证明题。",
        related: ["node-derivative", "node-mvt"],
        studyHint: "先学懂中值定理，再去做应用题。",
      },
    ],
    edges: [
      { id: "edge-1", source: "node-limits", target: "node-continuity" },
      { id: "edge-2", source: "node-limits", target: "node-derivative" },
      { id: "edge-3", source: "node-continuity", target: "node-rolle" },
      { id: "edge-4", source: "node-derivative", target: "node-rolle" },
      { id: "edge-5", source: "node-rolle", target: "node-mvt" },
      { id: "edge-6", source: "node-derivative", target: "node-mvt" },
      { id: "edge-7", source: "node-mvt", target: "node-cauchy" },
      { id: "edge-8", source: "node-mvt", target: "node-applications" },
    ],
  };
}

function seedStats(): StudyStats {
  return {
    dailyMinutes: [18, 32, 24, 46, 38, 52, 28, 16, 22, 40, 58, 44, 30, 26, 50, 62, 48, 36, 20, 34, 56, 42, 28, 18, 38, 60, 54, 46, 32, 24],
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
    return {
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
      goals: parsed.goals?.length ? parsed.goals : seedGoals(),
      notes: parsed.notes?.length ? parsed.notes : seedNotes(),
      libraryItems: parsed.libraryItems?.length
        ? parsed.libraryItems.map((item) => normalizeLibraryItem(item as Partial<LibraryItem>))
        : seedLibraryItems(),
      practiceSets: parsed.practiceSets?.length ? parsed.practiceSets : seedPracticeSets(),
      knowledgeGraph: parsed.knowledgeGraph?.nodes?.length ? parsed.knowledgeGraph : seedKnowledgeGraph(),
      studyStats: parsed.studyStats?.dailyMinutes?.length ? parsed.studyStats : seedStats(),
      studyRecord: {
        events: Array.isArray(parsed.studyRecord?.events)
          ? parsed.studyRecord.events.filter((event): event is StudySessionEvent => {
              return Boolean(event && typeof event === "object" && typeof event.id === "string" && typeof event.type === "string");
            })
          : [],
      },
    };
  } catch {
    const data = defaultData();
    saveAppData(data);
    return data;
  }
}

export function saveAppData(data: AppData) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    goals: data.goals.map((goal) => ({
      ...goal,
      milestones: goal.milestones.map((milestone) => ({
        ...milestone,
        tasks: milestone.tasks.map((task) =>
          task.id === taskId ? { ...task, done: !task.done } : task
        ),
      })),
    })),
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
        preview: "暂未解析正文。",
        summary: "当前仅完成资料收纳，正文解析尚未执行。",
        highlights: ["待解析"],
        linkedNodeIds: [],
      };
    });

    const newPracticeSets: PracticeSet[] = newLibraryItems.map((item, index) => {
      const difficulty = item.type === "PDF" ? "基础" : item.type === "DOCX" ? "进阶" : "综合";
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

    return {
      ...data,
      libraryItems: [...newLibraryItems, ...data.libraryItems],
      practiceSets: [...newPracticeSets, ...data.practiceSets],
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
      linkedNodeIds: item.linkedNodeIds,
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

    return {
      ...data,
      libraryItems: [...newLibraryItems, ...data.libraryItems],
      practiceSets: [...newPracticeSets, ...data.practiceSets],
    };
  });
}

export function appendStudySessionEvent(event: StudySessionEvent) {
  return updateAppData((data) => ({
    ...data,
    studyRecord: {
      events: [...data.studyRecord.events, event],
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
