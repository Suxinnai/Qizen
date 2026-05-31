import { useState, type MouseEvent } from "react";
import { BrainCircuit, Loader2, Search } from "lucide-react";
import { MessageBody } from "./MessageBody";
import { RagEvidenceCard } from "./RagEvidenceCard";
import { StrategyBar } from "./StrategyBar";
import type { ChatMessage, StudyPlanStep } from "../../lib/study/types";

function AgentTrace({ steps, streaming }: { steps?: string[]; streaming?: boolean }) {
  if (!steps?.length) return null;
  return (
    <div className="qz-agent-trace">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-qz-primary">
        {streaming ? <Loader2 size={12} className="animate-spin" /> : <BrainCircuit size={12} />}
        <span>可见思路轨迹</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {steps.map((step) => (
          <span key={step} className="qz-agent-pill">
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  onUnderstood,
  onSendPrompt,
  onSaveNote,
  onConfirmPlan,
  isGenerating,
}: {
  messages: ChatMessage[];
  onUnderstood: () => void;
  onSendPrompt?: (text: string) => void;
  onSaveNote?: (content: string) => void;
  onConfirmPlan?: (steps?: StudyPlanStep[]) => void;
  isGenerating?: boolean;
}) {
  const [noteSelection, setNoteSelection] = useState<{
    messageId: string;
    text: string;
    x: number;
    y: number;
  } | null>(null);

  function handleAssistantMouseUp(event: MouseEvent<HTMLDivElement>, message: ChatMessage) {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    const anchorNode = selection?.anchorNode;
    if (!selectedText || !anchorNode || !event.currentTarget.contains(anchorNode)) {
      setNoteSelection(null);
      return;
    }

    setNoteSelection({
      messageId: message.id,
      text: selectedText,
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <>
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        const isStreaming = message.streamState === "streaming";
        if (message.role === "assistant") {
          return (
            <div key={message.id} className="qz-message qz-message-assistant items-start">
              <div className="w-8 h-8 rounded-full bg-[#E2F1EC] dark:bg-[#1A5448]/30 text-[#2D7A6B] dark:text-[#5BA593] flex items-center justify-center shrink-0 font-semibold text-[13px] mt-1 select-none">
                灵
              </div>
              <div className="flex-1 min-w-0" onMouseUp={(event) => handleAssistantMouseUp(event, message)}>
                <AgentTrace steps={message.thinking} streaming={isStreaming} />
                <div className="qz-message-body">
                  <MessageBody content={message.content || (isStreaming ? "正在整理..." : "")} rag={message.rag} />
                </div>
                {message.rag ? <RagEvidenceCard rag={message.rag} /> : null}
                {message.resourceLeads?.length ? (
                  <div className="qz-resource-strip">
                    {message.resourceLeads.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="qz-resource-chip">
                        <Search size={12} />
                        <span className="truncate">{lead.title}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {isLast && message.role === "assistant" ? (
                  <StrategyBar
                    onUnderstood={onUnderstood}
                    onSendPrompt={onSendPrompt}
                    onSaveNote={() => onSaveNote?.(message.content)}
                    onConfirmPlan={message.planSteps?.length ? () => onConfirmPlan?.(message.planSteps) : undefined}
                  />
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
      {isGenerating && messages[messages.length - 1]?.streamState !== "streaming" ? (
        <div className="qz-message qz-message-assistant items-start">
          <div className="w-8 h-8 rounded-full bg-[#E2F1EC] dark:bg-[#1A5448]/30 text-[#2D7A6B] dark:text-[#5BA593] flex items-center justify-center shrink-0 font-semibold text-[13px] mt-1 select-none">
            灵
          </div>
          <div className="qz-agent-working">
            <Loader2 size={14} className="animate-spin" />
            <span>AI 正在检索资料、整理计划和组织回答</span>
          </div>
        </div>
      ) : null}
      {noteSelection ? (
        <button
          type="button"
          className="qz-selection-note-popover"
          style={{
            left: noteSelection.x,
            top: Math.max(48, noteSelection.y - 42),
          }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onSaveNote?.(noteSelection.text);
            setNoteSelection(null);
          }}
        >
          记笔记
        </button>
      ) : null}
    </>
  );
}
