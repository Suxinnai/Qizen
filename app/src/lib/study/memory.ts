import type { AppData } from "../storage";
import { inferLearningTopic } from "./message-builders";

// 长期学习记忆：全部从既有的 studyRecord / studyStats 派生，不引入新的持久层，
// 与 Reports 同一套"按需派生"思路。诚实说明：练习暂无答题判分，
// 因此这里给出的是"反复涉及、值得巩固的点"，而非严格意义的"常错点"。

export interface WeakPoint {
  key: string;
  kind: "resource" | "topic" | "practice";
  occurrences: number;
  lastSeenAt: string;
}

function shortenPrompt(prompt: string): string {
  const stripped = prompt.replace(/^(判断|简答|填空|应用|综合)(并说明理由)?[:：]\s*/, "").trim();
  return stripped.length <= 26 ? stripped : `${stripped.slice(0, 26)}…`;
}

export interface StudyStreak {
  current: number;
  longest: number;
  lastStudyDate: string | null;
}

export interface LearnerMemory {
  streak: StudyStreak;
  totalActiveDays: number;
  weakPoints: WeakPoint[];
  /** 是否存在来自练习判分的真实答错点（决定 UI 用"常错点"还是"需巩固的点"） */
  hasGradedWeakPoints: boolean;
  realModelRatio: number;
  preferredProvider: string | null;
  totalInteractions: number;
}

function deriveStreak(dailyMinutes: number[]): StudyStreak & { totalActiveDays: number } {
  let current = 0;
  for (let i = dailyMinutes.length - 1; i >= 0; i -= 1) {
    if (dailyMinutes[i] > 0) current += 1;
    else break;
  }

  let longest = 0;
  let run = 0;
  for (const minutes of dailyMinutes) {
    if (minutes > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  const totalActiveDays = dailyMinutes.filter((m) => m > 0).length;

  let lastStudyDate: string | null = null;
  for (let i = dailyMinutes.length - 1; i >= 0; i -= 1) {
    if (dailyMinutes[i] > 0) {
      const date = new Date();
      date.setDate(date.getDate() - (dailyMinutes.length - 1 - i));
      lastStudyDate = date.toISOString().slice(0, 10);
      break;
    }
  }

  return { current, longest, lastStudyDate, totalActiveDays };
}

export function deriveLearnerMemory(data: AppData): LearnerMemory {
  const events = data.studyRecord.events;
  const { current, longest, lastStudyDate, totalActiveDays } = deriveStreak(data.studyStats.dailyMinutes);

  const bumpInto = (map: Map<string, WeakPoint>, rawKey: string, kind: WeakPoint["kind"], at: string) => {
    const key = rawKey.trim();
    if (!key || key === "这个主题") return;
    const existing = map.get(key.toLowerCase());
    if (existing) {
      existing.occurrences += 1;
      if (at > existing.lastSeenAt) existing.lastSeenAt = at;
    } else {
      map.set(key.toLowerCase(), { key, kind, occurrences: 1, lastSeenAt: at });
    }
  };

  // 真实答错点：来自练习判分（LLM/自评），单次即计入、排在最前。
  const practiceTally = new Map<string, WeakPoint>();
  // 反复涉及的点：命中资料标题 + 提问主题，需 ≥2 次才显现。
  const frequencyTally = new Map<string, WeakPoint>();

  for (const event of events) {
    if (event.type === "practice-completed" && event.weakQuestionPrompts) {
      for (const prompt of event.weakQuestionPrompts) bumpInto(practiceTally, shortenPrompt(prompt), "practice", event.recordedAt);
    }
    for (const title of event.hitResourceTitles) bumpInto(frequencyTally, title, "resource", event.recordedAt);
    if (event.type === "ask") bumpInto(frequencyTally, inferLearningTopic(event.question), "topic", event.recordedAt);
  }

  const byScore = (a: WeakPoint, b: WeakPoint) => b.occurrences - a.occurrences || (a.lastSeenAt < b.lastSeenAt ? 1 : -1);
  const practicePoints = Array.from(practiceTally.values()).sort(byScore);
  const frequencyPoints = Array.from(frequencyTally.values()).filter((p) => p.occurrences >= 2).sort(byScore);
  const weakPoints = [...practicePoints, ...frequencyPoints].slice(0, 5);
  const hasGradedWeakPoints = practicePoints.length > 0;

  const realCount = events.filter((event) => !event.llm.usedFallback).length;
  const realModelRatio = events.length > 0 ? realCount / events.length : 0;

  const providerTally = new Map<string, number>();
  for (const event of events) {
    if (event.llm.usedFallback) continue;
    providerTally.set(event.llm.providerLabel, (providerTally.get(event.llm.providerLabel) ?? 0) + 1);
  }
  const preferredProvider =
    Array.from(providerTally.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    streak: { current, longest, lastStudyDate },
    totalActiveDays,
    weakPoints,
    hasGradedWeakPoints,
    realModelRatio,
    preferredProvider,
    totalInteractions: events.length,
  };
}
