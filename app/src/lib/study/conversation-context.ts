export interface ConversationHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export const DEFAULT_HISTORY_CHAR_BUDGET = 12_000;
const MAX_HISTORY_MESSAGE_CHARS = 3_000;

function compactHistoryContent(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= MAX_HISTORY_MESSAGE_CHARS) return trimmed;

  const head = trimmed.slice(0, 2_000).trimEnd();
  const tail = trimmed.slice(-900).trimStart();
  return `${head}\n…\n${tail}`;
}

/**
 * Build the recent conversation context sent to the LLM.
 *
 * One round starts at a user message and includes every assistant message until
 * the next user message. We keep the most recent N user rounds, then apply a
 * conservative character budget from newest to oldest so long sessions cannot
 * grow model requests without bound.
 */
export function buildConversationHistory(
  messages: ConversationHistoryMessage[],
  rounds: number,
  charBudget = DEFAULT_HISTORY_CHAR_BUDGET
): ConversationHistoryMessage[] {
  const safeRounds = Math.max(0, Math.floor(rounds));
  const safeBudget = Math.max(0, Math.floor(charBudget));
  if (safeRounds === 0 || safeBudget === 0) return [];

  const normalized = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ ...message, content: compactHistoryContent(message.content) }))
    .filter((message) => message.content.length > 0);

  if (!normalized.some((message) => message.role === "user")) return [];

  let startIndex = 0;
  let userRoundsSeen = 0;
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    if (normalized[index].role !== "user") continue;
    userRoundsSeen += 1;
    startIndex = index;
    if (userRoundsSeen >= safeRounds) break;
  }

  const candidates = normalized.slice(startIndex);
  const keptReversed: ConversationHistoryMessage[] = [];
  let remaining = safeBudget;

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const message = candidates[index];
    if (message.content.length > remaining) break;
    keptReversed.push(message);
    remaining -= message.content.length;
  }

  const kept = keptReversed.reverse();
  while (kept[0]?.role === "assistant") kept.shift();
  return kept;
}
