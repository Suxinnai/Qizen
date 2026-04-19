export type LearningStyleKey = "visual" | "auditory" | "reading" | "kinesthetic";

export type TeachingStyle = "启发式" | "结构化" | "项目制";

export interface AppState {
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
}

export interface LearningProfile {
  scores: Record<LearningStyleKey, number>;
  primaryStyle: LearningStyleKey;
  secondaryStyle: LearningStyleKey;
  summary: string;
  tips: string[];
  completedAt: string;
}

export interface Settings {
  defaultPomodoroMinutes: number;
  defaultTeachingStyle: TeachingStyle;
  remindersEnabled: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  horizon: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description: string;
}

export interface Task {
  id: string;
  goalId: string;
  milestoneId: string;
  title: string;
  meta: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  extractedHighlights: string[];
}

export interface RootStore {
  version: 1;
  appState: AppState;
  learningProfile: LearningProfile | null;
  goals: Goal[];
  milestones: Milestone[];
  tasks: Task[];
  notes: Note[];
  settings: Settings;
}
