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
    "把它想成一条从山脚开到山顶的路。你从起点到终点有一个整体平均速度，而拉格朗日中值定理告诉你：在这段旅程里，一定有某一刻，你车上的时速表恰好等于整个旅程的平均速度。",
  logic:
    "逻辑上，它的核心是：函数在闭区间连续、开区间可导。因为先满足连续，所以图像不断裂；再满足可导，所以每个内部点都有切线。由罗尔定理推广，就能推出某一点的导数等于割线斜率。",
  analogy:
    "你可以把它理解成开车。全程 120 公里，花了 2 小时，平均时速就是 60。只要你是平稳连续地开，并且中间没有瞬移，那么一定存在一个瞬间，你的瞬时速度刚好就是 60。",
  steps:
    "记它分 3 步：① 先检查闭区间连续；② 再检查开区间可导；③ 套公式：f'(c) = [f(b)-f(a)] / (b-a)。如果前两步不成立，第三步就不能直接用。",
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
      "我是栖知学习空间里的 AI 学习助手，主要负责陪你拆知识点、找资料依据、整理笔记、安排练习和推进学习路径。",
      "这类问题不会触发资料库检索，所以我不会把无关资料硬塞成依据。你可以直接问我一个知识点，或者从目标、资料库、笔记里带上下文进来学。",
    ].join("\n\n");
  }
  const top = rag.results[0];
  const contextLead = selectedResourceTitle
    ? `我先按你当前带入的《${selectedResourceTitle}》来回答`
    : "我先按资料库里最相关的内容来回答";

  if (!top) {
    return [
      `${contextLead}，但这次没有检索到能直接支撑「${query}」的本地资料片段。`,
      "按学习空间的设计，没命中资料时本来应该继续走大模型的通用知识回答，而不是被资料库卡死。",
      `所以在当前这个兜底分支里，我不应该硬套固定话术来答你。${selectedNodeLabel ? `如果你其实是在继续学「${selectedNodeLabel}」，可以把问题问得更具体一点；` : ""}你也可以直接新开一个学习会话换题。`,
    ].join("\n\n");
  }

  const secondary = rag.results[1];
  const explanationParts = [
    `${contextLead}${selectedNodeLabel ? `，并优先考虑「${selectedNodeLabel}」这个节点` : ""}。`,
    buildEvidenceLine(top),
    `从命中的片段来看，${top.matchedSnippet}`,
    `结合你的问题「${query}」，更贴近资料本身的理解是：${top.matchedSummary}`,
  ];

  if (top.matchedHighlights.length > 0) {
    explanationParts.push(`这份资料当前最值得抓住的重点是：${top.matchedHighlights.join("；")}。`);
  }

  explanationParts.push(`我会继续用${STYLE_LABELS[style]}方式帮你消化：${STYLE_RESPONSES[style]}`);

  if (secondary) {
    explanationParts.push(`另外还有一份辅助资料《${secondary.resource.title}》也有相关内容，可以用来交叉确认。`);
  }

  if (!rag.sufficient) {
    explanationParts.push("不过这次检索到的依据还不算特别强，资料库没有明确依据，以下解释可能不够准确。你最好结合原文片段一起看。");
  }

  return explanationParts.join("\n\n");
}
