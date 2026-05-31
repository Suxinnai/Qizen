import type { StudyResourceLead } from "./study/types";

interface DuckDuckGoTopic {
  FirstURL?: string;
  Text?: string;
  Result?: string;
  Name?: string;
  Topics?: DuckDuckGoTopic[];
}

interface DuckDuckGoResponse {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: DuckDuckGoTopic[];
}

type OpenSearchResponse = [string, string[], string[], string[]];

export interface WebResourceAgentResult {
  leads: StudyResourceLead[];
  usedLiveSearch: boolean;
  errorSummary?: string;
}

function searchUrl(query: string) {
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
}

function localResourceLeads(localTitles: string[]): StudyResourceLead[] {
  return localTitles.slice(0, 2).map((title, index) => ({
    id: `lead-local-${index}`,
    title,
    type: "local",
    source: "本地资料库",
    reason: "与你当前主题最接近，可优先作为可信依据。",
    live: false,
  }));
}

function fallbackWebLeads(topic: string): StudyResourceLead[] {
  return [
    {
      id: "lead-web-course",
      title: `${topic} 入门课程/系统教程`,
      type: "course",
      source: "Web Agent 搜索入口",
      reason: "用于建立全局框架，适合第一轮学习前 20 分钟快速扫清结构。",
      url: searchUrl(`${topic} 入门课程 系统教程`),
      live: false,
    },
    {
      id: "lead-web-article",
      title: `${topic} 核心概念文章`,
      type: "article",
      source: "Web Agent 搜索入口",
      reason: "适合提炼定义、条件、易错点，并自动整理到笔记。",
      url: searchUrl(`${topic} 核心概念 易错点`),
      live: false,
    },
    {
      id: "lead-web-practice",
      title: `${topic} 配套练习题`,
      type: "practice",
      source: "Web Agent 搜索入口",
      reason: "用于番茄钟练习阶段计时，并生成检查题。",
      url: searchUrl(`${topic} 练习题 答案 解析`),
      live: false,
    },
  ];
}

function flattenTopics(topics: DuckDuckGoTopic[] = []): DuckDuckGoTopic[] {
  return topics.flatMap((topic) => (topic.Topics?.length ? flattenTopics(topic.Topics) : [topic]));
}

function cleanTitle(text: string, topic: string) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+-\s+.*$/, "")
    .trim()
    .slice(0, 68) || `${topic} 学习资源`;
}

function typeForIndex(index: number): StudyResourceLead["type"] {
  if (index === 0) return "article";
  if (index === 1) return "course";
  return "practice";
}

function sourceLabel(endpoint: "wikipedia" | "wikibooks" | "zh-wikipedia") {
  if (endpoint === "wikibooks") return "Wikibooks";
  if (endpoint === "zh-wikipedia") return "中文维基百科";
  return "Wikipedia";
}

function typeForEndpoint(endpoint: "wikipedia" | "wikibooks" | "zh-wikipedia", index: number): StudyResourceLead["type"] {
  if (endpoint === "wikibooks") return index >= 2 ? "practice" : "course";
  return "article";
}

function buildOpenSearchLeads(
  endpoint: "wikipedia" | "wikibooks" | "zh-wikipedia",
  response: OpenSearchResponse
): StudyResourceLead[] {
  const [, titles = [], descriptions = [], urls = []] = response;
  return titles
    .map<StudyResourceLead | null>((title, index) => {
      const url = urls[index];
      if (!title || !url) return null;
      return {
        id: `lead-live-${endpoint}-${index}`,
        title: cleanTitle(title, title),
        type: typeForEndpoint(endpoint, index),
        source: sourceLabel(endpoint),
        reason:
          descriptions[index]?.replace(/\s+/g, " ").trim().slice(0, 110) ||
          (endpoint === "wikibooks" ? "开放教程资源，适合按章节推进学习。" : "概念解释入口，适合先建立定义和背景。"),
        url,
        live: true,
      };
    })
    .filter((lead): lead is StudyResourceLead => lead !== null);
}

