import { useEffect, useRef, useState } from "react";
import { sanitizeLlmText } from "../lib/llm";
import type { TeachingStyle } from "../lib/storage";
import {
  buildStudyConversationTitle,
  createStudyConversation,
  getActiveStudyConversationId,
  getStudyConversation,
  getStudyConversationChangeEventName,
  sanitizePersistedText,
  setActiveStudyConversationId,
  upsertStudyConversation,
  type PersistedStudyConversation,
} from "../lib/studyConversations";
import type { ChatMessage, StudyLocationState } from "../lib/study/types";

type ResetStudySessionInput = {
  context?: StudyLocationState | null;
  freeMode?: boolean;
};

export function useStudyConversationPersistence(input: {
  messages: ChatMessage[];
  noteDraft: string;
  selectedTaskId: string;
  conversationContext: StudyLocationState | null;
  isFreeConversation: boolean;
  teachingStyle: TeachingStyle;
  baseLearningGoal: string;
  selectedResourceTitle?: string;
  routeContext: StudyLocationState | null;
  onReset: (next?: ResetStudySessionInput) => void;
  onHydrate: (conversation: PersistedStudyConversation, messages: ChatMessage[]) => void;
}) {
  const {
    messages,
    noteDraft,
    selectedTaskId,
    conversationContext,
    isFreeConversation,
    teachingStyle,
    baseLearningGoal,
    selectedResourceTitle,
    routeContext,
    onReset,
    onHydrate,
  } = input;

  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() =>
    getActiveStudyConversationId()
  );

  const activeConversationIdRef = useRef(activeConversationId);
  const activeConversationHydratedRef = useRef(false);
  const skipNextConversationSyncRef = useRef(false);
  const hydratedConversationRef = useRef(false);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  function buildConversationSnapshot(
    override?: Partial<PersistedStudyConversation>
  ): PersistedStudyConversation {
    const snapshotMessages = (override?.messages as ChatMessage[] | undefined) ?? messages;
    const snapshotContext = override?.context ?? conversationContext;
    const snapshotIsFreeConversation = override?.isFreeConversation ?? isFreeConversation;
    const snapshotSelectedTaskId = override?.selectedTaskId ?? selectedTaskId;
    const snapshotNoteDraft = override?.noteDraft ?? noteDraft;
    const firstUserMessage = sanitizeLlmText(
      snapshotMessages.find((message) => message.role === "user")?.content ?? ""
    );
    const firstAssistantMessage = sanitizeLlmText(
      snapshotMessages.find((message) => message.role === "assistant")?.content ?? ""
    );
    const title = buildStudyConversationTitle({
      manualTitle: override?.title ?? conversationTitle ?? undefined,
      selectedTaskTitle: baseLearningGoal,
      resourceTitle: selectedResourceTitle,
      firstUserMessage,
      firstAssistantMessage,
      isFreeConversation: snapshotIsFreeConversation,
    });

    return {
      id: activeConversationIdRef.current ?? `study-conv-${Date.now()}`,
      title,
      createdAt: override?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFreeConversation: snapshotIsFreeConversation,
      context: snapshotContext,
      selectedTaskId: snapshotSelectedTaskId,
      teachingStyle,
      noteDraft: snapshotNoteDraft,
      messages: snapshotMessages,
    };
  }

  function persistCurrentConversation(override?: Partial<PersistedStudyConversation>) {
    const snapshot = buildConversationSnapshot(override);
    const saved = activeConversationIdRef.current
      ? upsertStudyConversation(snapshot)
      : createStudyConversation(snapshot);

    setConversationTitle(sanitizeLlmText(saved.title));
    activeConversationIdRef.current = saved.id;
    activeConversationHydratedRef.current = true;
    skipNextConversationSyncRef.current = true;
    setActiveConversationIdState(saved.id);
    setActiveStudyConversationId(saved.id);
    return saved;
  }

  useEffect(() => {
    const sync = () => {
      const nextId = getActiveStudyConversationId();
      if (skipNextConversationSyncRef.current && nextId === activeConversationIdRef.current) {
        skipNextConversationSyncRef.current = false;
        return;
      }
      if (nextId === activeConversationIdRef.current && activeConversationHydratedRef.current) return;

      activeConversationIdRef.current = nextId;
      setActiveConversationIdState(nextId);

      if (!nextId) {
        activeConversationHydratedRef.current = true;
        setConversationTitle(null);
        onReset({ context: routeContext, freeMode: !routeContext });
        return;
      }

      const conversation = getStudyConversation(nextId);
      if (!conversation) return;

      activeConversationHydratedRef.current = true;
      hydratedConversationRef.current = true;
      setConversationTitle(conversation.title);
      const hydratedMessages = (conversation.messages as ChatMessage[]).map((message) => ({
        ...message,
        content: sanitizePersistedText(message.content),
      }));
      onHydrate(conversation, hydratedMessages);
    };

    const handleNew = () => {
      activeConversationIdRef.current = null;
      activeConversationHydratedRef.current = true;
      skipNextConversationSyncRef.current = true;
      setActiveStudyConversationId(null);
      setActiveConversationIdState(null);
      setConversationTitle(null);
      onReset({ context: null, freeMode: true });
    };

    sync();
    window.addEventListener(getStudyConversationChangeEventName(), sync);
    window.addEventListener("qizen-study-start-new", handleNew);
    return () => {
      window.removeEventListener(getStudyConversationChangeEventName(), sync);
      window.removeEventListener("qizen-study-start-new", handleNew);
    };
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    if (!hydratedConversationRef.current && messages.every((message) => message.role === "assistant")) {
      return;
    }
    hydratedConversationRef.current = true;
    persistCurrentConversation();
  }, [messages, noteDraft, selectedTaskId, conversationContext, isFreeConversation]);

  return {
    conversationTitle,
    setConversationTitle,
    persistCurrentConversation,
  };
}
