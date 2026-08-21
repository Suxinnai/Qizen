import type { AppData } from "../storage.ts";
import type { PersistedStudyConversation, StudySidebarMode } from "../studyConversations.ts";

export interface SqliteShadowSnapshot {
  schemaVersion: number;
  importedAt: string | null;
  data: AppData;
  conversations: PersistedStudyConversation[];
  conversationState: {
    activeId: string | null;
    sidebarMode: StudySidebarMode;
    legacySchemaVersion: number;
  };
}

export interface LegacyShadowSource {
  data: AppData;
  conversations: PersistedStudyConversation[];
  activeId: string | null;
  sidebarMode: StudySidebarMode;
}

export interface SqliteShadowVerificationResult {
  matches: boolean;
  mismatches: string[];
}

function cloneForComparison<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeAppData(data: AppData) {
  const normalized = cloneForComparison(data);
  if (normalized.settings?.llm) normalized.settings.llm.apiKey = "";

  normalized.studyRecord.events = normalized.studyRecord.events.map((event) => ({
    ...event,
    taskId: event.taskId ?? null,
  }));

  return normalized;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)])
  );
}

function equalCanonical(left: unknown, right: unknown) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

/**
 * Compare the current localStorage source of truth with a SQLite readback
 * snapshot. This is a diagnostic gate for the future repository switch; it
 * does not mutate either source or decide which one is authoritative.
 */
export function verifySqliteShadowSnapshot(
  source: LegacyShadowSource,
  snapshot: SqliteShadowSnapshot
): SqliteShadowVerificationResult {
  const expected = normalizeAppData(source.data);
  const actual = normalizeAppData(snapshot.data);
  const mismatches: string[] = [];

  const sections: Array<[string, unknown, unknown]> = [
    ["appState", expected.appState, actual.appState],
    ["learningProfile", expected.learningProfile, actual.learningProfile],
    ["settings", expected.settings, actual.settings],
    ["goals", expected.goals, actual.goals],
    ["notes", expected.notes, actual.notes],
    ["libraryItems", expected.libraryItems, actual.libraryItems],
    ["practiceSets", expected.practiceSets, actual.practiceSets],
    ["knowledgeGraph", expected.knowledgeGraph, actual.knowledgeGraph],
    ["studyStats", expected.studyStats, actual.studyStats],
    ["studyRecord", expected.studyRecord, actual.studyRecord],
    ["conversations", source.conversations, snapshot.conversations],
    [
      "conversationState",
      { activeId: source.activeId, sidebarMode: source.sidebarMode },
      {
        activeId: snapshot.conversationState.activeId,
        sidebarMode: snapshot.conversationState.sidebarMode,
      },
    ],
  ];

  for (const [name, left, right] of sections) {
    if (!equalCanonical(left, right)) mismatches.push(name);
  }

  return {
    matches: mismatches.length === 0,
    mismatches,
  };
}
