const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const outputDir = path.join(root, ".visual-smoke");
const screenshotPath = path.join(outputDir, "study.png");
const port = 18531;
const isServerOnly = process.argv.includes("--server-only");

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  const browser = candidates.find((candidate) => fs.existsSync(candidate));
  if (!browser) throw new Error("Could not find Chrome or Edge for visual smoke test");
  return browser;
}

function appDataFixture() {
  const now = new Date().toISOString();
  return {
    appState: { onboardingCompleted: true },
    learningProfile: {
      dominantMode: "reading",
      secondaryMode: "visual",
      scores: { visual: 1, auditory: 0, reading: 2, kinesthetic: 1 },
      summary: "你更容易通过提纲、笔记和结构图建立理解。",
      teachingStrategies: ["先给结构", "边学边记", "用练习检查理解"],
      updatedAt: now,
    },
    settings: {
      username: "交付验收",
      pomodoroMinutes: 25,
      preferredStyle: "steps",
      remindersEnabled: true,
      autoOpenStudyPanels: true,
      autoStartPomodoro: true,
      autoAppendNote: true,
      autoGenerateSessionTitle: false,
      autoSummarizeSessionNote: false,
      autoUpdateLearningProfile: true,
      requireTerminalConfirmation: "never",
      contextWindowRounds: 10,
      ragSimilarityThreshold: 0.75,
      searchCacheHours: 24,
      llm: { provider: "none", apiKey: "", model: "", baseUrl: "https://api.openai.com/v1" },
    },
    goals: [
      {
        id: "visual-goal-calculus",
        title: "微积分学习计划",
        description: "视觉验收用学习路线。",
        status: "active",
        progress: 0.2,
        subject: "数学",
        milestones: [
          {
            id: "visual-milestone-1",
            title: "建立理解",
            done: false,
            tasks: [
              { id: "visual-task-1", title: "明确微积分目标与基础", meta: "约 10 分钟 · 学习计划", estimatedMinutes: 10, done: true },
              { id: "visual-task-2", title: "拆成可检查的小步骤", meta: "约 20 分钟 · 学习计划", estimatedMinutes: 20, done: false },
            ],
          },
        ],
      },
    ],
    notes: [
      {
        id: "visual-note-1",
        title: "微积分学习笔记",
        topic: "微积分",
        content: "## 微积分学习笔记\n\n### AI 整理\n- 先理解极限、导数和积分的关系。",
        aiKeyPoints: [],
        confusingPoints: [],
        updatedAt: now,
      },
    ],
    libraryItems: [
      {
        id: "visual-library-calculus",
        title: "微积分学习资料",
        originalFileName: "calculus.md",
        type: "MARKDOWN",
        course: "数学",
        sizeBytes: 2048,
        sizeLabel: "2.0 KB",
        status: "indexed",
        tags: ["微积分"],
        addedAt: now,
        parserStatus: "parsed",
        extractedText: "微积分学习应先理解极限、导数和积分之间的关系，再通过练习巩固。",
        preview: "极限、导数、积分是微积分学习的主线。",
        summary: "用于验证学习计划、资源命中和练习生成的本地资料。",
        highlights: ["先理解极限", "导数描述变化率", "积分描述累积"],
        linkedNodeIds: ["visual-node-calculus"],
      },
    ],
    practiceSets: [],
    knowledgeGraph: {
      nodes: [
        {
          id: "visual-node-calculus",
          label: "微积分",
          kind: "concept",
          state: "current",
          x: 100,
          y: 100,
          summary: "极限、导数、积分构成的基础知识体系。",
          related: [],
          studyHint: "先建立主线，再进入题目。",
        },
      ],
      edges: [],
    },
    studyStats: { dailyMinutes: Array.from({ length: 30 }, () => 0) },
    studyRecord: { events: [] },
  };
}

