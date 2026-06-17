import type { PracticeDifficulty, StudySessionEvent } from "../storage";

export interface LearnerLevel {
  difficulty: PracticeDifficulty;
  completedPractice: number;
  reason: string;
}

// 根据学习记录推断当前难度档位：完成的练习越多、完成率越高，难度越高。
// 纯函数，便于单测；出题逻辑据此调整题量与题型组合。
export function inferLearnerLevel(events: StudySessionEvent[]): LearnerLevel {
  const completed = events.filter((event) => event.type === "practice-completed").length;
  const generated = events.filter((event) => event.type === "practice-generated").length;
  const asks = events.filter((event) => event.type === "ask").length;
  const completionRatio = generated > 0 ? completed / generated : 0;

  if (completed >= 6 && completionRatio >= 0.6) {
    return {
      difficulty: "综合",
      completedPractice: completed,
      reason: "你已稳定完成多组练习，难度上调到综合应用。",
    };
  }
  if (completed >= 2 || asks >= 12) {
    return {
      difficulty: "进阶",
      completedPractice: completed,
      reason: "你已有一定练习基础，难度设为进阶。",
    };
  }
  return {
    difficulty: "基础",
    completedPractice: completed,
    reason: "先从基础题建立信心，完成后会自动加大难度。",
  };
}

export const PRACTICE_COUNT_BY_DIFFICULTY: Record<PracticeDifficulty, number> = {
  基础: 3,
  进阶: 4,
  综合: 5,
};
