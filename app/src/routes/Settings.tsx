import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { testLlmConnection } from "../lib/llm";
import { readLlmApiKey, resolveLlmProviderConfig, saveLlmApiKey } from "../lib/secretStore";
import {
  getStudyInteractionCount,
  loadAppData,
  updateSettings,
  resetOnboarding,
  type LlmProviderType,
} from "../lib/storage";

type ConnectionStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function StatusBadge({ status }: { status: "已接入" | "规划中" | "本地保存" }) {
  const cls =
    status === "已接入"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "本地保存"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "bg-black/[0.04] dark:bg-white/[0.06] text-qz-text-muted";
  return <span className={`text-[10px] px-2 py-1 rounded-full ${cls}`}>{status}</span>;
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  status = "已接入",
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  status?: "已接入" | "规划中" | "本地保存";
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
      <div>
        <div className="flex items-center gap-2 text-[14px] text-qz-text-strong dark:text-qz-text-dark">
          <span>{label}</span>
          <StatusBadge status={status} />
        </div>
        {desc ? <div className="text-[12px] text-qz-text-muted mt-1">{desc}</div> : null}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#2D7A6B]" />
    </label>
  );
}

function ValueRow({ label, value, status }: { label: string; value: string; status?: "已接入" | "规划中" | "本地保存" }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
      <span className="flex items-center gap-2 text-[14px] text-qz-text-strong dark:text-qz-text-dark">
        <span>{label}</span>
        {status ? <StatusBadge status={status} /> : null}
      </span>
      <span className="text-[12px] text-qz-text-muted rounded-[10px] border border-black/[0.05] dark:border-white/[0.08] px-3 py-1.5 bg-white/80 dark:bg-white/[0.03]">{value}</span>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadAppData(), []);
  const [settings, setSettings] = useState(initial.settings);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [hasSavedApiKey, setHasSavedApiKey] = useState(Boolean(initial.settings.llm.apiKey));
  const [studyInteractionCount] = useState(getStudyInteractionCount(initial));
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ kind: "idle" });

  function handleReOnboard() {
    if (confirm("确定要重新进行学习画像评测吗？这将重置当前的四维分布分值并开始重新测试。")) {
      resetOnboarding();
      navigate("/onboarding");
    }
  }

  useEffect(() => {
    let disposed = false;

    async function loadSavedApiKey() {
      if (initial.settings.llm.apiKey.trim()) {
        await saveLlmApiKey(initial.settings.llm.apiKey);
        updateSettings({ llm: { ...initial.settings.llm, apiKey: "" } });
      }
      const savedKey = await readLlmApiKey();
      if (disposed) return;
      setHasSavedApiKey(Boolean(savedKey?.trim() || initial.settings.llm.apiKey.trim()));
      setSettings((prev) => ({ ...prev, llm: { ...prev.llm, apiKey: "" } }));
    }

    void loadSavedApiKey();
    return () => {
      disposed = true;
    };
  }, [initial.settings.llm]);

  function patch<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setConnectionStatus({ kind: "idle" });
    updateSettings({ [key]: value } as Partial<typeof settings>);
  }

  async function handleTestConnection() {
    if (connectionStatus.kind === "testing") return;
    setConnectionStatus({ kind: "testing" });
    const providerConfig = await resolveLlmProviderConfig({
      ...settings.llm,
      apiKey: apiKeyDraft.trim() || settings.llm.apiKey,
    });
    const result = await testLlmConnection(providerConfig);
    if (result.ok) {
      setConnectionStatus({ kind: "success", message: `连接成功：${result.providerLabel} 可用` });
      return;
    }
    setConnectionStatus({ kind: "error", message: result.errorSummary ?? "连接失败，请检查配置" });
  }

  async function handleApiKeyChange(value: string) {
    setApiKeyDraft(value);
    setConnectionStatus({ kind: "idle" });
    await saveLlmApiKey(value);
    setHasSavedApiKey(Boolean(value.trim()));
    updateSettings({ llm: { ...settings.llm, apiKey: "" } });
    setSettings((prev) => ({ ...prev, llm: { ...prev.llm, apiKey: "" } }));
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-[1120px] mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-[34px] text-qz-primary mb-2">设置</h1>
          <p className="font-serif italic text-[14px] text-qz-text-muted">管理模型、自动化行为和本地数据策略</p>
        </div>

        <div className="qz-card space-y-5">
          <div>
            <div className="text-[11px] tracking-[0.24em] uppercase text-qz-primary mb-2 font-semibold">PREFERENCES · 参数配置</div>
            <h2 className="font-serif text-[24px] text-qz-text-strong dark:text-qz-text-dark">个性化智能学习环境</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="font-serif text-[20px] text-qz-text-strong dark:text-qz-text-dark mb-3">模型与 API</div>
              <div className="space-y-3">
                <label className="block rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div className="text-[13px] mb-2">主对话模型 Provider</div>
                  <select
                    value={settings.llm.provider}
                    onChange={(e) => patch("llm", { ...settings.llm, provider: e.target.value as LlmProviderType })}
                    className="w-full rounded-[10px] border border-black/[0.08] dark:border-white/[0.1] bg-transparent px-3 py-2 text-[13px] outline-none"
                  >
                    <option value="none">未配置</option>
                    <option value="openai-compatible">OpenAI Compatible</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </label>

                {settings.llm.provider === "openai-compatible" ? (
                  <label className="block rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                    <div className="text-[13px] mb-2">Base URL</div>
                    <input
                      value={settings.llm.baseUrl}
                      onChange={(e) => patch("llm", { ...settings.llm, baseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                      className="w-full rounded-[10px] border border-black/[0.08] dark:border-white/[0.1] bg-transparent px-3 py-2 text-[13px] outline-none"
                    />
                  </label>
                ) : null}

                <label className="block rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div className="text-[13px] mb-2">主对话模型</div>
                  <input
                    value={settings.llm.model}
                    onChange={(e) => patch("llm", { ...settings.llm, model: e.target.value })}
                    placeholder={settings.llm.provider === "anthropic" ? "claude-sonnet-4" : "gpt-4.1"}
                    className="w-full rounded-[10px] border border-black/[0.08] dark:border-white/[0.1] bg-transparent px-3 py-2 text-[13px] outline-none"
                  />
                </label>

                <label className="block rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] mb-2">
                    <span>Anthropic / OpenAI API Key</span>
                    <StatusBadge status="本地保存" />
                  </div>
                  <input
                    type="password"
                    value={apiKeyDraft}
                    onChange={(e) => void handleApiKeyChange(e.target.value)}
                    placeholder={hasSavedApiKey ? "已保存密钥；留空则继续使用已保存值" : "输入后从主数据中分离保存"}
                    className="w-full rounded-[10px] border border-black/[0.08] dark:border-white/[0.1] bg-transparent px-3 py-2 text-[13px] outline-none"
                  />
                  <div className="mt-2 text-[11px] text-qz-text-muted">
                    状态：{hasSavedApiKey ? "已保存密钥，不写入主 localStorage 数据" : "未保存密钥，将使用本地回答 fallback"}
                  </div>
                </label>

                <ValueRow label="Agent / 后台任务模型" value="claude-haiku-4（规划值）" status="规划中" />
                <ValueRow label="标题生成模型" value="与 Agent 模型相同" status="规划中" />
                <ValueRow label="网络搜索 API" value="Tavily（未配置）" status="规划中" />

                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={connectionStatus.kind === "testing"}
                    className="qz-btn-primary px-4 py-2 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {connectionStatus.kind === "testing" ? "测试中..." : "测试连接"}
                  </button>
                  {connectionStatus.kind === "success" ? <div className="text-[12px] text-emerald-700 dark:text-emerald-300">{connectionStatus.message}</div> : null}
                  {connectionStatus.kind === "error" ? <div className="text-[12px] text-rose-700 dark:text-rose-300">连接失败：{connectionStatus.message}</div> : null}
                </div>
              </div>
            </div>

            <div>
              <div className="font-serif text-[20px] text-qz-text-strong dark:text-qz-text-dark mb-3">自动化行为</div>
              <div className="space-y-3">
                <ToggleRow label="AI 自动启动番茄钟" checked={settings.autoStartPomodoro} onChange={(value) => patch("autoStartPomodoro", value)} />
                <ToggleRow label="AI 自动打开学习面板" checked={settings.autoOpenStudyPanels} onChange={(value) => patch("autoOpenStudyPanels", value)} />
                <ToggleRow label="AI 自动写入笔记" checked={settings.autoAppendNote} onChange={(value) => patch("autoAppendNote", value)} />
                <ToggleRow label="会话结束后生成标题" checked={settings.autoGenerateSessionTitle} onChange={(value) => patch("autoGenerateSessionTitle", value)} />
                <ToggleRow label="会话结束后整理笔记" checked={settings.autoSummarizeSessionNote} onChange={(value) => patch("autoSummarizeSessionNote", value)} status="规划中" />
                <label className="block rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div className="text-[14px] text-qz-text-strong dark:text-qz-text-dark mb-2">run_terminal 需用户确认</div>
                  <select
                    value={settings.requireTerminalConfirmation}
                    onChange={(e) => patch("requireTerminalConfirmation", e.target.value as typeof settings.requireTerminalConfirmation)}
                    className="w-full rounded-[10px] border border-black/[0.08] dark:border-white/[0.1] bg-transparent px-3 py-2 text-[13px] outline-none"
                  >
                    <option value="always">始终确认</option>
                    <option value="never">从不确认</option>
                  </select>
                </label>
              </div>
            </div>

            <div>
              <div className="font-serif text-[20px] text-qz-text-strong dark:text-qz-text-dark mb-3">记忆与数据</div>
              <div className="space-y-3">
                <label className="block rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div className="text-[14px] text-qz-text-strong dark:text-qz-text-dark mb-2">上下文保留轮数</div>
                  <input
                    type="range"
                    min={6}
                    max={20}
                    step={1}
                    value={settings.contextWindowRounds}
                    onChange={(e) => patch("contextWindowRounds", Number(e.target.value))}
                    className="w-full accent-[#2D7A6B]"
                  />
                  <div className="text-[12px] text-qz-text-muted mt-2">当前：{settings.contextWindowRounds} 轮</div>
                </label>

                <label className="block rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div className="text-[14px] text-qz-text-strong dark:text-qz-text-dark mb-2">RAG 相似度阈值</div>
                  <input
                    type="range"
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    value={settings.ragSimilarityThreshold}
                    onChange={(e) => patch("ragSimilarityThreshold", Number(e.target.value))}
                    className="w-full accent-[#2D7A6B]"
                  />
                  <div className="text-[12px] text-qz-text-muted mt-2">当前：{settings.ragSimilarityThreshold.toFixed(2)}</div>
                </label>

                <label className="block rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div className="text-[14px] text-qz-text-strong dark:text-qz-text-dark mb-2">搜索结果缓存时长</div>
                  <input
                    type="range"
                    min={1}
                    max={72}
                    step={1}
                    value={settings.searchCacheHours}
                    onChange={(e) => patch("searchCacheHours", Number(e.target.value))}
                    className="w-full accent-[#2D7A6B]"
                  />
                  <div className="text-[12px] text-qz-text-muted mt-2">当前：{settings.searchCacheHours} 小时</div>
                </label>

                <ValueRow label="默认番茄时长" value={`${settings.pomodoroMinutes} 分钟`} status="已接入" />
                <ValueRow label="当前已记录学习交互" value={`${studyInteractionCount} 次`} status="已接入" />

                <div className="flex items-center justify-between gap-4 rounded-[14px] border border-black/[0.05] dark:border-white/[0.08] px-4 py-3">
                  <div>
                    <div className="text-[14px] text-qz-text-strong dark:text-qz-text-dark font-medium">四维学习画像评估</div>
                    <div className="text-[12px] text-qz-text-muted mt-1">重新测验您的 8 个问题，以重新生成您的视觉/听觉/阅读/动手学习偏好画像模型</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReOnboard}
                    className="px-4 py-2 rounded-xl bg-qz-primary/5 hover:bg-qz-primary/10 border border-qz-primary/20 text-qz-primary text-[12px] font-bold cursor-pointer transition-all duration-200 shrink-0"
                  >
                    重新评测画像
                  </button>
                </div>

                <div className="rounded-[14px] border border-dashed border-rose-500/20 bg-rose-500/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[14px] text-rose-700 dark:text-rose-300">危险操作</div>
                      <div className="text-[12px] text-qz-text-muted mt-1">清理会话历史、导出数据和重置本地数据将在数据管理页接入；这里先禁用，避免误触。</div>
                    </div>
                    <button type="button" disabled className="px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px] cursor-not-allowed">
                      规划中
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
