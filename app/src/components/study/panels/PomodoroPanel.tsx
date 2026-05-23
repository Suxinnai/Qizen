import { RotateCcw } from "lucide-react";

function formatTime(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

export function PomodoroPanel({
  seconds,
  running,
  totalSeconds,
  progress,
  onToggle,
  onReset,
}: {
  seconds: number;
  running: boolean;
  totalSeconds: number;
  progress: number;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center py-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-qz-primary/10" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={339.29}
              strokeDashoffset={339.29 * (1 - progress)}
              className="text-qz-primary transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-serif text-[28px] text-qz-primary tabular-nums">{formatTime(seconds)}</div>
            <div className="text-[11px] text-qz-text-muted mt-1">{running ? "专注中" : "已暂停"}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onToggle} className="h-9 rounded-full bg-qz-primary text-white text-[12px] hover:bg-qz-dark">
          {running ? "暂停" : "开始"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="h-9 rounded-full border border-black/[0.08] dark:border-white/[0.1] text-[12px] text-qz-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.05] flex items-center justify-center gap-1.5"
        >
          <RotateCcw size={12} />
          重置
        </button>
      </div>
      <div className="text-[11px] text-qz-text-muted leading-[1.7] pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
        灵建议：先专注 {Math.round(totalSeconds / 60)} 分钟解决当前知识点，结束后再继续聊。
      </div>
    </div>
  );
}