function conversationFixture() {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    activeId: "visual-conversation",
    sidebarMode: "menu",
    conversations: [
      {
        id: "visual-conversation",
        title: "微积分学习计划",
        createdAt: now,
        updatedAt: now,
        isFreeConversation: true,
        context: null,
        selectedTaskId: "visual-task-2",
        teachingStyle: "steps",
        noteDraft: "## 微积分学习笔记\n\n### AI 整理\n- 先理解极限、导数和积分的关系。",
        messages: [
          {
            id: "visual-user-1",
            role: "user",
            content: "我想学习微积分，请先和我讨论学习方式并生成计划",
          },
          {
            id: "visual-assistant-plan",
            role: "assistant",
            kind: "plan",
            streamState: "done",
            content:
              "## 微积分 学习计划\n我会先按「步骤拆解」来带你学。\n\n### 执行路线\n1. 明确微积分目标与已有基础（10 分钟）\n2. 拆成可检查的小步骤（20 分钟）\n\n> 如果这个节奏可以，点「确认计划」。",
            thinking: ["识别学习主题", "匹配学习方式", "拆分可执行路线", "等待用户确认"],
            planSteps: [
              { id: "plan-step-1", title: "明确微积分目标与已有基础", minutes: 10 },
              { id: "plan-step-2", title: "拆成可检查的小步骤", minutes: 20 },
            ],
            triggers: ["graph"],
          },
          {
            id: "visual-assistant-agent",
            role: "assistant",
            kind: "agent",
            streamState: "done",
            content:
              "## 微积分 资源 Agent 已完成一轮查找\n我已完成在线检索，并找到 2 个可直接打开的结果。\n\n### 推荐顺序\n1. **Calculus - Wikipedia** - 概念解释入口\n2. **Calculus - Wikibooks** - 开放教程资源\n\n## 开始学习：微积分\n先做第一轮：用 10 分钟把目标、边界和已有基础说清楚。需要练习时，番茄钟会用来计时。",
            thinking: ["写入学习路线", "检索本地资料库", "完成在线资源检索", "准备引导学习"],
            resourceLeads: [
              {
                id: "lead-live-wiki",
                title: "Calculus",
                type: "article",
                source: "Wikipedia",
                reason: "概念解释入口，适合先建立定义和背景。",
                url: "https://en.wikipedia.org/wiki/Calculus",
                live: true,
              },
              {
                id: "lead-live-book",
                title: "Calculus",
                type: "course",
                source: "Wikibooks",
                reason: "开放教程资源，适合按章节推进学习。",
                url: "https://en.wikibooks.org/wiki/Calculus",
                live: true,
              },
            ],
            triggers: ["resource", "graph", "pomodoro"],
          },
        ],
      },
    ],
  };
}

function injectedIndex() {
  const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  const seedScript = `<script>
localStorage.setItem("qizen:mvp:v2", ${JSON.stringify(JSON.stringify(appDataFixture()))});
localStorage.setItem("qizen:study:conversations:v1", ${JSON.stringify(JSON.stringify(conversationFixture()))});
</script>`;
  return html.replace("</head>", `${seedScript}\n  </head>`);
}

function contentType(file) {
  if (file.endsWith(".js") || file.endsWith(".mjs")) return "text/javascript";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(injectedIndex());
      return;
    }

    const filePath = path.normalize(path.join(distDir, url.pathname));
    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    throw new Error("Missing dist/index.html. Run build before visual smoke.");
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const server = await startServer();
  const url = `http://127.0.0.1:${port}/#/study`;
  if (isServerOnly) {
    console.log(`Visual smoke fixture server: ${url}`);
    process.on("SIGTERM", () => server.close(() => process.exit(0)));
    process.on("SIGINT", () => server.close(() => process.exit(0)));
    return;
  }
  const required = ["内容", "方式", "计划", "资料", "学习", "资源 Agent", "可见思路轨迹", "记笔记", "番茄钟"];
  try {
    const electronEnv = {
      ...process.env,
      QIZEN_VISUAL_SMOKE_URL: url,
      QIZEN_VISUAL_SMOKE_OUT: screenshotPath,
      QIZEN_VISUAL_SMOKE_REQUIRED: JSON.stringify(required),
      QIZEN_VISUAL_SMOKE_PROFILE: path.join(outputDir, `electron-profile-${Date.now()}`),
      QIZEN_VISUAL_SMOKE_CACHE: path.join(outputDir, `electron-cache-${Date.now()}`),
    };
    execFileSync(path.join(root, "node_modules", "electron", "dist", "electron.exe"), [".", "--visual-smoke"], {
      encoding: "utf8",
      timeout: 60000,
      windowsHide: true,
      env: electronEnv,
    });
    server.close();
    return;
  } catch (error) {
    console.warn(error.message || String(error));
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    console.warn("Electron visual smoke failed; falling back to Chrome/Edge headless.");
  }

  const browser = findBrowser();
  const browserProfileDir = path.join(outputDir, `browser-profile-${Date.now()}`);
  const commonArgs = [
    "--headless=new",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-gpu-compositing",
    "--disable-gpu-rasterization",
    "--disable-accelerated-2d-canvas",
    "--disable-accelerated-video-decode",
    "--disable-features=VizDisplayCompositor,UseSkiaRenderer,CanvasOopRasterization,DefaultANGLEVulkan,Vulkan,UseDawn,SkiaGraphite",
    "--use-angle=swiftshader",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${browserProfileDir}`,
    `--disk-cache-dir=${path.join(outputDir, `browser-cache-${Date.now()}`)}`,
    "--disable-http-cache",
    "--disk-cache-size=1",
    "--media-cache-size=1",
    "--disable-extensions",
    "--disable-background-networking",
    "--allow-insecure-localhost",
    "--window-size=1440,960",
    "--virtual-time-budget=12000",
    url,
  ];

  try {
    const dom = execFileSync(browser, ["--dump-dom", ...commonArgs], {
      encoding: "utf8",
      timeout: 45000,
      windowsHide: true,
    });
    const missing = required.filter((item) => !dom.includes(item));
    if (missing.length > 0) throw new Error(`Visual smoke missing text: ${missing.join(", ")}`);

    execFileSync(browser, [`--screenshot=${screenshotPath}`, ...commonArgs], {
      encoding: "utf8",
      timeout: 45000,
      windowsHide: true,
    });
    console.log(`Visual smoke passed: ${screenshotPath}`);
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
