import type { AppData, KnowledgeNode, LibraryItem, PracticeQuestion, PracticeQuestionEvidence } from "./storage";

export interface RetrieveRelevantLibraryContextOptions {
  resourceId?: string;
  nodeId?: string;
  topK?: number;
  minScore?: number;
}

export interface LibraryRagMatch {
  resource: LibraryItem;
  score: number;
  matchedSummary: string;
  matchedSnippet: string;
  matchedHighlights: string[];
  matchedTerms: string[];
  reasons: string[];
  reasonDetails: string[];
  isCurrentResource: boolean;
  isCurrentNodeLinked: boolean;
}

export interface LibraryRagResult {
  query: string;
  topK: number;
  totalCandidates: number;
  sufficient: boolean;
  results: LibraryRagMatch[];
}

export interface RagPracticeSet {
  title: string;
  basedOnTitles: string[];
  primaryTitle: string;
  questions: PracticeQuestion[];
}

const STOP_WORDS = new Set([
  "的",
  "了",
  "和",
  "是",
  "在",
  "我",
  "你",
  "他",
  "她",
  "它",
  "呢",
  "吗",
  "啊",
  "呀",
  "把",
  "被",
  "与",
  "及",
  "或",
  "并",
  "就",
  "都",
  "很",
  "再",
  "再讲",
  "一下",
  "一个",
  "这个",
  "那个",
  "怎么",
  "什么",
  "为什么",
  "如何",
  "哪些",
  "是否",
  "可以",
  "有关",
  "关于",
  "一下子",
  "一下下",
  "请问",
  "帮我",
  "讲讲",
  "解释",
  "说明",
  "please",
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
]);

const SYNONYM_GROUPS = [
  ["平均变化率", "割线斜率", "平均速度"],
  ["瞬时变化率", "导数", "切线斜率", "瞬时速度"],
  ["中值定理", "拉格朗日中值定理", "拉格朗日定理"],
  ["罗尔定理", "rolle定理", "rolle theorem"],
  ["几何意义", "图像意义", "直观意义"],
  ["使用条件", "成立条件", "前提条件", "适用条件"],
  ["证明思路", "证明方法", "推导思路"],
  ["应用", "题型", "用法", "应用题"],
  ["单调性", "增减性"],
  ["估值", "误差估计", "近似估计"],
];

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[，。！？、；：“”‘’（）()【】\[\],.!?;:'"`~<>《》\-_/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function getSynonymExpansions(term: string) {
  const normalized = normalizeText(term);
  const expansions = SYNONYM_GROUPS.filter((group) => group.some((item) => normalizeText(item).includes(normalized) || normalized.includes(normalizeText(item))))
    .flatMap((group) => group)
    .map((item) => normalizeText(item));
  return unique(expansions);
}

function buildCjkNgrams(part: string) {
  const grams: string[] = [];
  for (let size = 2; size <= Math.min(4, part.length); size += 1) {
    for (let index = 0; index <= part.length - size; index += 1) {
      grams.push(part.slice(index, index + size));
    }
  }
  return grams;
}

function tokenize(text: string, extraTerms: string[] = []) {
  const normalized = normalizeText(text);
  const asciiTerms = normalized
    .split(/[^a-z0-9]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item));

  const cjkParts = normalized.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  const cjkTerms = cjkParts.flatMap((part) => {
    const direct = part.length <= 10 ? [part] : [];
    return [...direct, ...buildCjkNgrams(part)];
  });

  return unique(
    [...asciiTerms, ...cjkTerms, ...extraTerms.map((item) => normalizeText(item))]
      .filter((item) => item && !STOP_WORDS.has(item) && item.length >= 2)
      .sort((a, b) => b.length - a.length)
  );
}

function countMatches(text: string, terms: string[]) {
  const normalized = normalizeText(text);
  let score = 0;
  const matchedTerms: string[] = [];

  for (const term of terms) {
    if (!term || normalized.length === 0) continue;
    if (normalized.includes(term)) {
      score += term.length >= 6 ? 2.4 : term.length >= 4 ? 1.8 : 1;
      matchedTerms.push(term);
    }
  }

  return {
    score,
    matchedTerms: unique(matchedTerms),
  };
}

function splitIntoParagraphs(text: string) {
  const compact = text.replace(/\r/g, "").trim();
  if (!compact) return [];

  const paragraphs = compact
    .split(/\n{2,}|(?<=[。！？!?])\s*(?=[\u4e00-\u9fffA-Za-z0-9])/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 8);

  return paragraphs.length > 0 ? paragraphs : [compact.replace(/\s+/g, " ")];
}

