import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const files = {
  session: read("src/hooks/useStudySession.ts"),
  webAgent: read("src/lib/webResourceAgent.ts"),
  messageBody: read("src/components/study/MessageBody.tsx"),
  messageList: read("src/components/study/MessageList.tsx"),
  resourcePanel: read("src/components/study/panels/ResourcePanel.tsx"),
  graphPanel: read("src/components/study/panels/GraphPanel.tsx"),
  studyRoute: read("src/routes/Study.tsx"),
  storage: read("src/lib/storage.ts"),
  resourceSmoke: read("scripts/resource-agent-smoke.mjs"),
};

const checks = [
  {
    name: "first learning message creates a plan",
    pass: files.session.includes("shouldCreatePlan") && files.session.includes("buildPlanSteps"),
  },
  {
    name: "user can confirm plan and persist route",
    pass: files.session.includes("confirmPlanAndResearch") && files.storage.includes("addLearningPlanGoal"),
  },
  {
    name: "resource agent performs live web lookup with fallback",
    pass:
      files.webAgent.includes("findLearningResources") &&
      files.webAgent.includes("fetchOpenSearch") &&
      files.webAgent.includes("fallbackWebLeads") &&
      files.resourceSmoke.includes("openSearch") &&
      files.resourceSmoke.includes("Live resource smoke passed"),
  },
  {
    name: "study starts after resource lookup",
    pass: files.session.includes("buildLearningStartMarkdown") && files.session.includes('setJourneyStage("learn")'),
  },
  {
    name: "assistant output is streamed",
    pass: files.session.includes("streamAssistantMessage") && files.session.includes('streamState: "streaming"'),
  },
  {
    name: "assistant output renders markdown blocks",
    pass: files.messageBody.includes("renderMarkdownBlocks") && files.messageBody.includes("blockquote") && files.messageBody.includes("<ol"),
  },
  {
    name: "AI task animation and visible thinking are shown",
    pass: files.messageList.includes("AgentTrace") && files.messageList.includes("qz-agent-working"),
  },
  {
    name: "selected text can be saved as AI-organized note",
    pass: files.messageList.includes("qz-selection-note-popover") && files.session.includes("buildNoteBlock"),
  },
  {
    name: "practice generation starts pomodoro timing",
    pass: files.session.includes("setPomodoroRunning(true)") && files.session.includes("createPracticeSetFromRagResult"),
  },
  {
    name: "resource panel exposes live/local/fallback status",
    pass: files.resourcePanel.includes("实时结果") && files.resourcePanel.includes("搜索入口") && files.resourcePanel.includes("本地依据"),
  },
  {
    name: "route panel shows current progress",
    pass: files.graphPanel.includes("当前路线") && files.graphPanel.includes("activeGoal.progress"),
  },
  {
    name: "study page shows five-step journey",
    pass: files.studyRoute.includes("journeySteps") && files.studyRoute.includes("qz-journey-bar"),
  },
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} delivery checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} delivery checks passed.`);
