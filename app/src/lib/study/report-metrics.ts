export interface PracticeSummaryEvent {
  type: string;
}

export interface PracticeSummarySet {
  status: string;
}

export interface PracticeSummary {
  generated: number;
  completed: number;
  percentage: number;
}

/**
 * Derive practice completion metrics without double counting modern data.
 *
 * Newer Qizen versions record both a `practice-completed` event and mark the
 * persisted practice set as completed. Completion events are therefore the
 * source of truth; completed sets are only a fallback for legacy data that
 * predates completion events.
 */
export function derivePracticeSummary(
  events: PracticeSummaryEvent[],
  practiceSets: PracticeSummarySet[]
): PracticeSummary {
  const generatedEvents = events.filter((event) => event.type === "practice-generated").length;
  const completedEvents = events.filter((event) => event.type === "practice-completed").length;
  const legacyCompletedSets = practiceSets.filter((set) => set.status === "completed").length;

  const completed = completedEvents > 0 ? completedEvents : legacyCompletedSets;
  const generated = Math.max(generatedEvents, completed);
  const percentage = generated > 0
    ? Math.min(100, Math.round((completed / generated) * 100))
    : 0;

  return { generated, completed, percentage };
}
