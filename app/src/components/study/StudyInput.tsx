import { Eye, Folder, Mic, Paperclip, SendHorizonal, Wrench } from "lucide-react";
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
      <textarea
        id="qz-study-input"
        name="study-message"
        aria-label="输入消息"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        rows={1}
        placeholder={disabled ? "正在整理回答…" : "输入消息..."}
        disabled={disabled}
        className="qz-study-textarea"
      />
      <div className="qz-study-composer-bar">
        <div className="flex items-center gap-2">
          <button type="button" className="qz-composer-tool" aria-label="添加附件">
            <Paperclip size={16} />
          </button>
          <button type="button" className="qz-composer-tool qz-composer-tool-filled" aria-label="选择资料">
            <Folder size={16} />
          </button>
          <button type="button" className="qz-composer-tool qz-composer-tool-filled" aria-label="工具设置">
            <Wrench size={16} />
          </button>
          <button type="button" className="qz-composer-tool qz-composer-tool-filled" aria-label="语音输入">
            <Mic size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="qz-composer-tool" aria-label="预览回答">
            <Eye size={16} />
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
    </div>
  );
}
