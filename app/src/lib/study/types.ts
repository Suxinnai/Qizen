import type { LibraryRagResult } from "../rag";

export type MessageRole = "assistant" | "user";
export type PanelKey = "pomodoro" | "resource" | "note" | "graph";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  triggers?: PanelKey[];
  rag?: LibraryRagResult;
  providerLabel?: string;
  usedFallback?: boolean;
  errorSummary?: string;
}

export interface StudyLocationState {
  source?: "library" | "graph" | "goal" | "note";
  resourceId?: string;
  nodeId?: string;
  taskId?: string;
  noteId?: string;
}
