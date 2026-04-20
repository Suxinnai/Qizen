import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { testLlmConnection } from "../lib/llm";
import {
  getStudyInteractionCount,
  loadAppData,
  modeLabel,
  resetOnboarding,
  updateSettings,
  type LlmProviderType,
} from "../lib/storage";

type ConnectionStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function Settings() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadAppData(), []);
  const [settings, setSettings] = useState(initial.settings);
  const [studyInteractionCount] = useState(getStudyInteractionCount(initial));
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ kind: "idle" });
  const profile = initial.learningProfile;

  function patch<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setConnectionStatus({ kind: "idle" });
    updateSettings({ [key]: value } as Partial<typeof settings>);
  }

  async function handleTestConnection() {
    if (connectionStatus.kind === "testing") return;
    setConnectionStatus({ kind: "testing" });
    const result = await testLlmConnection(settings.llm);
    if (result.ok) {
      setConnectionStatus({ kind: "success", message: `连接成功：${result.providerLabel} 可用` });
      return;
    }
    setConnectionStatus({ kind: "error", message: result.errorSummary ?? "连接失败，请检查配置" });
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

            <div className="space-y-4 rounded-qz border border-black/5 dark:border-white/5 p-4">
              <div>
                <div className="font-serif text-[18px] text-qz-text-strong dark:text-qz-text-dark mb-1">模型与 API</div>
                <div className="text-[12px] text-qz-text-muted">Study 会优先用这里配置的模型来结合资料库回答，失败时再回退到本地回答。</div>
              </div>

              <label className="block">
                <div className="text-[13px] mb-2">Provider</div>
                <select
                  value={settings.llm.provider}
                  onChange={(e) => patch("llm", { ...settings.llm, provider: e.target.value as LlmProviderType })}
                  className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-[13px] outline-none"
                >
                  <option value="none">未配置</option>
                  <option value="openai-compatible">OpenAI Compatible</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </label>

              {settings.llm.provider === "openai-compatible" ? (
                <label className="block">
                  <div className="text-[13px] mb-2">Base URL</div>
                  <input
                    value={settings.llm.baseUrl}
                    onChange={(e) => patch("llm", { ...settings.llm, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-[13px] outline-none"
                  />
                </label>
              ) : null}

              <label className="block">
                <div className="text-[13px] mb-2">Model</div>
                <input
                  value={settings.llm.model}
                  onChange={(e) => patch("llm", { ...settings.llm, model: e.target.value })}
                  placeholder={settings.llm.provider === "anthropic" ? "claude-3-5-sonnet-latest" : "gpt-4o-mini"}
                  className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-[13px] outline-none"
                />
              </label>

              <label className="block">
                <div className="text-[13px] mb-2">API Key</div>
                <input
                  type="password"
                  value={settings.llm.apiKey}
                  onChange={(e) => patch("llm", { ...settings.llm, apiKey: e.target.value })}
                  placeholder="输入后仅保存在本地"
                  className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-[13px] outline-none"
                />
              </label>

              <div className="space-y-3">
                <div className="rounded-md border border-dashed border-black/10 dark:border-white/10 px-3 py-3 text-[12px] text-qz-text-muted">
                  当前状态：{settings.llm.provider !== "none" && settings.llm.apiKey && settings.llm.model ? "已配置模型，可用于真实回答" : "未完整配置，将使用本地回答"}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={connectionStatus.kind === "testing"}
                    className="px-4 py-2 rounded-md bg-qz-primary text-white text-[12px] hover:bg-qz-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {connectionStatus.kind === "testing" ? "测试中..." : "测试连接"}
                  </button>
                  {connectionStatus.kind === "success" ? (
                    <div className="text-[12px] text-emerald-700 dark:text-emerald-300">{connectionStatus.message}</div>
                  ) : null}
                  {connectionStatus.kind === "error" ? (
                    <div className="text-[12px] text-rose-700 dark:text-rose-300">连接失败：{connectionStatus.message}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-dashed border-black/10 dark:border-white/10 px-4 py-4 text-[12px] text-qz-text-muted space-y-2">
              <div>当前已记录学习交互：{studyInteractionCount} 次</div>
              <div>当前版本已持久化保存：学习画像、目标/任务、笔记、偏好设置、模型配置、学习交互记录。后续会继续补资料库与学习空间的数据闭环。</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
