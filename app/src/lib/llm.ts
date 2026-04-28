import type { LlmProviderConfig, TeachingStyle } from "./storage";
import type { LibraryRagResult } from "./rag";

export interface GenerateStudyAnswerParams {
  query: string;
  rag: LibraryRagResult;
  style: TeachingStyle;
  selectedResourceTitle?: string;
  selectedNodeLabel?: string;
  profileText: string;
  providerConfig: LlmProviderConfig;
}

export interface GenerateStudyAnswerResult {
  answer: string;
  usedFallback: boolean;
  providerLabel: string;
  errorSummary?: string;
}

export interface TestLlmConnectionResult {
  ok: boolean;
  providerLabel: string;
  errorSummary?: string;
}

const STYLE_LABELS: Record<TeachingStyle, string> = {
  story: "故事化",
  logic: "逻辑推导",
  analogy: "类比讲解",
  steps: "步骤拆解",
};

const REQUEST_TIMEOUT_MS = 45000;

function providerLabel(config: LlmProviderConfig) {
  if (config.provider === "anthropic") return config.model ? `Claude · ${config.model}` : "Claude";
  if (config.provider === "openai-compatible") return config.model ? `OpenAI Compatible · ${config.model}` : "OpenAI Compatible";
  return "本地回答";
}

function getReadableLlmError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "模型请求超时，请检查网络、Base URL 或稍后重试";
    }
    return error.message || "调用失败";
  }
  return "调用失败";
}

export function sanitizeLlmText(value: string) {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/<thinking>[\s\S]*$/gi, "")
    .replace(/<thought>[\s\S]*$/gi, "")
    .replace(/^\s*(?:思考|分析)[:：][\s\S]*?(?=\n\s*(?:#{1,6}\s*)?(?:回答|结论|我是|你可以|以下|关于)|$)/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSystemPrompt(params: GenerateStudyAnswerParams) {
  const { style, selectedResourceTitle, selectedNodeLabel, profileText, rag } = params;
  const hasEvidence = rag.results.length > 0;

  return [
    "你是一个学习辅导助手。请优先使用用户资料库中的证据来回答问题。",
    hasEvidence
      ? "当前已经检索到本地资料证据，请优先基于这些证据回答，并清楚区分结论与依据。"
      : "当前没有检索到本地资料证据。此时你仍然可以基于通用知识回答，但必须明确说明“以下解释来自通用知识，不是来自用户资料库的直接依据”。",
    `当前讲解风格偏好：${STYLE_LABELS[style]}。`,
    `当前用户画像：${profileText}。`,
    selectedResourceTitle ? `当前上下文资料：${selectedResourceTitle}。` : "",
    selectedNodeLabel ? `当前知识节点：${selectedNodeLabel}。` : "",
    "回答要求：1) 先直接回答用户问题；2) 如果有资料证据，再单独指出依据；3) 如果没有资料证据，就用自然中文说明这是通用知识解释；4) 不要因为没有命中资料就拒答。",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUserPrompt(params: GenerateStudyAnswerParams) {
  const { query, rag } = params;
  const evidence =
    rag.results.length > 0
      ? rag.results
          .map((match, index) => {
            return [
              `资料 ${index + 1}：${match.resource.title}`,
              `相关度：${match.score.toFixed(1)}`,
              `命中原因：${match.reasonDetails.join("；") || match.reasons.join("；") || "关键词命中"}`,
              `摘要：${match.matchedSummary}`,
              `片段：${match.matchedSnippet || "暂无"}`,
              `重点：${match.matchedHighlights.join("；") || "暂无"}`,
            ].join("\n");
          })
          .join("\n\n")
      : "没有检索到明确资料依据。";

  return [
    `用户问题：${query}`,
    "以下是资料库检索到的证据，请尽量基于这些内容回答：",
    evidence,
    rag.sufficient ? "检索依据较强。" : "检索依据一般，请明确提示可能不够准确。",
  ].join("\n\n");
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

async function callOpenAiCompatible(params: GenerateStudyAnswerParams) {
  const { providerConfig } = params;
  const timeout = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const baseUrl = (providerConfig.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: providerConfig.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: buildSystemPrompt(params) },
          { role: "user", content: buildUserPrompt(params) },
        ],
      }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText ? `请求失败（${response.status}）：${errorText}` : `请求失败（${response.status}）`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("模型未返回有效内容");
    return content;
  } finally {
    timeout.clear();
  }
}

async function callAnthropic(params: GenerateStudyAnswerParams) {
  const { providerConfig } = params;
  const timeout = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": providerConfig.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: providerConfig.model,
        max_tokens: 900,
        temperature: 0.3,
        system: buildSystemPrompt(params),
        messages: [{ role: "user", content: buildUserPrompt(params) }],
      }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText ? `请求失败（${response.status}）：${errorText}` : `请求失败（${response.status}）`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = data.content?.find((item) => item.type === "text")?.text?.trim();
    if (!content) throw new Error("模型未返回有效内容");
    return content;
  } finally {
    timeout.clear();
  }
}

