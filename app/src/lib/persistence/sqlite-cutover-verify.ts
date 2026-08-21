import { loadAppData, type AppData } from "../storage.ts";
import {
  getActiveStudyConversationId,
  getStudySidebarMode,
  listStudyConversations,
  type PersistedStudyConversation,
  type StudySidebarMode,
} from "../studyConversations.ts";
import { buildSqliteMigrationBundle } from "./sqlite-migration.ts";
import {
  verifySqliteShadowSnapshot,
  type SqliteShadowSnapshot,
  type SqliteShadowVerificationResult,
} from "./sqlite-shadow-verify.ts";

export interface SqliteCutoverDatabaseBridge {
  importBundle: (bundle: unknown) => Promise<unknown>;
  snapshot: () => Promise<SqliteShadowSnapshot>;
}

export interface SqliteCutoverVerificationDeps {
  database?: SqliteCutoverDatabaseBridge;
  loadData?: () => AppData;
  listConversations?: () => PersistedStudyConversation[];
  getActiveConversationId?: () => string | null;
  getSidebarMode?: () => StudySidebarMode;
  now?: () => string;
}

export type SqliteCutoverVerificationResult =
  | { kind: "unavailable" }
  | {
      kind: "verified" | "mismatch";
      importedAt: string | null;
      verification: SqliteShadowVerificationResult;
    };

/**
 * Refresh the disposable SQLite shadow from the current localStorage source,
 * immediately read it back, and compare both domain snapshots.
 *
 * This is the safety gate for a future repository cutover. It deliberately
 * does not change the application's active persistence source. Callers should
 * only consider promotion after `kind === "verified"`.
 */
export async function verifyFreshSqliteShadowForCutover(
  deps: SqliteCutoverVerificationDeps = {}
): Promise<SqliteCutoverVerificationResult> {
  const database =
    deps.database ??
    (typeof window !== "undefined"
      ? (window.qizenDatabase as SqliteCutoverDatabaseBridge | undefined)
      : undefined);
  if (!database?.importBundle || !database?.snapshot) return { kind: "unavailable" };

  const loadData = deps.loadData ?? loadAppData;
  const listConversationsSource = deps.listConversations ?? listStudyConversations;
  const getActiveConversationId = deps.getActiveConversationId ?? getActiveStudyConversationId;
  const getSidebarMode = deps.getSidebarMode ?? getStudySidebarMode;
  const now = deps.now ?? (() => new Date().toISOString());

  const data = loadData();
  const conversations = listConversationsSource();
  const activeId = getActiveConversationId();
  const sidebarMode = getSidebarMode();

  const bundle = buildSqliteMigrationBundle(
    data,
    conversations,
    {
      activeId,
      sidebarMode,
      legacySchemaVersion: 2,
    },
    now()
  );

  // Replace first, then read back. The SQLite shadow is not authoritative yet,
  // so replacing it here is safe and ensures comparison is not against stale
  // data from an earlier application launch.
  await database.importBundle(bundle);
  const snapshot = await database.snapshot();
  const verification = verifySqliteShadowSnapshot(
    {
      data,
      conversations,
      activeId,
      sidebarMode,
    },
    snapshot
  );

  return {
    kind: verification.matches ? "verified" : "mismatch",
    importedAt: snapshot.importedAt,
    verification,
  };
}
