import clsx from "clsx";
import type { KnowledgeNode } from "../../../lib/storage";

export function GraphPanel({ selectedNode }: { selectedNode?: KnowledgeNode }) {
  return (
    <div className="relative">
      {[
        {
          label: "罗尔定理",
          state: selectedNode?.id === "node-rolle" ? ("active" as const) : ("done" as const),
          hint: selectedNode?.id === "node-rolle" ? "当前资料命中" : "前置 · 已掌握",
        },
        {
          label: "中值定理",
          state: selectedNode?.id === "node-mvt" || !selectedNode ? ("active" as const) : ("done" as const),
          hint: selectedNode?.id === "node-mvt" || !selectedNode ? "正在学习" : "核心节点",
        },
        {
          label: "柯西中值定理",
          state: selectedNode?.id === "node-cauchy" ? ("active" as const) : ("next" as const),
          hint: selectedNode?.id === "node-cauchy" ? "当前资料命中" : "下一站",
        },
        {
          label: "导数应用",
          state: selectedNode?.id === "node-applications" ? ("active" as const) : ("later" as const),
          hint: selectedNode?.id === "node-applications" ? "当前资料命中" : "后续延伸",
        },
      ].map((node, index, nodes) => {
        const isLast = index === nodes.length - 1;
        return (
          <div key={node.label} className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  "w-3 h-3 rounded-full shrink-0 z-10 transition-all",
                  node.state === "done" && "bg-qz-mastered",
                  node.state === "active" && "bg-qz-primary ring-4 ring-qz-primary/15",
                  node.state === "next" && "bg-white border-2 border-qz-primary/40",
                  node.state === "later" && "bg-black/10 dark:bg-white/10"
                )}
              />
              {!isLast ? (
                <div
                  className={clsx("w-px flex-1 my-1", node.state === "done" ? "bg-qz-mastered/40" : "bg-black/8 dark:bg-white/10")}
                  style={{ minHeight: 28 }}
                />
              ) : null}
            </div>
            <div className={clsx("pb-5", isLast && "pb-0")}>
              <div
                className={clsx(
                  "text-[13px] leading-tight",
                  node.state === "active"
                    ? "text-qz-primary font-medium"
                    : node.state === "later"
                    ? "text-qz-text-muted"
                    : "text-qz-text-strong dark:text-qz-text-dark"
                )}
              >
                {node.label}
              </div>
              <div className="text-[11px] text-qz-text-muted mt-0.5">{node.hint}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

