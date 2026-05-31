import clsx from "clsx";
import { loadAppData, type GoalTask, type KnowledgeNode } from "../../../lib/storage";
import type { StudyJourneyStage } from "../../../lib/study/types";

export function GraphPanel({
  selectedNode,
  selectedTask,
  journeyStage,
  onSelectNode,
}: {
  selectedNode?: KnowledgeNode;
  selectedTask?: GoalTask;
  journeyStage?: StudyJourneyStage;
  onSelectNode?: (nodeId: string | null) => void;
}) {
  const data = loadAppData();
  const graph = data.knowledgeGraph;
  const activeGoal = data.goals.find((goal) => goal.status === "active") ?? data.goals[0];
  const routeTasks = activeGoal?.milestones.flatMap((milestone) => milestone.tasks) ?? [];
  const completedCount = routeTasks.filter((task) => task.done).length;
  const stageLabel: Record<StudyJourneyStage, string> = {
    define: "明确内容",
    discuss: "讨论方式",
    plan: "确认计划",
    research: "查找资料",
    learn: "引导学习",
  };

  // Build display nodes from real graph data
  const displayNodes = graph.nodes.map((node) => {
    let state: "done" | "active" | "next" | "later";
    let hint: string;

    if (selectedNode?.id === node.id) {
      state = "active";
      hint = "当前聚焦";
    } else if (node.state === "mastered") {
      state = "done";
      hint = "已掌握";
    } else if (node.state === "current") {
      state = "active";
      hint = "正在学习";
    } else if (node.state === "next") {
      state = "next";
      hint = "下一站";
    } else {
      state = "later";
      hint = "后续延伸";
    }

    return {
      id: node.id,
      label: node.label,
      state,
      hint,
      summary: node.summary,
    };
  });

  return (
    <div className="relative select-none space-y-5">
      {activeGoal ? (
        <div className="rounded-[14px] border border-qz-primary/12 bg-qz-primary/5 px-3.5 py-3">
          <div className="text-[11px] text-qz-primary font-semibold mb-1">当前路线</div>
          <div className="text-[13px] font-medium text-qz-text-strong dark:text-qz-text-dark leading-5">
            {activeGoal.title}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-qz-primary rounded-full transition-all"
              style={{ width: `${Math.round(activeGoal.progress * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-qz-text-muted">
            {completedCount}/{routeTasks.length} 个任务完成 · 当前处于{journeyStage ? stageLabel[journeyStage] : "学习"}阶段
          </div>
          {selectedTask ? (
            <div className="mt-3 rounded-[10px] bg-white/70 dark:bg-white/[0.04] px-3 py-2 text-[11.5px] leading-5 text-qz-text-muted">
              正在推进：{selectedTask.title}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
      {displayNodes.map((node, index) => {
        const isLast = index === displayNodes.length - 1;
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelectNode?.(node.id)}
            className={clsx(
              "flex gap-3 relative w-full text-left group cursor-pointer rounded-lg px-1 py-0.5 -mx-1 transition-colors",
              node.state === "active"
                ? "bg-qz-primary/5"
                : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            )}
          >
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
                  "text-[13px] leading-tight group-hover:text-qz-primary transition-colors",
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
          </button>
        );
      })}

      {displayNodes.length === 0 ? (
        <div className="text-[12px] text-qz-text-muted text-center py-6">
          暂无知识节点。确认学习计划后，这里会优先显示路线进度；上传资料后将自动构建知识图谱。
        </div>
      ) : null}
      </div>
    </div>
  );
}
