import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Compass, MessageSquare, Target, Upload } from "lucide-react";
import { loadAppData } from "../../lib/storage";

export function StudyEmptyState({ onSendPrompt }: { onSendPrompt: (text: string) => void }) {
  const navigate = useNavigate();
  const [data, setData] = useState(() => loadAppData());

  useEffect(() => {
    const handleSync = () => setData(loadAppData());
    window.addEventListener("qizen-appdata-change", handleSync);
    return () => window.removeEventListener("qizen-appdata-change", handleSync);
  }, []);

  const username = data.settings.username?.trim() || "学习者";
  const recentDocs = data.libraryItems.slice(0, 3);
  const pendingTasks = data.goals
    .flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks))
    .filter((task) => !task.done)
    .slice(0, 4);

  return (
    <div className="max-w-[720px] mx-auto py-12 px-4 flex flex-col gap-8 select-none">
      {/* 1. 欢迎语 Header */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex p-3 rounded-2xl bg-qz-primary/10 text-qz-primary mb-2">
          <Compass size={28} className="animate-spin-slow" />
        </div>
        <h2 className="font-serif text-[28px] text-qz-text-strong dark:text-qz-text-dark leading-snug">
          你好，{username}
        </h2>
        <p className="text-[13px] text-qz-text-muted max-w-[500px] mx-auto leading-relaxed">
          输入一个问题开始会话，或从自己的目标和资料继续学习。
        </p>
      </div>

      {/* 2. 建议快捷卡片 */}
      {pendingTasks.length > 0 ? (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-qz-primary uppercase">
            <Target size={13} />
            <span>继续目标任务</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {pendingTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => navigate("/study", { state: { source: "goal", taskId: task.id } })}
                className="qz-card !p-4 hover:border-qz-primary/30 dark:hover:border-qz-primary/30 transition-all hover:-translate-y-0.5 text-left flex gap-3 group cursor-pointer"
              >
                <span className="w-6 h-6 rounded-lg bg-qz-primary/10 text-qz-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-qz-primary group-hover:text-white transition-colors">
                  <MessageSquare size={12} />
                </span>
                <span className="text-[12.5px] text-qz-text-strong dark:text-qz-text-dark leading-relaxed group-hover:text-qz-primary transition-colors">
                  {task.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* 3. 关联资料快捷卡片 */}
      {recentDocs.length > 0 ? (
        <div className="space-y-3.5 mt-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-qz-primary uppercase">
            <BookOpen size={13} />
            <span>基于已有资料快速开展</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() =>
                  onSendPrompt(
                    `我想学习资料《${doc.title}》的内容，请帮我概括一下它的核心重点与包含的数学定理。`
                  )
                }
                className="qz-card !p-4 hover:border-qz-primary/30 dark:hover:border-qz-primary/30 transition-all hover:-translate-y-0.5 text-left flex flex-col gap-2 group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-qz-primary/10 text-qz-primary font-bold">
                    {doc.type}
                  </span>
                  <span className="text-[10px] text-qz-text-muted truncate flex-1">
                    {doc.course}
                  </span>
                </div>
                <div className="text-[12.5px] font-medium text-qz-text-strong dark:text-qz-text-dark line-clamp-2 leading-snug group-hover:text-qz-primary transition-colors">
                  {doc.title}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {pendingTasks.length === 0 && recentDocs.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => navigate("/goals")}
            className="qz-card !p-4 hover:border-qz-primary/30 transition-all text-left flex gap-3 group cursor-pointer"
          >
            <Target size={16} className="text-qz-primary mt-0.5" />
            <span className="text-[12.5px] text-qz-text-strong dark:text-qz-text-dark">创建第一个学习目标</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/library")}
            className="qz-card !p-4 hover:border-qz-primary/30 transition-all text-left flex gap-3 group cursor-pointer"
          >
            <Upload size={16} className="text-qz-primary mt-0.5" />
            <span className="text-[12.5px] text-qz-text-strong dark:text-qz-text-dark">上传资料后开始问答</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