function findBestSnippet(text: string, terms: string[]) {
  const paragraphs = splitIntoParagraphs(text);
  if (paragraphs.length === 0) return "";

  let bestSnippet = paragraphs[0];
  let bestScore = -1;

  for (let index = 0; index < paragraphs.length; index += 1) {
    const current = paragraphs[index];
    const previous = paragraphs[index - 1] ?? "";
    const next = paragraphs[index + 1] ?? "";
    const merged = [previous, current, next].filter(Boolean).join(" ");
    const currentMatches = countMatches(current, terms);
    const mergedMatches = countMatches(merged, terms);
    const currentScore = currentMatches.score * 1.4 + Math.min(current.length / 180, 1.4);
    const mergedScore = mergedMatches.score + Math.min(merged.length / 240, 1.2);

    if (currentScore >= bestScore) {
      bestSnippet = current.length <= 220 ? current : current.slice(0, 217) + "...";
      bestScore = currentScore;
    }

    if (mergedMatches.score > 0 && mergedScore > bestScore + 0.4) {
      bestSnippet = merged.length <= 280 ? merged : merged.slice(0, 277) + "...";
      bestScore = mergedScore;
    }
  }

  return bestSnippet;
}

function getNodeById(data: AppData, nodeId?: string): KnowledgeNode | undefined {
  return nodeId ? data.knowledgeGraph.nodes.find((node) => node.id === nodeId) : undefined;
}

function getNodeExpansionTerms(data: AppData, selectedNode?: KnowledgeNode) {
  if (!selectedNode) return [];
  const relatedLabels = data.knowledgeGraph.nodes
    .filter((node) => selectedNode.related.includes(node.id))
    .map((node) => node.label);

  return unique([
    selectedNode.label,
    selectedNode.summary,
    selectedNode.studyHint,
    ...relatedLabels,
    ...getSynonymExpansions(selectedNode.label),
  ]);
}

function buildQueryTerms(data: AppData, query: string, selectedNode?: KnowledgeNode) {
  const baseTerms = tokenize(query);
  const synonymTerms = baseTerms.flatMap((term) => getSynonymExpansions(term));
  const nodeTerms = getNodeExpansionTerms(data, selectedNode);
  const reformulatedTerms = [
    ...baseTerms,
    ...synonymTerms,
    ...tokenize(query.replace(/什么意思|怎么理解|讲讲|解释一下/g, "几何意义 使用条件")),
    ...tokenize(query.replace(/证明|推导/g, "证明思路 前提条件 罗尔定理")),
    ...tokenize(query.replace(/应用|做题|题型/g, "应用 题型 例题")),
    ...tokenize(query.replace(/条件|前提/g, "使用条件 成立条件 闭区间连续 开区间可导")),
    ...tokenize(query.replace(/导数/g, "瞬时变化率 切线斜率 导数")),
    ...tokenize(query.replace(/中值定理/g, "拉格朗日中值定理 割线斜率")),
    ...tokenize(nodeTerms.join(" ")),
  ];

  return unique(reformulatedTerms).sort((a, b) => b.length - a.length);
}

function buildReasonDetails(params: {
  titleScore: number;
  summaryScore: number;
  highlightScore: number;
  previewScore: number;
  extractedScore: number;
  isCurrentResource: boolean;
  isCurrentNodeLinked: boolean;
  nodeLabelScore: number;
}) {
  const details: string[] = [];
  if (params.titleScore > 0) details.push("命中了标题关键词");
  if (params.summaryScore > 0) details.push("命中了摘要/概述");
  if (params.highlightScore > 0) details.push("命中了资料重点");
  if (params.previewScore > 0) details.push("命中了预览内容");
  if (params.extractedScore > 0) details.push("命中了正文段落");
  if (params.nodeLabelScore > 0) details.push("命中了当前节点标签或其关联术语");
  if (params.isCurrentResource) details.push("来自当前资料，已给予优先 boost");
  if (params.isCurrentNodeLinked) details.push("与当前学习节点关联，已给予关联 boost");
  return unique(details);
}

