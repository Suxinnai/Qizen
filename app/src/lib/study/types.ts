import type { LibraryRagResult } from "../rag";

export type MessageRole = "assistant" | "user";
export type PanelKey = "pomodoro" | "resource" | "note" | "graph";
export type StudyJourneyStage = "define" | "discuss" | "plan" | "research" | "learn";

export interface StudyPlanStep {
  id: string;
  title: string;
  minutes: number;
}

export interface StudyResourceLead {
  id: string;
  title: string;
  type: "course" | "article" | "video" | "practice" | "local";
  source: string;
  reason: string;
  url?: string;
  live?: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  kind?: "normal" | "plan" | "agent";
  streamState?: "streaming" | "done";
  thinking?: string[];
  planSteps?: StudyPlanStep[];
  resourceLeads?: StudyResourceLead[];
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
