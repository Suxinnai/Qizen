export function StrategyBar({ onUnderstood }: { onUnderstood: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
      <button type="button" className="px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors">
        更深入
      </button>
      <button type="button" onClick={onUnderstood} className="px-3 py-1.5 rounded-full bg-qz-primary/10 text-qz-primary hover:bg-qz-primary/15 transition-colors">
        我懂了
      </button>
      <button type="button" className="px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors">
        给我一个例子
      </button>
    </div>
  );
}