export async function generateStudyAnswer(params: GenerateStudyAnswerParams): Promise<GenerateStudyAnswerResult> {
  const { providerConfig } = params;
  const label = providerLabel(providerConfig);

  if (!providerConfig || providerConfig.provider === "none" || !providerConfig.apiKey || !providerConfig.model) {
    return {
      answer: "",
      usedFallback: true,
      providerLabel: "本地回答",
      errorSummary: "未配置模型",
    };
  }

  try {
    const answer =
      providerConfig.provider === "anthropic"
        ? await callAnthropic(params)
        : await callOpenAiCompatible(params);

    return {
      answer: sanitizeLlmText(answer),
      usedFallback: false,
      providerLabel: label,
    };
  } catch (error) {
    return {
      answer: "",
      usedFallback: true,
      providerLabel: label,
      errorSummary: getReadableLlmError(error),
    };
  }
}

export interface GenerateConversationTitleParams {
  providerConfig: LlmProviderConfig;
  selectedResourceTitle?: string;
  messages: Array<{ role: "assistant" | "user"; content: string }>;
}

function buildConversationTitleSystemPrompt(params: GenerateConversationTitleParams) {
  return [
    "你是一个中文学习产品里的标题生成器。",
    "请根据会话内容生成一个自然、简洁、可读的中文标题。",
    "要求：1) 不超过18个字；2) 不加引号；3) 不要写句号；4) 优先概括学习主题，而不是重复空泛词。",
    params.selectedResourceTitle ? `当前资料：${params.selectedResourceTitle}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildConversationTitleUserPrompt(params: GenerateConversationTitleParams) {
  const transcript = params.messages
    .slice(0, 6)
    .map((message) => `${message.role === "user" ? "用户" : "助手"}：${message.content}`)
    .join("\n\n");

  return [
    "请为下面这段学习会话生成标题，只输出标题本身：",
    transcript || "暂无会话内容",
  ].join("\n\n");
}

function sanitizeConversationTitle(value: string) {
  return sanitizeLlmText(value)
    .replace(/[「」『』“”"'`]/g, "")
    .replace(/^[#*\-\d.\s]+/, "")
    .replace(/[。！？!?,，；;：:]+$/g, "")
    .trim()
    .slice(0, 18);
}

async function callOpenAiCompatibleForTitle(params: GenerateConversationTitleParams) {
  const timeout = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const baseUrl = (params.providerConfig.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.providerConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: params.providerConfig.model,
        temperature: 0.2,
        max_tokens: 40,
        messages: [
          { role: "system", content: buildConversationTitleSystemPrompt(params) },
          { role: "user", content: buildConversationTitleUserPrompt(params) },
        ],
      }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText ? `请求失败（${response.status}）：${errorText}` : `请求失败（${response.status}）`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("模型未返回有效内容");
    return sanitizeConversationTitle(content);
  } finally {
    timeout.clear();
  }
}

async function callAnthropicForTitle(params: GenerateConversationTitleParams) {
  const timeout = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": params.providerConfig.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: params.providerConfig.model,
        max_tokens: 40,
        temperature: 0.2,
        system: buildConversationTitleSystemPrompt(params),
        messages: [{ role: "user", content: buildConversationTitleUserPrompt(params) }],
      }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText ? `请求失败（${response.status}）：${errorText}` : `请求失败（${response.status}）`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = data.content?.find((item) => item.type === "text")?.text?.trim();
    if (!content) throw new Error("模型未返回有效内容");
    return sanitizeConversationTitle(content);
  } finally {
    timeout.clear();
  }
}

export async function generateStudyConversationTitle(params: GenerateConversationTitleParams): Promise<string | null> {
  const { providerConfig } = params;
  if (!providerConfig || providerConfig.provider === "none" || !providerConfig.apiKey || !providerConfig.model) {
    return null;
  }

  try {
    return providerConfig.provider === "anthropic"
      ? await callAnthropicForTitle(params)
      : await callOpenAiCompatibleForTitle(params);
  } catch {
    return null;
  }
}

export async function testLlmConnection(providerConfig: LlmProviderConfig): Promise<TestLlmConnectionResult> {
  const label = providerLabel(providerConfig);

  if (!providerConfig || providerConfig.provider === "none") {
    return {
      ok: false,
      providerLabel: "本地回答",
      errorSummary: "请先选择模型提供方",
    };
  }

  if (!providerConfig.apiKey || !providerConfig.model) {
    return {
      ok: false,
      providerLabel: label,
      errorSummary: "请先补全 API Key 和 Model",
    };
  }

  if (providerConfig.provider === "openai-compatible" && !providerConfig.baseUrl.trim()) {
    return {
      ok: false,
      providerLabel: label,
      errorSummary: "请先填写 Base URL",
    };
  }

  const probeParams: GenerateStudyAnswerParams = {
    query: "请只回复“连接成功”四个字。",
    rag: {
      query: "连接测试",
      topK: 0,
      totalCandidates: 0,
      results: [],
      sufficient: false,
    },
    style: "logic",
    profileText: "连接测试",
    providerConfig,
  };

  try {
    if (providerConfig.provider === "anthropic") {
      await callAnthropic(probeParams);
    } else {
      await callOpenAiCompatible(probeParams);
    }

    return {
      ok: true,
      providerLabel: label,
    };
  } catch (error) {
    return {
      ok: false,
      providerLabel: label,
      errorSummary: getReadableLlmError(error),
    };
  }
}
