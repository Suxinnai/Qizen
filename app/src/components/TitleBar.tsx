import { useEffect, useState } from "react";
import { Bell, Folder, Maximize2, Minus, Moon, Sun, X } from "lucide-react";

function WindowControls() {
  const windowBridge = typeof window !== "undefined" ? window.qizenWindow : undefined;
  return (
    <div className="qz-window-controls">
      <button
        type="button"
        aria-label="最小化"
        className="qz-window-control"
        onClick={() => {
          windowBridge?.minimize().catch(() => {});
        }}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        aria-label="最大化"
        className="qz-window-control"
        onClick={() => {
          windowBridge?.toggleMaximize().catch(() => {});
        }}
      >
        <Maximize2 size={13} />
      </button>
      <button
        type="button"
        aria-label="关闭"
        className="qz-window-control qz-window-control-close"
        onClick={() => {
          windowBridge?.close().catch(() => {});
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

interface TitleBarProps {
  title: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

function formatNow(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function TitleBar({ title, isDark, onToggleTheme }: TitleBarProps) {
  const [nowText, setNowText] = useState(() => formatNow(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowText(formatNow(new Date()));
    }, 1000 * 30);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="qz-titlebar">
      <div className="qz-titlebar-context">
        <span className="qz-titlebar-count">{title}</span>
        <span className="qz-titlebar-dot">·</span>
        <Folder size={13} />
        <span className="qz-titlebar-path">Qizen 工作区</span>
      </div>

      <div className="qz-titlebar-actions">
        <div className="qz-titlebar-clock">
          {nowText}
        </div>
        <div id="qz-titlebar-study-slot" className="flex items-center mr-1" />
        <button
          type="button"
          aria-label="切换主题"
          onClick={onToggleTheme}
          className="qz-titlebar-icon-button"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button
          type="button"
          aria-label="通知"
          className="qz-titlebar-icon-button relative"
        >
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-qz-weak" />
        </button>
      </div>

      <WindowControls />
    </div>
  );
}
