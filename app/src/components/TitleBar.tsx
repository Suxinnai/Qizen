import { useState, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Sun, Moon, Bell } from "lucide-react";
import clsx from "clsx";

interface TrafficLightProps {
  color: string;
  hoverGlyph: React.ReactNode;
  onClick: () => void;
  hovering: boolean;
  ariaLabel: string;
}

function TrafficLight({
  color,
  hoverGlyph,
  onClick,
  hovering,
  ariaLabel,
}: TrafficLightProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="qz-dot relative flex items-center justify-center"
      style={{
        background: color,
        border: "0.5px solid rgba(0,0,0,0.15)",
      }}
    >
      <span
        className={clsx(
          "text-[8px] leading-none text-black/60 transition-opacity",
          hovering ? "opacity-100" : "opacity-0"
        )}
      >
        {hoverGlyph}
      </span>
    </button>
  );
}

function TrafficLights() {
  const [hover, setHover] = useState(false);
  const win = useMemo(() => getCurrentWindow(), []);
  return (
    <div
      className="flex items-center gap-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <TrafficLight
        ariaLabel="关闭"
        color="#FF5F56"
        hovering={hover}
        hoverGlyph={"×"}
        onClick={() => {
          win.close().catch(() => {});
        }}
      />
      <TrafficLight
        ariaLabel="最小化"
        color="#FFBD2E"
        hovering={hover}
        hoverGlyph={"–"}
        onClick={() => {
          win.minimize().catch(() => {});
        }}
      />
      <TrafficLight
        ariaLabel="最大化"
        color="#27C93F"
        hovering={hover}
        hoverGlyph={"+"}
        onClick={() => {
          win.toggleMaximize().catch(() => {});
        }}
      />
    </div>
  );
}

interface TitleBarProps {
  title: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function TitleBar({ title, isDark, onToggleTheme }: TitleBarProps) {
  return (
    <div className="qz-titlebar" data-tauri-drag-region>
      <div data-tauri-drag-region={false}>
        <TrafficLights />
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 text-[13px] font-medium text-qz-text dark:text-qz-text-dark select-none"
        data-tauri-drag-region
      >
        栖知 — {title}
      </div>

      <div
        className="ml-auto flex items-center gap-1"
        data-tauri-drag-region={false}
      >
        <button
          type="button"
          aria-label="切换主题"
          onClick={onToggleTheme}
          className="w-7 h-7 rounded-md flex items-center justify-center text-qz-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button
          type="button"
          aria-label="通知"
          className="w-7 h-7 rounded-md flex items-center justify-center text-qz-text-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative"
        >
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-qz-weak" />
        </button>
      </div>
    </div>
  );
}
