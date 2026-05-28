import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, CheckCircle2, Clock, Database, MessageSquareText, Settings, Sparkles, UserRound } from "lucide-react";

import { getStudyInteractionCount, loadAppData, modeLabel, resetOnboarding, type LearningScores } from "../lib/storage";

/** 纯 CSS 雷达图：4 个轴 visual / auditory / reading / kinesthetic */
function LearningRadar({ scores }: { scores: LearningScores }) {
  const axes: { key: keyof LearningScores; label: string; angle: number }[] = [
    { key: "visual", label: "视觉", angle: -90 },
    { key: "auditory", label: "听觉", angle: 0 },
    { key: "reading", label: "阅读", angle: 90 },
    { key: "kinesthetic", label: "动手", angle: 180 },
  ];

  const maxScore = Math.max(...Object.values(scores), 1);
  const cx = 110;
  const cy = 110;
  const radius = 80;

  // 计算各轴端点（网格圆）
  const gridLevels = [0.25, 0.5, 0.75, 1];

  // 计算得分点坐标
  const scorePoints = axes.map((axis) => {
    const value = scores[axis.key] / maxScore;
    const rad = (axis.angle * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * radius * value,
      y: cy + Math.sin(rad) * radius * value,
      label: axis.label,
      raw: scores[axis.key],
    };
  });

  const polygonPoints = scorePoints.map((p) => `${p.x},${p.y}`).join(" ");

  // 轴端点
  const axisEndpoints = axes.map((axis) => {
    const rad = (axis.angle * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * radius,
      y: cy + Math.sin(rad) * radius,
      labelX: cx + Math.cos(rad) * (radius + 20),
      labelY: cy + Math.sin(rad) * (radius + 20),
      label: axis.label,
    };
  });

  return (
    <div className="flex justify-center">
      <svg width="220" height="220" viewBox="0 0 220 220">
        {/* 网格圆 */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={axes
              .map((axis) => {
                const rad = (axis.angle * Math.PI) / 180;
                return `${cx + Math.cos(rad) * radius * level},${cy + Math.sin(rad) * radius * level}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="0.5"
          />
        ))}

        {/* 轴线 */}
        {axisEndpoints.map((ep) => (
          <line key={ep.label} x1={cx} y1={cy} x2={ep.x} y2={ep.y} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
        ))}

        {/* 得分区域 */}
        <polygon
          points={polygonPoints}
          fill="rgba(45,122,107,0.15)"
          stroke="#2D7A6B"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* 得分点 */}
        {scorePoints.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3.5" fill="#2D7A6B" />
        ))}

        {/* 轴标签 */}
        {axisEndpoints.map((ep) => (
          <text
            key={ep.label}
            x={ep.labelX}
            y={ep.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="#8A8478"
            fontFamily="system-ui, sans-serif"
          >
            {ep.label}
          </text>
        ))}

        {/* 数值标签 */}
        {scorePoints.map((p) => (
          <text
            key={`val-${p.label}`}
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#2D7A6B"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {p.raw}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const data = useMemo(() => loadAppData(), []);
  const profile = data.learningProfile;
  const interactionCount = getStudyInteractionCount(data);
  const allTasks = data.goals.flatMap((goal) => goal.milestones.flatMap((milestone) => milestone.tasks));
  const completedTasks = allTasks.filter((task) => task.done).length;
  const totalTasks = allTasks.length;

  const events = data.studyRecord.events;
  const totalAsks = events.filter((e) => e.type === "ask").length;
  const totalPractices = data.practiceSets.length;
  const recentEvents = events.slice(-5).reverse();

  const typeLabel: Record<string, string> = {
    ask: "提问",
    "practice-generated": "生成练习",
    "practice-completed": "完成练习",
    "progress-updated": "进度更新",
  };

  function handleReOnboard() {
    if (confirm("确定要重新进行学习画像评测吗？这将重置当前的四维分布分值并开始重新测试。")) {
      resetOnboarding();
      navigate("/onboarding");
    }
  }

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

        {/* 累计学习数据卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="qz-card !p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] text-qz-text-muted">总提问数</div>
              <MessageSquareText size={16} className="text-qz-primary" />
            </div>
            <div className="font-serif text-[32px] text-qz-primary">{totalAsks}</div>
          </div>
          <div className="qz-card !p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] text-qz-text-muted">练习套数</div>
              <Sparkles size={16} className="text-qz-info" />
            </div>
            <div className="font-serif text-[32px] text-qz-info">{totalPractices}</div>
          </div>
          <div className="qz-card !p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] text-qz-text-muted">已掌握任务</div>
              <CheckCircle2 size={16} className="text-qz-mastered" />
            </div>
            <div className="font-serif text-[32px] text-qz-mastered">{completedTasks}</div>
          </div>
          <div className="qz-card !p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] text-qz-text-muted">学习资料</div>
              <BookOpen size={16} className="text-qz-learning" />
            </div>
            <div className="font-serif text-[32px] text-qz-learning">{data.libraryItems.length}</div>
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

                {/* 雷达图 */}
                <div className="rounded-[18px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-4">
                  <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark mb-3 font-medium">学习偏好分布</div>
                  <LearningRadar scores={profile.scores} />
                </div>

                <div>
                  <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark mb-2">推荐策略</div>
                  <ul className="space-y-2 text-[13px] text-qz-text-muted">
                    {profile.teachingStrategies.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>

                <div className="pt-2.5 border-t border-black/[0.05] dark:border-white/[0.08] flex justify-end">
                  <button
                    type="button"
                    onClick={handleReOnboard}
                    className="px-4 py-2 rounded-xl border border-qz-primary/20 bg-qz-primary/5 hover:bg-qz-primary/10 text-qz-primary text-[12px] font-bold cursor-pointer transition-all duration-200 shadow-sm"
                  >
                    重新评测学习画像
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-qz-text-muted flex flex-col gap-3">
                <span>还没有学习画像，无法为您定制专属教学风格。</span>
                <button
                  type="button"
                  onClick={handleReOnboard}
                  className="px-4 py-2 rounded-xl bg-qz-primary hover:bg-qz-dark text-white text-[12px] font-bold cursor-pointer transition-all duration-200 self-start shadow-sm"
                >
                  去评测学习画像
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {/* 最近学习活动 */}
            <div className="qz-card">
              <div className="flex items-center gap-2 mb-4 text-qz-primary">
                <Clock size={17} />
                <h2 className="font-serif text-[22px]">最近活动</h2>
              </div>
              {recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-[14px] border border-black/[0.05] dark:border-white/[0.08]">
                      <div className="w-2 h-2 rounded-full bg-qz-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-qz-primary/10 text-qz-primary">
                            {typeLabel[event.type] ?? event.type}
                          </span>
                          <span className="text-[11px] text-qz-text-muted">
                            {new Date(event.recordedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[13px] text-qz-text-strong dark:text-qz-text-dark truncate">{event.question}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-qz-text-muted">还没有学习活动记录。</div>
              )}
            </div>

            {/* 快捷入口 */}
            <div className="qz-card space-y-3">
              <div className="font-serif text-[22px] text-qz-text-strong dark:text-qz-text-dark mb-2">快捷入口</div>
              <Link to="/reports" className="flex items-center gap-3 rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3 hover:border-qz-primary/30 hover:bg-[#E2F1EC]/15 hover:shadow-[0_2px_10px_rgba(45,122,107,0.03)] transition-all duration-300">
                <BarChart3 size={16} className="text-qz-primary" />
                <span className="text-[13px]">查看学习报告</span>
              </Link>
              <Link to="/settings" className="flex items-center gap-3 rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3 hover:border-qz-primary/30 hover:bg-[#E2F1EC]/15 hover:shadow-[0_2px_10px_rgba(45,122,107,0.03)] transition-all duration-300">
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
    </div>
  );
}
