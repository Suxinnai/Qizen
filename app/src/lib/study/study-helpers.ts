import type { AppData, GoalTask, TeachingStyle } from "../storage";
import type { ChatMessage } from "./types";
import { teachingStyleLabel } from "./reply-policy";

export function getStudyTree(data: AppData) {
  return data.goals.find((goal) => goal.id === "goal-math") ?? data.goals[0];
}

export function flattenTasks(data: AppData): GoalTask[] {
  return data.goals.flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks));
}

export function buildInitialMessages(
  style: TeachingStyle,
  resourceTitle?: string,
  nodeLabel?: string,
  isFreeConversation = false
): ChatMessage[] {
  if (isFreeConversation) return [];

  if (resourceTitle) {
    return [
      {
        id: "m1",
        role: "assistant",
        content:
          `我已经把《${resourceTitle}》带进来了。` +
          (nodeLabel ? `它现在主要挂在「${nodeLabel}」这个知识点上。` : "") +
          `\n\n接下来我会优先用资料库里的内容来回答你；如果资料没命中，我也会继续走大模型的通用解释，不会只卡在资料库里。`,
        triggers: ["graph", "resource"],
      },
      {
        id: "m2",
        role: "assistant",
        content:
          `当前讲解风格是${teachingStyleLabel(style)}。你现在可以直接追问概念、条件、例子、证明思路，也可以随时新开一个学习会话换题。`,
        triggers: ["resource"],
      },
    ];
  }

  return [];
}
