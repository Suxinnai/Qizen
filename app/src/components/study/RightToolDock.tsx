import { BookMarked, Network, NotebookPen, Timer, X, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";
import type { PanelKey } from "../../lib/study/types";

const PANEL_META: Record<PanelKey, { label: string; icon: LucideIcon; hint: string }> = {
  pomodoro: { label: "专注计时", icon: Timer, hint: "灵建议你先专注一段" },
  resource: { label: "资料与依据", icon: BookMarked, hint: "当前资料、命中依据和补充资源会显示在这里" },
  note: { label: "AI 整理的笔记", icon: NotebookPen, hint: "灵帮你把这一段整理好了" },
  graph: { label: "你在哪里", icon: Network, hint: "你正在知识图谱的这个位置" },
};

const FLOATING_PANEL_KEYS: PanelKey[] = ["pomodoro", "resource", "note", "graph"];

export function RightToolDock({
  activePanel,
  onActivePanelChange,
  renderPanel,
}: {
  activePanel: PanelKey | null;
  onActivePanelChange: (panel: PanelKey | null) => void;
  renderPanel: (panel: PanelKey) => ReactNode;
}) {
  return (
    <div className="qz-tooldock">
      <aside className={clsx("overflow-hidden transition-all duration-300", activePanel ? "w-[332px]" : "w-0")}>
        {activePanel ? (
          <div className="qz-tool-panel">
            <div className="qz-tool-panel-header">
              <div>
                <div className="flex items-center gap-1.5 text-qz-primary mb-1">
                  {(() => {
                    const Icon = PANEL_META[activePanel].icon;
                    return <Icon size={14} />;
                  })()}
                  <div className="font-serif text-[16px]">{PANEL_META[activePanel].label}</div>
                </div>
                <div className="text-[11px] text-qz-text-muted">{PANEL_META[activePanel].hint}</div>
              </div>
              <button
                type="button"
                onClick={() => onActivePanelChange(null)}
                className="qz-tool-close"
              >
                <X size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">{renderPanel(activePanel)}</div>
          </div>
        ) : null}
      </aside>

      <div className="qz-tool-rail">
        {FLOATING_PANEL_KEYS.map((key) => {
          const meta = PANEL_META[key];
          const Icon = meta.icon;
          const active = activePanel === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onActivePanelChange(active ? null : key)}
              title={meta.label}
              className={clsx(
                "qz-tool-button",
                active
                  ? "qz-tool-button-active"
                  : "text-qz-text-muted"
              )}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
