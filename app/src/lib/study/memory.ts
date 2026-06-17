import type { AppData } from "../storage";
import { inferLearningTopic } from "./message-builders";

// 长期学习记忆：全部从既有的 studyRecord / studyStats 派生，不引入新的持久层，
// 与 Reports 同一套"按需派生"思路。诚实说明：练习暂无答题判分，
// 因此这里给出的是"反复涉及、值得巩固的点"，而非严格意义的"常错点"。

export interface WeakPoint {
  key: string;
  kind: "resource" | "topic";
  occurrences: number;
  lastSeenAt: string;
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

  // 聚合"反复涉及的点"：命中资料标题 + 提问主题，按出现次数累计。
  const tally = new Map<string, WeakPoint>();
  const bump = (rawKey: string, kind: WeakPoint["kind"], at: string) => {
    const key = rawKey.trim();
    if (!key || key === "这个主题") return;
    const existing = tally.get(key.toLowerCase());
    if (existing) {
      existing.occurrences += 1;
      if (at > existing.lastSeenAt) existing.lastSeenAt = at;
    } else {
      tally.set(key.toLowerCase(), { key, kind, occurrences: 1, lastSeenAt: at });
    }
  };

  for (const event of events) {
    for (const title of event.hitResourceTitles) bump(title, "resource", event.recordedAt);
    if (event.type === "ask") bump(inferLearningTopic(event.question), "topic", event.recordedAt);
  }

  const weakPoints = Array.from(tally.values())
    .filter((point) => point.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences || (a.lastSeenAt < b.lastSeenAt ? 1 : -1))
    .slice(0, 5);

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
    realModelRatio,
    preferredProvider,
    totalInteractions: events.length,
  };
}
