import { Mic, Paperclip, SendHorizonal } from "lucide-react";
import clsx from "clsx";

export function StudyInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="qz-study-composer">
      <button type="button" className="qz-composer-tool" aria-label="添加附件">
        <Paperclip size={18} />
      </button>
      
      <input
        id="qz-study-input"
        name="study-message"
        type="text"
        aria-label="输入消息"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={disabled ? "正在整理回答…" : "输入问题，Enter 发送"}
        disabled={disabled}
        className="qz-study-textarea"
      />

      <div className="flex items-center gap-2">
        <button type="button" className="qz-composer-tool" aria-label="语音输入">
          <Mic size={18} />
        </button>
        <button
          type="button"
          aria-label="发送消息"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className={clsx(
            "qz-composer-send",
            value.trim() && !disabled ? "qz-composer-send-ready" : "qz-composer-send-disabled"
          )}
        >
          <SendHorizonal size={16} />
        </button>
      </div>
    </div>
  );
}
