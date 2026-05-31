export function StrategyBar({
  onUnderstood,
  onSendPrompt,
  onSaveNote,
  onConfirmPlan,
}: {
  onUnderstood: () => void;
  onSendPrompt?: (text: string) => void;
  onSaveNote?: () => void;
  onConfirmPlan?: () => void;
}) {
  return (
    <div className="qz-strategy-bar select-none">
      {onConfirmPlan ? (
        <button
          type="button"
          onClick={onConfirmPlan}
          className="qz-strategy-button qz-strategy-button-primary cursor-pointer hover:bg-qz-primary/10 transition-colors"
        >
          确认计划
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onSendPrompt?.("能换个更容易理解的方式或者风格再讲讲吗？")}
        className="qz-strategy-button cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
      >
        换种讲法
      </button>
      <button
        type="button"
        onClick={() => onSendPrompt?.("对于这个知识点，能帮我更深入或者更全面一些地剖析讲解一下吗？")}
        className="qz-strategy-button cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
      >
        更深入
      </button>
      <button
        type="button"
        onClick={onUnderstood}
        className="qz-strategy-button cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors font-medium text-qz-primary"
      >
        我懂了
      </button>
      <button
        type="button"
        onClick={() => onSendPrompt?.("能帮我举一个具体、生动的生活或物理实例来辅助说明吗？")}
        className="qz-strategy-button cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
      >
        给我一个例子
      </button>
      <button
        type="button"
        onClick={onSaveNote}
        disabled={!onSaveNote}
        className="qz-strategy-button cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
      >
        记笔记
      </button>
    </div>
  );
}
