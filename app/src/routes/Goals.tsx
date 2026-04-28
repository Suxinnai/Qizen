import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Target } from "lucide-react";
import { loadAppData } from "../lib/storage";

export default function Goals() {
  const navigate = useNavigate();
  const data = useMemo(() => loadAppData(), []);
  const [selectedGoalId, setSelectedGoalId] = useState(data.goals[0]?.id ?? "");

  const selectedGoal = data.goals.find((goal) => goal.id === selectedGoalId) ?? data.goals[0];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-[1180px] mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[34px] text-qz-primary mb-2">我的目标</h1>
            <p className="font-serif italic text-[14px] text-qz-text-muted">千里之行，始于栖叶</p>
          </div>
          <button className="px-4 py-2 rounded-md bg-qz-primary text-white text-[13px] hover:bg-qz-dark transition-colors">
            新建目标
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {data.goals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => setSelectedGoalId(goal.id)}
              className={clsx(
                "qz-card text-left relative overflow-hidden",
                selectedGoalId === goal.id && "ring-2 ring-qz-primary/30"
              )}
            >
              <div
                className="absolute inset-x-0 top-0 h-24 opacity-90"
                style={{
                  background:
                    goal.status === "done"
                      ? "linear-gradient(135deg, #d7d7d7 0%, #b8b8b8 100%)"
                      : goal.subject === "数学"
                      ? "linear-gradient(135deg, #2D7A6B 0%, #5BA593 100%)"
                      : "linear-gradient(135deg, #4a6fa5 0%, #7ab6d9 100%)",
                }}
              />
              <div className="relative z-10 pt-16">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-serif text-[22px] text-qz-text-strong dark:text-qz-text-dark">{goal.title}</div>
                    <div className="text-[12px] text-qz-text-muted mt-1">{goal.description}</div>
                  </div>
                  <div className="text-[12px] text-qz-text-muted">{Math.round(goal.progress * 100)}%</div>
                </div>
                <div className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="h-full bg-qz-primary" style={{ width: `${goal.progress * 100}%` }} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedGoal && (
          <div className="qz-card">
            <div className="flex items-center gap-3 mb-5">
              <Target size={18} className="text-qz-primary" />
              <div>
                <h2 className="font-serif text-[24px] text-qz-text-strong dark:text-qz-text-dark">{selectedGoal.title}</h2>
                <p className="text-[12px] text-qz-text-muted mt-1">{selectedGoal.description}</p>
              </div>
            </div>

            <div className="space-y-5">
              {selectedGoal.milestones.map((milestone) => (
                <div key={milestone.id} className="rounded-qz border border-black/5 dark:border-white/5 overflow-hidden">
                  <div className="px-4 py-3 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[14px] text-qz-text-strong dark:text-qz-text-dark">
                      {milestone.done ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span>{milestone.title}</span>
                    </div>
                    <span className="text-[12px] text-qz-text-muted">{milestone.tasks.filter((t) => t.done).length} / {milestone.tasks.length}</span>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    {milestone.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border border-black/5 dark:border-white/5 px-3 py-3">
                        <div className="min-w-0">
                          <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark">{task.title}</div>
                          <div className="text-[11px] text-qz-text-muted mt-1">{task.meta}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={clsx("text-[12px] px-2 py-1 rounded-full", task.done ? "bg-qz-mastered/15 text-qz-primary" : "bg-black/5 dark:bg-white/5 text-qz-text-muted")}>{task.done ? "已完成" : "待学习"}</span>
                          <button
                            type="button"
                            onClick={() => navigate("/study", { state: { source: "goal", taskId: task.id } })}
                            className="text-[12px] px-3 py-1.5 rounded-full bg-qz-primary/10 text-qz-primary hover:bg-qz-primary/15 transition-colors"
                          >
                            去学习
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