export function retrieveRelevantLibraryContext(
  data: AppData,
  query: string,
  options: RetrieveRelevantLibraryContextOptions = {}
): LibraryRagResult {
  const selectedNode = getNodeById(data, options.nodeId);
  const queryTerms = buildQueryTerms(data, query, selectedNode);
  const topK = options.topK ?? 3;
  const minScore = options.minScore ?? 2.6;

  const results = data.libraryItems
    .map<LibraryRagMatch | null>((item) => {
      const titleMatches = countMatches(item.title, queryTerms);
      const summaryMatches = countMatches(item.summary, queryTerms);
      const previewMatches = countMatches(item.preview, queryTerms);
      const extractedMatches = countMatches(item.extractedText, queryTerms);
      const highlightMatches = item.highlights.reduce(
        (acc, highlight) => {
          const matches = countMatches(highlight, queryTerms);
          acc.score += matches.score;
          acc.matchedTerms.push(...matches.matchedTerms);
          return acc;
        },
        { score: 0, matchedTerms: [] as string[] }
      );

      const isCurrentResource = Boolean(options.resourceId && item.id === options.resourceId);
      const isCurrentNodeLinked = Boolean(options.nodeId && item.linkedNodeIds.includes(options.nodeId));
      const nodeLabelMatches = selectedNode
        ? countMatches(
            [item.title, item.summary, item.preview, item.extractedText, ...item.highlights].join(" "),
            tokenize(getNodeExpansionTerms(data, selectedNode).join(" "))
          )
        : { score: 0, matchedTerms: [] as string[] };

      let score =
        titleMatches.score * 4.4 +
        summaryMatches.score * 3.1 +
        highlightMatches.score * 3 +
        previewMatches.score * 1.8 +
        extractedMatches.score * 1.9 +
        nodeLabelMatches.score * 1.6;

      const reasons: string[] = [];
      if (titleMatches.score > 0) reasons.push("标题命中");
      if (summaryMatches.score > 0) reasons.push("摘要命中");
      if (highlightMatches.score > 0) reasons.push("重点命中");
      if (previewMatches.score > 0) reasons.push("预览命中");
      if (extractedMatches.score > 0) reasons.push("正文命中");
      if (nodeLabelMatches.score > 0) reasons.push("节点关联术语命中");

      if (isCurrentResource) {
        score += 8;
        reasons.push("当前资料 boost");
      }

      if (isCurrentNodeLinked) {
        score += 6;
        reasons.push("当前节点 boost");
      }

      if (item.parserStatus === "parsed") score += 1.5;
      if (item.parserStatus === "partial") score += 0.5;
      if (item.highlights.length > 0) score += 0.6;

      if (score < minScore) return null;

      const matchedTerms = unique([
        ...titleMatches.matchedTerms,
        ...summaryMatches.matchedTerms,
        ...previewMatches.matchedTerms,
        ...highlightMatches.matchedTerms,
        ...extractedMatches.matchedTerms,
        ...nodeLabelMatches.matchedTerms,
      ]).sort((a, b) => b.length - a.length);

      const matchedHighlights = item.highlights.filter((highlight) =>
        matchedTerms.some((term) => normalizeText(highlight).includes(term))
      );

      return {
        resource: item,
        score,
        matchedSummary: item.summary,
        matchedSnippet: findBestSnippet(item.extractedText || item.preview || item.summary, matchedTerms),
        matchedHighlights: matchedHighlights.length > 0 ? matchedHighlights.slice(0, 3) : item.highlights.slice(0, 3),
        matchedTerms: matchedTerms.slice(0, 8),
        reasons: unique(reasons),
        reasonDetails: buildReasonDetails({
          titleScore: titleMatches.score,
          summaryScore: summaryMatches.score,
          highlightScore: highlightMatches.score,
          previewScore: previewMatches.score,
          extractedScore: extractedMatches.score,
          isCurrentResource,
          isCurrentNodeLinked,
          nodeLabelScore: nodeLabelMatches.score,
        }),
        isCurrentResource,
        isCurrentNodeLinked,
      };
    })
    .filter((item): item is LibraryRagMatch => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const sufficient = results.length > 0 && (results[0]?.score ?? 0) >= Math.max(minScore + 1.8, 5);

  return {
    query,
    topK,
    totalCandidates: data.libraryItems.length,
    sufficient,
    results,
  };
}

function pickQuestionSeed(match: LibraryRagMatch) {
  const candidates = [
    ...match.matchedHighlights,
    ...splitIntoParagraphs(match.matchedSnippet),
    match.matchedSummary,
  ].filter((item) => item && item.trim().length >= 6);

  return unique(candidates).slice(0, 3);
}

function createFillBlankPrompt(text: string, fallbackTerm: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const target = fallbackTerm || clean.slice(0, 4);
  if (target && clean.includes(target)) {
    return `填空：根据资料片段，“${clean.replace(target, "______")}”`;
  }
  return `填空：根据命中资料，这一段强调的核心术语是 ______ 。`;
}

function getEvidenceConfidence(match: LibraryRagMatch): PracticeQuestionEvidence["confidence"] {
  if (match.score >= 20 && match.matchedSnippet && match.matchedHighlights.length > 0) return "strong";
  if (match.score >= 10 && (match.matchedSnippet || match.matchedHighlights.length > 0)) return "medium";
  return "weak";
}

function buildPracticeQuestionEvidence(match: LibraryRagMatch, isTopHit: boolean): PracticeQuestionEvidence {
  const confidence = getEvidenceConfidence(match);
  return {
    sourceTitle: match.resource.title,
    sourceSnippet: match.matchedSnippet || match.matchedSummary || match.resource.preview,
    sourceHighlights: match.matchedHighlights.length > 0 ? match.matchedHighlights.slice(0, 3) : match.resource.highlights.slice(0, 3),
    sourceReason: match.reasons.join(" · ") || "关键词命中",
    reasons: match.reasonDetails.length > 0 ? match.reasonDetails : match.reasons,
    isTopHit,
    isCurrentResource: match.isCurrentResource,
    isCurrentNodeLinked: match.isCurrentNodeLinked,
    confidence,
  };
}

export function createPracticeSetFromRagResult(rag: LibraryRagResult): RagPracticeSet | null {
  if (rag.results.length === 0) return null;

  const primary = rag.results[0];
  const secondary = rag.results[1];
  const seeds = unique([
    ...pickQuestionSeed(primary),
    ...(secondary ? pickQuestionSeed(secondary).slice(0, 2) : []),
  ]).slice(0, 5);

  const firstSeed = seeds[0] ?? primary.matchedSummary;
  const secondSeed = seeds[1] ?? primary.matchedSnippet;
  const thirdSeed = seeds[2] ?? primary.matchedHighlights[0] ?? primary.matchedSummary;
  const fourthSeed = seeds[3] ?? secondary?.matchedHighlights[0] ?? primary.matchedSnippet;
  const blankTerm = primary.matchedTerms[0] ?? primary.matchedHighlights[0] ?? primary.resource.title;

  const questionMatches = [primary, primary, secondary ?? primary, secondary ?? primary];

  const questions: PracticeQuestion[] = [
    {
      id: `${primary.resource.id}-rag-q1`,
      type: "判断",
      prompt: `判断：根据《${primary.resource.title}》的命中内容，“${firstSeed}”属于这次问题相关的关键依据。`,
      answerHint: "先回看命中重点和命中片段，确认它是否被资料明确提到。",
      evidence: buildPracticeQuestionEvidence(questionMatches[0], questionMatches[0] === primary),
    },
    {
      id: `${primary.resource.id}-rag-q2`,
      type: "简答",
      prompt: `简答：只依据《${primary.resource.title}》的命中片段，说明“${secondSeed}”和你的问题有什么关系。`,
      answerHint: "尽量引用片段里的条件、关系或结论，不要脱离资料自由发挥。",
      evidence: buildPracticeQuestionEvidence(questionMatches[1], questionMatches[1] === primary),
    },
    {
      id: `${primary.resource.id}-rag-q3`,
      type: "填空",
      prompt: createFillBlankPrompt(thirdSeed, blankTerm),
      answerHint: "优先从命中重点或片段里的术语中找答案。",
      evidence: buildPracticeQuestionEvidence(questionMatches[2], questionMatches[2] === primary),
    },
    {
      id: `${primary.resource.id}-rag-q4`,
      type: "简答",
      prompt: `简答：如果你要向同学解释这次命中的依据，可以怎样用“${fourthSeed}”做一个基于资料的说明？`,
      answerHint: "先说资料讲了什么，再说它为什么能支撑这次回答。",
      evidence: buildPracticeQuestionEvidence(questionMatches[3], questionMatches[3] === primary),
    },
  ];

  return {
    title: `基于当前命中资料生成的练习题`,
    basedOnTitles: unique([primary.resource.title, secondary?.resource.title].filter(Boolean) as string[]),
    primaryTitle: primary.resource.title,
    questions,
  };
}