function buildLiveLeads(topic: string, response: DuckDuckGoResponse): StudyResourceLead[] {
  const leads: StudyResourceLead[] = [];
  if (response.AbstractURL && (response.AbstractText || response.Heading)) {
    leads.push({
      id: "lead-live-abstract",
      title: cleanTitle(response.Heading || response.AbstractText || topic, topic),
      type: "article",
      source: "DuckDuckGo Instant Answer",
      reason: response.AbstractText
        ? response.AbstractText.replace(/\s+/g, " ").trim().slice(0, 96)
        : "搜索结果给出的主题概览，可作为第一轮理解入口。",
      url: response.AbstractURL,
      live: true,
    });
  }

  for (const [index, topicItem] of flattenTopics(response.RelatedTopics).entries()) {
    if (!topicItem.FirstURL || !topicItem.Text) continue;
    if (leads.some((lead) => lead.url === topicItem.FirstURL)) continue;
    leads.push({
      id: `lead-live-${index}`,
      title: cleanTitle(topicItem.Text, topic),
      type: typeForIndex(leads.length),
      source: "DuckDuckGo Related Topics",
      reason: topicItem.Text.replace(/\s+/g, " ").trim().slice(0, 110),
      url: topicItem.FirstURL,
      live: true,
    });
    if (leads.length >= 3) break;
  }

  return leads;
}

async function fetchDuckDuckGo(topic: string, signal: AbortSignal) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    `${topic} learning resources`
  )}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`搜索请求失败（${response.status}）`);
  return (await response.json()) as DuckDuckGoResponse;
}

async function fetchOpenSearch(
  endpoint: "wikipedia" | "wikibooks" | "zh-wikipedia",
  topic: string,
  signal: AbortSignal
) {
  const baseUrl =
    endpoint === "wikibooks"
      ? "https://en.wikibooks.org/w/api.php"
      : endpoint === "zh-wikipedia"
      ? "https://zh.wikipedia.org/w/api.php"
      : "https://en.wikipedia.org/w/api.php";
  const url = `${baseUrl}?action=opensearch&format=json&origin=*&limit=3&search=${encodeURIComponent(topic)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${sourceLabel(endpoint)} 请求失败（${response.status}）`);
  return (await response.json()) as OpenSearchResponse;
}

export async function findLearningResources(input: {
  topic: string;
  localTitles: string[];
  timeoutMs?: number;
}): Promise<WebResourceAgentResult> {
  const localLeads = localResourceLeads(input.localTitles);
  const fallbackLeads = fallbackWebLeads(input.topic);
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), input.timeoutMs ?? 5500);

  try {
    const [zhWiki, wiki, wikibooks, duckDuckGo] = await Promise.allSettled([
      fetchOpenSearch("zh-wikipedia", input.topic, controller.signal),
      fetchOpenSearch("wikipedia", input.topic, controller.signal),
      fetchOpenSearch("wikibooks", input.topic, controller.signal),
      fetchDuckDuckGo(input.topic, controller.signal),
    ]);
    const liveLeads = [
      ...(zhWiki.status === "fulfilled" ? buildOpenSearchLeads("zh-wikipedia", zhWiki.value).slice(0, 1) : []),
      ...(wiki.status === "fulfilled" ? buildOpenSearchLeads("wikipedia", wiki.value).slice(0, 1) : []),
      ...(wikibooks.status === "fulfilled" ? buildOpenSearchLeads("wikibooks", wikibooks.value).slice(0, 2) : []),
      ...(duckDuckGo.status === "fulfilled" ? buildLiveLeads(input.topic, duckDuckGo.value).slice(0, 1) : []),
    ].filter((lead, index, list) => list.findIndex((item) => item.url === lead.url) === index);

    if (liveLeads.length > 0) {
      return {
        leads: [...localLeads, ...liveLeads, ...fallbackLeads].slice(0, 5),
        usedLiveSearch: true,
      };
    }

    return {
      leads: [...localLeads, ...fallbackLeads].slice(0, 5),
      usedLiveSearch: false,
      errorSummary: "在线搜索没有返回可直接引用的结果，已提供可点击搜索入口。",
    };
  } catch (error) {
    const errorSummary =
      error instanceof Error && error.name === "AbortError"
        ? "在线搜索超时，已降级为可点击搜索入口。"
        : error instanceof Error
        ? error.message
        : "在线搜索不可用，已降级为可点击搜索入口。";
    return {
      leads: [...localLeads, ...fallbackLeads].slice(0, 5),
      usedLiveSearch: false,
      errorSummary,
    };
  } finally {
    globalThis.clearTimeout(timer);
  }
}
