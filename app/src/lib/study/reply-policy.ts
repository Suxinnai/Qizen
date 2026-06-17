import type { LibraryRagMatch, LibraryRagResult } from "../rag";
import type { TeachingStyle } from "../storage";
import { isNonLearningChat } from "./intent";

const STYLE_LABELS: Record<TeachingStyle, string> = {
  story: "故事化",
  logic: "逻辑推导",
  analogy: "类比讲解",
  steps: "步骤拆解",
};

const STYLE_RESPONSES: Record<TeachingStyle, string> = {
  story:
    "我会把这个主题放进一个具体的情境或故事里，让抽象的概念先有画面，再慢慢落到定义和细节上。",
  logic:
    "我会从最核心的前提出发，一步步推导出结论，帮你看清每个判断之间「为什么成立」的因果链。",
  analogy:
    "我会用你熟悉的事物来打比方，先借类比建立直觉，再指出类比和原概念在哪里一致、在哪里需要修正。",
  steps:
    "我会把它拆成可逐条检查的小步骤，按顺序推进，每一步都能停下来确认是否真的掌握。",
};

export function teachingStyleLabel(style: TeachingStyle) {
  return STYLE_LABELS[style];
}

function buildEvidenceLine(match: LibraryRagMatch) {
  const parts = [
    `命中资料：《${match.resource.title}》`,
    match.reasons.length > 0 ? `依据：${match.reasons.join("、")}` : "",
    match.matchedTerms.length > 0 ? `关键词：${match.matchedTerms.slice(0, 6).join("、")}` : "",
    match.isCurrentResource ? "当前资料已加权" : "",
    match.isCurrentNodeLinked ? "当前节点已加权" : "",
  ].filter(Boolean);

  return parts.join("；");
}

export function buildAssistantReply(params: {
  query: string;
  style: TeachingStyle;
  selectedResourceTitle?: string;
  selectedNodeLabel?: string;
  rag: LibraryRagResult;
}) {
  const { query, style, selectedResourceTitle, selectedNodeLabel, rag } = params;
  if (isNonLearningChat(query)) {
    return [
      "## 我能帮你做什么",
      "我是栖知学习空间里的 AI 学习助手，主要负责陪你拆知识点、找资料依据、整理笔记、安排练习和推进学习路径。",
      "- 解释概念、定理和例题",
      "- 从资料库里找依据",
      "- 把回答整理成可复习的笔记",
      "- 根据当前上下文生成练习",
    ].join("\n\n");
  }
  const top = rag.results[0];
  const contextLead = selectedResourceTitle
    ? `我先按你当前带入的《${selectedResourceTitle}》来回答`
    : "我先按资料库里最相关的内容来回答";

  if (!top) {
    return [
      "## 这次没有命中本地资料",
      `${contextLead}，但没有检索到能直接支撑「${query}」的片段。`,
      "> 没有命中资料时，我不会把无关内容硬塞成依据。配置模型后，这里会继续给出通用知识回答。",
      selectedNodeLabel
        ? `如果你是在继续学「${selectedNodeLabel}」，可以把问题问得更具体一点。`
        : "你可以继续补充主题、上传资料，或直接新开一个学习会话换题。",
    ].join("\n\n");
  }

  const secondary = rag.results[1];
  const explanationParts = [
    "## 结论",
    `${contextLead}${selectedNodeLabel ? `，并优先考虑「${selectedNodeLabel}」这个节点` : ""}。`,
    "## 依据",
    `- ${buildEvidenceLine(top)}`,
    `- 命中片段：${top.matchedSnippet}`,
    "## 解释",
    `结合你的问题「${query}」，更贴近资料本身的理解是：${top.matchedSummary}`,
  ];

  if (top.matchedHighlights.length > 0) {
    explanationParts.push(`重点可以先抓住：${top.matchedHighlights.join("；")}。`);
  }

  explanationParts.push("## 下一步");
  explanationParts.push(`我会继续用${STYLE_LABELS[style]}方式帮你消化：${STYLE_RESPONSES[style]}`);

  if (secondary) {
    explanationParts.push(`另外还有一份辅助资料《${secondary.resource.title}》也有相关内容，可以用来交叉确认。`);
  }

  if (!rag.sufficient) {
    explanationParts.push("> 这次检索依据还不算强。最好结合原文片段一起看。");
  }

  return explanationParts.join("\n\n");
}

export function isStudyPlanRequest(query: string) {
  return /学习计划|学习安排|怎么学|如何学|三步|路线/.test(query);
}

export function buildContextStudyPlan(params: {
  selectedResourceTitle?: string;
  selectedNodeLabel?: string;
  selectedTaskTitle?: string;
  style: TeachingStyle;
}) {
  const target =
    params.selectedResourceTitle ??
    params.selectedNodeLabel ??
    params.selectedTaskTitle ??
    "当前主题";

  return [
    `## 「${target}」轻量学习计划`,
    "1. 先建立边界：用 5 分钟确认定义、适用条件和不适用场景。",
    "2. 再连接证据：如果当前有资料命中，就优先回看资料片段；没有命中时先用通用解释建立框架。",
    "3. 最后做小验证：生成一组练习，答完后再决定是否推进任务或节点。",
    `> 当前讲解风格会继续按${STYLE_LABELS[params.style]}来组织。这个计划只作为本轮回复展示，不会自动改你的目标进度。`,
  ].join("\n\n");
}
