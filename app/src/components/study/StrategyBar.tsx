export function StrategyBar({ onUnderstood }: { onUnderstood: () => void }) {
  return (
    <div className="qz-strategy-bar">
      <button type="button" className="qz-strategy-button">
        更深入
      </button>
      <button type="button" onClick={onUnderstood} className="qz-strategy-button qz-strategy-button-primary">
        我懂了
      </button>
      <button type="button" className="qz-strategy-button">
        给我一个例子
      </button>
    </div>
  );
}
