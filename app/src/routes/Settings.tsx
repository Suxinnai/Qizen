import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadAppData, modeLabel, resetOnboarding, updateSettings } from "../lib/storage";

export default function Settings() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadAppData(), []);
  const [settings, setSettings] = useState(initial.settings);
  const profile = initial.learningProfile;

  function patch<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    updateSettings({ [key]: value } as Partial<typeof settings>);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-[1100px] mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-[34px] text-qz-primary mb-2">设置</h1>
          <p className="font-serif italic text-[14px] text-qz-text-muted">知人者智，自知者明</p>
        </div>

        <div className="qz-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-[24px] text-qz-text-strong dark:text-qz-text-dark">我的学习画像</h2>
              <p className="text-[12px] text-qz-text-muted mt-1">栖知会持续观察你的学习习惯，自动微调画像</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetOnboarding();
                navigate("/onboarding");
              }}
              className="px-4 py-2 rounded-md border border-black/10 dark:border-white/10 text-[12px] hover:bg-black/5 dark:hover:bg-white/5"
            >
              重新测试
            </button>
          </div>

          {profile ? (
            <div className="grid md:grid-cols-[1.1fr,1fr] gap-6">
              <div className="space-y-4">
                {Object.entries(profile.scores).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[13px] mb-2">
                      <span>{modeLabel(key as keyof typeof profile.scores)}</span>
                      <span className="text-qz-text-muted">{value} / 8</span>
                    </div>
                    <div className="h-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-qz-primary to-qz-light" style={{ width: `${(value / 8) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="rounded-qz bg-qz-primary/6 p-4">
                  <div className="font-serif text-[22px] text-qz-primary mb-2">{modeLabel(profile.dominantMode)}型学习者</div>
                  <p className="text-[13px] text-qz-text-muted leading-7">{profile.summary}</p>
                </div>
                <div>
                  <div className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark mb-2">推荐策略</div>
                  <ul className="space-y-2 text-[13px] text-qz-text-muted">
                    {profile.teachingStrategies.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-qz-text-muted">还没有学习画像，请先完成测试。</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="qz-card space-y-5">
            <div>
              <div className="font-serif text-[22px] text-qz-text-strong dark:text-qz-text-dark mb-1">学习偏好</div>
              <div className="text-[12px] text-qz-text-muted">这些设置会影响日常学习体验。</div>
            </div>

            <label className="block">
              <div className="text-[13px] mb-2">默认番茄时长：{settings.pomodoroMinutes} 分钟</div>
              <input
                type="range"
                min={15}
                max={50}
                step={5}
                value={settings.pomodoroMinutes}
                onChange={(e) => patch("pomodoroMinutes", Number(e.target.value))}
                className="w-full accent-[#2D7A6B]"
              />
            </label>

            <label className="block">
              <div className="text-[13px] mb-2">默认教学风格</div>
              <select
                value={settings.preferredStyle}
                onChange={(e) => patch("preferredStyle", e.target.value as typeof settings.preferredStyle)}
                className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-[13px] outline-none"
              >
                <option value="story">故事化</option>
                <option value="logic">逻辑推导</option>
                <option value="analogy">类比讲解</option>
                <option value="steps">步骤拆解</option>
              </select>
            </label>
          </div>

          <div className="qz-card space-y-5">
            <div>
              <div className="font-serif text-[22px] text-qz-text-strong dark:text-qz-text-dark mb-1">提醒与数据</div>
              <div className="text-[12px] text-qz-text-muted">把重要设置固定下来，后面你会省很多事。</div>
            </div>

            <label className="flex items-center justify-between rounded-md border border-black/5 dark:border-white/5 px-4 py-3">
              <span className="text-[13px]">开启提醒</span>
              <input
                type="checkbox"
                checked={settings.remindersEnabled}
                onChange={(e) => patch("remindersEnabled", e.target.checked)}
                className="accent-[#2D7A6B]"
              />
            </label>

            <div className="rounded-md border border-dashed border-black/10 dark:border-white/10 px-4 py-4 text-[12px] text-qz-text-muted">
              当前版本已持久化保存：学习画像、目标/任务、笔记、偏好设置。后续会继续补资料库与学习空间的数据闭环。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
