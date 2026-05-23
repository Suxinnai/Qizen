import type { AppSettings } from "../storage";
import type { ChatMessage, PanelKey, StudyLocationState } from "./types";

export type StudySessionStatus = "empty-free" | "contextual-ready" | "chatting" | "loading" | "error";

export function getStudySessionStatus({
  isFreeConversation,
  context,
  messages,
  loading,
  hasError,
}: {
  isFreeConversation: boolean;
  context: StudyLocationState | null;
  messages: ChatMessage[];
  loading: boolean;
  hasError?: boolean;
}): StudySessionStatus {
  if (loading) return "loading";
  if (hasError) return "error";
  if (messages.some((message) => message.role === "user")) return "chatting";
  if (context && !isFreeConversation) return "contextual-ready";
  return "empty-free";
}

export function canAutoOpenPanel(panel: PanelKey, settings: AppSettings) {
  if (!settings.autoOpenStudyPanels) return false;
  if (panel === "pomodoro") return settings.autoStartPomodoro;
  if (panel === "note") return settings.autoAppendNote;
  return true;
}

export function shouldAllowLearningProgress(context: StudyLocationState | null) {
  return Boolean(context?.taskId || context?.nodeId);
}

