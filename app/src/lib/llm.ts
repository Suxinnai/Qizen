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

function providerLabel(config: LlmProviderConfig) {
  if (config.provider === "anthropic") return config.model ? `Claude · ${config.model}` : "Claude";
  if (config.provider === "openai-compatible") return config.model ? `OpenAI Compatible · ${config.model}` : "OpenAI Compatible";
  return "本地回答";
}

function buildSystemPrompt(params: GenerateStudyAnswerParams) {
  const { style, selectedResourceTitle, selectedNodeLabel, profileText } = params;
  return [
    "你是一个学习辅导助手。你的首要目标是基于用户资料库中的证据回答问题，而不是自由发挥。",
    "如果资料证据不足，必须明确说明不确定，不要假装确定。",
    `当前讲解风格偏好：${STYLE_LABELS[style]}。`,
    `当前用户画像：${profileText}。`,
    selectedResourceTitle ? `当前上下文资料：${selectedResourceTitle}。` : "",
    selectedNodeLabel ? `当前知识节点：${selectedNodeLabel}。` : "",
    "回答要求：1) 先给结论；2) 再结合证据解释；3) 如证据不足要提示。",
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
  const timeout = withTimeout(30000);
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
      throw new Error(`请求失败（${response.status}）`);
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
  const timeout = withTimeout(30000);
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
      throw new Error(`请求失败（${response.status}）`);
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
      answer,
      usedFallback: false,
      providerLabel: label,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "调用失败";
    return {
      answer: "",
      usedFallback: true,
      providerLabel: label,
      errorSummary: message,
    };
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
    const message = error instanceof Error ? error.message : "调用失败";
    return {
      ok: false,
      providerLabel: label,
      errorSummary: message,
    };
  }
}
