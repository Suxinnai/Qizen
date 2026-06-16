import type { TeachingStyle } from "../storage";
import type { StudyPlanStep, StudyResourceLead } from "./types";

// 学习空间里与状态无关的纯函数：意图判定、计划/资源/笔记 Markdown 构造。
// 从 useStudySession 抽出，便于单测与复用，不持有任何组件状态。

export function inferLearningTopic(text: string) {
  return (
    text
      .replace(/^(我想|我要|帮我|请帮我|想要|计划|学习|学一下|学)\s*/g, "")
      .replace(/(怎么学|如何学|学习计划|计划|路线|资源|资料|一下|可以吗|吧|。|！|!|\?)$/g, "")
      .trim()
      .slice(0, 36) || "这个主题"
  );
}

export function isPlanConfirmation(text: string) {
  return /^(确认|可以|就这样|按这个|按计划|开始|开始学习|执行|确定|没问题)/.test(text.trim());
}

export function wantsResourceAgent(text: string) {
  return /(资料|资源|网站|课程|视频|论文|书|练习|题目|查找|搜索|网上|推荐)/.test(text);
}

export function buildPlanSteps(topic: string, style: TeachingStyle): StudyPlanStep[] {
  const methodStep =
    style === "logic"
      ? "先建立概念边界和推导链"
      : style === "steps"
      ? "拆成可检查的小步骤"
      : style === "story"
      ? "用场景和问题把概念串起来"
      : "先用类比建立直觉";

  return [
    { id: "plan-step-1", title: `${topic}：明确目标与已有基础`, minutes: 10 },
    { id: "plan-step-2", title: `${methodStep}`, minutes: 20 },
    { id: "plan-step-3", title: `阅读/观看 2-3 份高质量资料并做摘记`, minutes: 30 },
    { id: "plan-step-4", title: `完成一组针对 ${topic} 的练习题`, minutes: 25 },
    { id: "plan-step-5", title: `复述总结并标记路线进度`, minutes: 10 },
  ];
}

export function buildPlanMarkdown(topic: string, steps: StudyPlanStep[], style: TeachingStyle) {
  const styleText: Record<TeachingStyle, string> = {
    story: "故事化讲解",
    logic: "逻辑推导",
    analogy: "类比讲解",
    steps: "步骤拆解",
  };
  const totalMinutes = steps.reduce((sum, step) => sum + step.minutes, 0);
  return [
    `## ${topic} 学习计划`,
    `我先按「${styleText[style]}」来带你学，预计 ${totalMinutes} 分钟完成一轮闭环。`,
    "",
    "### 执行路线",
    ...steps.map((step, index) => `${index + 1}. ${step.title}（${step.minutes} 分钟）`),
    "",
    "> 如果这个节奏可以，点「确认计划」或直接回复“确认”，我会把它写入路线进度，并启动资源查找 Agent。",
  ].join("\n");
}

export function buildResourceMarkdown(topic: string, leads: StudyResourceLead[], errorSummary?: string) {
  const liveCount = leads.filter((lead) => lead.live).length;
  return [
    `## ${topic} 资源 Agent 已完成一轮查找`,
    liveCount > 0
      ? `我已完成在线检索，并找到 ${liveCount} 个可直接打开的结果；同时保留本地资料和搜索入口作为补充。`
      : "在线检索未拿到可直接引用的结果，我已降级为本地资料和可点击搜索入口，仍按学习阶段排好顺序。",
    errorSummary ? `> 检索说明：${errorSummary}` : "",
    "",
    "### 推荐顺序",
    ...leads.map((lead, index) => `${index + 1}. **${lead.title}** - ${lead.reason}`),
    "",
    "> 下一步我会从第一项开始引导你学。需要做题时，我会打开番茄钟并基于资料生成题目。",
  ].join("\n");
}

export function buildLearningStartMarkdown(topic: string) {
  return [
    `## 开始学习：${topic}`,
    "先做第一轮：用 10 分钟把目标、边界和已有基础说清楚。",
    "",
    "- 你可以直接回答：你现在对这个主题已经知道什么？",
    "- 如果不确定，我会用三个问题帮你定位基础。",
    "- 需要练习时点右侧“资料与依据”里的出题按钮，番茄钟会用来计时。",
  ].join("\n");
}

export function buildNoteBlock(title: string, content: string) {
  const compact = content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  return [`## ${title}`, "", "### AI 整理", ...compact.map((line) => `- ${line.replace(/^[-*\d.]+\s*/, "")}`)].join("\n");
}
