import { MessageBody } from "./MessageBody";
import { RagEvidenceCard } from "./RagEvidenceCard";
import { StrategyBar } from "./StrategyBar";
import type { ChatMessage } from "../../lib/study/types";

export function MessageList({
  messages,
  onUnderstood,
}: {
  messages: ChatMessage[];
  onUnderstood: () => void;
}) {
  return (
    <>
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        if (message.role === "assistant") {
          return (
            <div key={message.id} className="qz-message qz-message-assistant items-start">
              <div className="w-8 h-8 rounded-full bg-[#E2F1EC] dark:bg-[#1A5448]/30 text-[#2D7A6B] dark:text-[#5BA593] flex items-center justify-center shrink-0 font-semibold text-[13px] mt-1">
                灵
              </div>
              <div className="flex-1 min-w-0">
                <div className="qz-message-body">
                  <MessageBody content={message.content} />
                </div>
                {message.rag ? <RagEvidenceCard rag={message.rag} /> : null}
                {isLast && message.triggers?.some((trigger) => trigger === "graph" || trigger === "pomodoro") ? (
                  <StrategyBar onUnderstood={onUnderstood} />
                ) : null}
              </div>
            </div>
          );
        }

        return (
          <div key={message.id} className="qz-message-user-row">
            <div className="qz-message-user">
              {message.content}
            </div>
          </div>
        );
      })}
    </>
  );
}
