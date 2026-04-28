import { Link } from "react-router-dom";
import { BarChart3, Database, Settings, UserRound } from "lucide-react";

import { getStudyInteractionCount, loadAppData, modeLabel } from "../lib/storage";

export default function Profile() {
  const data = loadAppData();
  const profile = data.learningProfile;
  const interactionCount = getStudyInteractionCount(data);
  const completedTasks = data.goals.flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks)).filter((task) => task.done).length;
  const totalTasks = data.goals.flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks)).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-[1100px] mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-[34px] text-qz-primary mb-2">个人中心</h1>
          <p className="font-serif italic text-[14px] text-qz-text-muted">认识自己，才能更稳地往前走</p>
        </div>

        <div className="qz-card grid md:grid-cols-[240px,1fr] gap-6 items-center">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-qz-light to-qz-primary text-white flex items-center justify-center text-[34px] font-serif shadow-qz-card">
              沐
            </div>
            <div className="mt-4 font-serif text-[26px] text-qz-text-strong dark:text-qz-text-dark">沐灵</div>
            <div className="mt-1 text-[12px] text-qz-mastered">在线 · 栖知学习者</div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-[18px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-4">
              <div className="text-[11px] text-qz-text-muted mb-1">学习交互</div>
              <div className="font-serif text-[30px] text-qz-primary">{interactionCount}</div>
            </div>
            <div className="rounded-[18px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-4">
              <div className="text-[11px] text-qz-text-muted mb-1">任务完成</div>
              <div className="font-serif text-[30px] text-qz-primary">{completedTasks}/{totalTasks}</div>
            </div>
            <div className="rounded-[18px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-4">
              <div className="text-[11px] text-qz-text-muted mb-1">资料数量</div>
              <div className="font-serif text-[30px] text-qz-primary">{data.libraryItems.length}</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-6">
          <div className="qz-card">
            <div className="flex items-center gap-2 mb-4 text-qz-primary">
              <UserRound size={17} />
              <h2 className="font-serif text-[22px]">学习画像</h2>
            </div>
            {profile ? (
              <div className="space-y-4">
                <div className="rounded-[18px] bg-qz-primary/6 px-4 py-4">
                  <div className="font-serif text-[24px] text-qz-primary mb-2">{modeLabel(profile.dominantMode)}型学习者</div>
                  <p className="text-[13px] text-qz-text-muted leading-7">{profile.summary}</p>
                </div>
                <div>
                  <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark mb-2">推荐策略</div>
                  <ul className="space-y-2 text-[13px] text-qz-text-muted">
                    {profile.teachingStrategies.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-qz-text-muted">还没有学习画像，可以去设置里重新测试。</div>
            )}
          </div>

          <div className="qz-card space-y-3">
            <div className="font-serif text-[22px] text-qz-text-strong dark:text-qz-text-dark mb-2">快捷入口</div>
            <Link to="/reports" className="flex items-center gap-3 rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
              <BarChart3 size={16} className="text-qz-primary" />
              <span className="text-[13px]">查看学习报告</span>
            </Link>
            <Link to="/settings" className="flex items-center gap-3 rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
              <Settings size={16} className="text-qz-primary" />
              <span className="text-[13px]">调整学习偏好</span>
            </Link>
            <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-black/[0.08] dark:border-white/[0.1] px-4 py-3 text-qz-text-muted">
              <Database size={16} />
              <span className="text-[13px]">数据管理入口规划中</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
