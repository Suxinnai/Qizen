export type TeachingStyle = "story" | "logic" | "analogy" | "steps";
export type GoalStatus = "active" | "done" | "paused";

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

export interface AppSettings {
  pomodoroMinutes: number;
  preferredStyle: TeachingStyle;
  remindersEnabled: boolean;
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

export interface StudyStats {
  dailyMinutes: number[];
}

export interface AppData {
  appState: AppState;
  learningProfile: LearningProfile | null;
  settings: AppSettings;
  goals: Goal[];
  notes: NoteItem[];
  studyStats: StudyStats;
}

const STORAGE_KEY = "qizhi:mvp:v1";

const defaultSettings: AppSettings = {
  pomodoroMinutes: 25,
  preferredStyle: "analogy",
  remindersEnabled: true,
};

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

function seedStats(): StudyStats {
  return {
    dailyMinutes: [18, 32, 24, 46, 38, 52, 28, 16, 22, 40, 58, 44, 30, 26, 50, 62, 48, 36, 20, 34, 56, 42, 28, 18, 38, 60, 54, 46, 32, 24],
  };
}

function defaultData(): AppData {
  return {
    appState: { onboardingCompleted: false },
    learningProfile: null,
    settings: defaultSettings,
    goals: seedGoals(),
    notes: seedNotes(),
    studyStats: seedStats(),
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
      goals: parsed.goals?.length ? parsed.goals : seedGoals(),
      notes: parsed.notes?.length ? parsed.notes : seedNotes(),
      studyStats: parsed.studyStats?.dailyMinutes?.length ? parsed.studyStats : seedStats(),
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

export function getTodayTasks(data: AppData) {
  return data.goals
    .flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks))
    .slice(0, 3);
}
