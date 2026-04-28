import type { LibraryRagMatch, LibraryRagResult } from "../rag";

export function scoreLabel(score: number) {
  if (score >= 20) return "高相关";
  if (score >= 10) return "中相关";
  return "弱相关";
}

export function createEmptyRag(query: string): LibraryRagResult {
  return {
    query,
    topK: 0,
    totalCandidates: 0,
    sufficient: false,
    results: [],
  };
}

export function isStrongRagMatch(match: LibraryRagMatch, index: number) {
  return index === 0 ? match.score >= 10 : match.score >= 12;
}

export function getStrongRag(rag: LibraryRagResult) {
  if (!rag.sufficient || rag.results.length === 0) return createEmptyRag(rag.query);
  const strongResults = rag.results.filter(isStrongRagMatch);
  if (strongResults.length === 0) return createEmptyRag(rag.query);
  return {
    ...rag,
    sufficient: true,
    results: strongResults,
  };
}

export function collectHitResourceTitles(rag: LibraryRagResult | null) {
  return rag?.results.map((match) => match.resource.title) ?? [];
}

export function shouldDisplayRagEvidence(rag: LibraryRagResult) {
  return rag.sufficient && rag.results.length > 0;
}
