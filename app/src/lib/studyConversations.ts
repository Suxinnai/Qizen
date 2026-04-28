export function sanitizePersistedText(value: string) {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/<thinking>[\s\S]*$/gi, "")
    .replace(/<thought>[\s\S]*$/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type StudySidebarMode = "menu" | "sessions";

export interface PersistedStudyConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isFreeConversation: boolean;
  context: {
    source?: "library" | "graph" | "goal" | "note";
    resourceId?: string;
    nodeId?: string;
    taskId?: string;
    noteId?: string;
  } | null;
  selectedTaskId: string;
  teachingStyle: "story" | "logic" | "analogy" | "steps";
  noteDraft: string;
  messages: Array<{
    id: string;
    role: "assistant" | "user";
    content: string;
    triggers?: Array<"pomodoro" | "resource" | "note" | "graph">;
    rag?: unknown;
    providerLabel?: string;
    usedFallback?: boolean;
    errorSummary?: string;
  }>;
}

interface StudyConversationStore {
  activeId: string | null;
  sidebarMode: StudySidebarMode;
  conversations: PersistedStudyConversation[];
}

const STORAGE_KEY = "qizen:study:conversations:v1";
const CHANGE_EVENT = "qizen-study-conversations-changed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getStudyConversationChangeEventName() {
  return CHANGE_EVENT;
}

function defaultStore(): StudyConversationStore {
  return {
    activeId: null,
    sidebarMode: "menu",
    conversations: [],
  };
}

function isLegacyDefaultAssistantMessage(content: string) {
  const clean = sanitizePersistedText(content).replace(/\s+/g, "");
  if (!clean) return true;
  return [
    "我已经把《",
    "当前讲解风格是",
    "接下来我会优先用资料库里的内容来回答你",
    "你现在可以直接追问概念",
    "欢迎来到学习空间",
    "我是灵",
  ].some((marker) => clean.includes(marker.replace(/\s+/g, "")));
}

function sanitizeConversation(item: PersistedStudyConversation): PersistedStudyConversation {
  const messages = Array.isArray(item.messages)
    ? item.messages
        .map((message) => ({
          ...message,
          content: sanitizePersistedText(message.content),
        }))
        .filter((message) => message.content.length > 0)
    : [];

  const onlyLegacyAssistantMessages =
    messages.length > 0 &&
    messages.every((message) => message.role === "assistant" && isLegacyDefaultAssistantMessage(message.content));

  const cleanMessages = onlyLegacyAssistantMessages ? [] : messages;

  return {
    ...item,
    title: sanitizePersistedText(item.title) || "新的学习会话",
    messages: cleanMessages,
  };
}

function readStore(): StudyConversationStore {
  if (!canUseStorage()) return defaultStore();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultStore();
  try {
    const parsed = JSON.parse(raw) as Partial<StudyConversationStore>;
    const store = {
      activeId: typeof parsed.activeId === "string" ? parsed.activeId : null,
      sidebarMode: parsed.sidebarMode === "sessions" ? "sessions" : "menu",
      conversations: Array.isArray(parsed.conversations)
        ? parsed.conversations
            .filter(
              (item): item is PersistedStudyConversation =>
                Boolean(item && typeof item === "object" && typeof item.id === "string")
            )
            .map(sanitizeConversation)
        : [],
    } satisfies StudyConversationStore;

    if (JSON.stringify(store) !== raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    return store;
  } catch {
    return defaultStore();
  }
}

function writeStore(store: StudyConversationStore) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  emitChange();
}

export function listStudyConversations() {
  return [...readStore().conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getActiveStudyConversationId() {
  return readStore().activeId;
}

export function setActiveStudyConversationId(id: string | null) {
  const store = readStore();
  writeStore({ ...store, activeId: id });
}

export function getStudySidebarMode(): StudySidebarMode {
  return readStore().sidebarMode;
}

export function setStudySidebarMode(mode: StudySidebarMode) {
  const store = readStore();
  writeStore({ ...store, sidebarMode: mode });
}

export function getStudyConversation(id: string) {
  return readStore().conversations.find((item) => item.id === id) ?? null;
}

export function createStudyConversation(
  input: Omit<PersistedStudyConversation, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();
  const conversation: PersistedStudyConversation = {
    ...input,
    title: sanitizePersistedText(input.title) || "新的学习会话",
    messages: input.messages.map((message) => ({ ...message, content: sanitizePersistedText(message.content) })),
    id: `study-conv-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  const store = readStore();
  writeStore({
    ...store,
    activeId: conversation.id,
    conversations: [conversation, ...store.conversations],
  });
  return conversation;
}

export function buildStudyConversationTitle(input: {
  manualTitle?: string;
  selectedTaskTitle?: string;
  resourceTitle?: string;
  firstUserMessage?: string;
  firstAssistantMessage?: string;
  isFreeConversation?: boolean;
}) {
  const manual = sanitizePersistedText(input.manualTitle ?? "");
  if (manual) return manual;

  const resourceTitle = input.resourceTitle?.trim();
  if (resourceTitle) return resourceTitle;

  const firstUserMessage = input.firstUserMessage?.trim();
  if (firstUserMessage) return firstUserMessage.slice(0, 24);

  const selectedTaskTitle = input.selectedTaskTitle?.trim();
  if (selectedTaskTitle) return selectedTaskTitle;

  const firstAssistantMessage = sanitizePersistedText(input.firstAssistantMessage ?? "");
  if (firstAssistantMessage) return firstAssistantMessage.slice(0, 24);

  return input.isFreeConversation ? "新的自由会话" : "新的学习会话";
}

export function upsertStudyConversation(conversation: PersistedStudyConversation) {
  const store = readStore();
  const nextConversation: PersistedStudyConversation = {
    ...conversation,
    title: sanitizePersistedText(conversation.title) || "新的学习会话",
    messages: conversation.messages.map((message) => ({
      ...message,
      content: sanitizePersistedText(message.content),
    })),
    updatedAt: new Date().toISOString(),
  };
  const existingIndex = store.conversations.findIndex((item) => item.id === conversation.id);
  const nextConversations = [...store.conversations];
  if (existingIndex >= 0) {
    nextConversations.splice(existingIndex, 1, nextConversation);
  } else {
    nextConversations.unshift(nextConversation);
  }
  writeStore({
    ...store,
    activeId: nextConversation.id,
    conversations: nextConversations,
  });
  return nextConversation;
}
