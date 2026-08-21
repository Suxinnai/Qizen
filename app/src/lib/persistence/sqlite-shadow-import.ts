import { loadAppData, type AppData } from "../storage.ts";
import {
  getActiveStudyConversationId,
  getStudySidebarMode,
  listStudyConversations,
  type PersistedStudyConversation,
} from "../studyConversations.ts";
import { buildSqliteMigrationBundle } from "./sqlite-migration.ts";

export interface SqliteDatabaseStatus {
  schemaVersion: number;
  importedAt: string | null;
  counts: {
    goals: number;
    libraryItems: number;
    notes: number;
    practiceSets: number;
    knowledgeNodes: number;
    studyEvents: number;
    studyConversations: number;
    studyMessages: number;
  };
}

export interface SqliteDatabaseBridge {
  status: () => Promise<SqliteDatabaseStatus>;
  importBundle: (bundle: unknown) => Promise<SqliteDatabaseStatus>;
}

export interface SqliteShadowImportDeps {
  database?: SqliteDatabaseBridge;
  loadData?: () => AppData;
  listConversations?: () => PersistedStudyConversation[];
  getActiveConversationId?: () => string | null;
  getSidebarMode?: () => "menu" | "sessions";
  now?: () => string;
}

export type SqliteShadowImportResult =
  | { kind: "unavailable" }
  | { kind: "already-imported"; status: SqliteDatabaseStatus }
  | { kind: "empty"; status: SqliteDatabaseStatus }
  | { kind: "imported"; status: SqliteDatabaseStatus };

export function hasMeaningfulLocalData(
  data: Pick<
    AppData,
    | "appState"
    | "goals"
    | "notes"
    | "libraryItems"
    | "practiceSets"
    | "knowledgeGraph"
    | "studyRecord"
  >,
  conversations: PersistedStudyConversation[]
) {
  return Boolean(
    data.appState.onboardingCompleted ||
      data.goals.length ||
      data.notes.length ||
      data.libraryItems.length ||
      data.practiceSets.length ||
      data.knowledgeGraph.nodes.length ||
      data.knowledgeGraph.edges.length ||
      data.studyRecord.events.length ||
      conversations.length
  );
}

/**
 * Import the current normalized localStorage state into SQLite exactly once.
 *
 * This is intentionally a shadow copy: the renderer continues reading and
 * writing localStorage after this function succeeds. A later repository-switch
 * phase will perform a fresh import before promoting SQLite to the true source.
 */
export async function ensureSqliteShadowImport(
  deps: SqliteShadowImportDeps = {}
): Promise<SqliteShadowImportResult> {
  const database =
    deps.database ??
    (typeof window !== "undefined" ? (window.qizenDatabase as SqliteDatabaseBridge | undefined) : undefined);
  if (!database) return { kind: "unavailable" };

  const status = await database.status();
  if (status.importedAt) return { kind: "already-imported", status };

  const loadData = deps.loadData ?? loadAppData;
  const listConversationsSource = deps.listConversations ?? listStudyConversations;
  const getActiveConversationId = deps.getActiveConversationId ?? getActiveStudyConversationId;
  const getSidebarMode = deps.getSidebarMode ?? getStudySidebarMode;
  const now = deps.now ?? (() => new Date().toISOString());

  const data = loadData();
  const conversations = listConversationsSource();
  if (!hasMeaningfulLocalData(data, conversations)) {
    return { kind: "empty", status };
  }

  const bundle = buildSqliteMigrationBundle(
    data,
    conversations,
    {
      activeId: getActiveConversationId(),
      sidebarMode: getSidebarMode(),
      legacySchemaVersion: 2,
    },
    now()
  );

  const imported = await database.importBundle(bundle);
  return { kind: "imported", status: imported };
}
