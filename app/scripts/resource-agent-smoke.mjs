const topic = process.argv[2] || "calculus";
const timeoutMs = 8000;

function timeoutSignal() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function fetchJson(url, label) {
  const { signal, clear } = timeoutSignal();
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`${label} returned ${response.status}`);
    return await response.json();
  } finally {
    clear();
  }
}

async function openSearch(endpoint, query) {
  const baseUrl =
    endpoint === "wikibooks"
      ? "https://en.wikibooks.org/w/api.php"
      : endpoint === "zh-wikipedia"
      ? "https://zh.wikipedia.org/w/api.php"
      : "https://en.wikipedia.org/w/api.php";
  const url = `${baseUrl}?action=opensearch&format=json&origin=*&limit=3&search=${encodeURIComponent(query)}`;
  const [, titles = [], , urls = []] = await fetchJson(url, endpoint);
  return titles
    .map((title, index) => ({ title, url: urls[index], source: endpoint }))
    .filter((lead) => lead.title && lead.url);
}

async function duckDuckGo(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    `${query} learning resources`
  )}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  const response = await fetchJson(url, "duckduckgo");
  const leads = [];
  if (response.AbstractURL && (response.AbstractText || response.Heading)) {
    leads.push({ title: response.Heading || query, url: response.AbstractURL, source: "duckduckgo" });
  }
  for (const item of response.RelatedTopics || []) {
    if (item.FirstURL && item.Text) leads.push({ title: item.Text, url: item.FirstURL, source: "duckduckgo" });
  }
  return leads;
}

const results = await Promise.allSettled([
  openSearch("zh-wikipedia", topic),
  openSearch("wikipedia", topic),
  openSearch("wikibooks", topic),
  duckDuckGo(topic),
]);

const leads = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
const uniqueLeads = leads.filter((lead, index, list) => list.findIndex((item) => item.url === lead.url) === index);

for (const result of results) {
  if (result.status === "rejected") console.warn(result.reason?.message || String(result.reason));
}

if (uniqueLeads.length === 0) {
  console.error(`No live resource leads returned for "${topic}".`);
  process.exit(1);
}

console.log(`Live resource smoke passed for "${topic}".`);
for (const lead of uniqueLeads.slice(0, 5)) {
  console.log(`- [${lead.source}] ${lead.title}: ${lead.url}`);
}
