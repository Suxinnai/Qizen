import { useState } from "react";
import {
  appendStudySessionEvent,
  updatePracticeSetStatus,
  type AppData,
} from "../lib/storage";
import {
  createPracticeSetFromRagResult,
  type LibraryRagResult,
  type RagPracticeSet,
} from "../lib/rag";
import { inferLearnerLevel } from "../lib/study/adaptive";
import { collectHitResourceTitles } from "../lib/study/rag-policy";
import {
  gradePracticeAnswers,
  type PracticeGradeResult,
} from "../lib/llm";
import { resolveLlmProviderConfig } from "../lib/secretStore";
import type { ChatMessage } from "../lib/study/types";

export function useStudyPractice(input: {
  data: AppData;
  latestRag: LibraryRagResult | null;
  selectedResourceId?: string;
  selectedNodeId?: string;
  taskId?: string;
  lastMessage?: ChatMessage;
  onDataChange: (data: AppData) => void;
  onInteractionRecorded: () => void;
  onOpenResourcePanel: () => void;
  onStartPomodoro: () => void;
}) {
  const {
    data,
    latestRag,
    selectedResourceId,
    selectedNodeId,
    taskId,
    lastMessage,
    onDataChange,
    onInteractionRecorded,
    onOpenResourcePanel,
    onStartPomodoro,
  } = input;

  const [practiceSet, setPracticeSet] = useState<RagPracticeSet | null>(null);
  const [practiceHint, setPracticeHint] = useState("");
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [practiceResults, setPracticeResults] = useState<Record<string, PracticeGradeResult> | null>(null);
  const [isGradingPractice, setIsGradingPractice] = useState(false);
  const [practiceGraded, setPracticeGraded] = useState(false);
  const [practiceSelfAssess, setPracticeSelfAssess] = useState(false);

  function clearCurrentPractice() {
    setPracticeSet(null);
    setPracticeHint("");
  }

  function resetPracticeState() {
    setPracticeSet(null);
    setPracticeHint("");
    setPracticeAnswers({});
    setPracticeResults(null);
    setIsGradingPractice(false);
    setPracticeGraded(false);
    setPracticeSelfAssess(false);
  }

  function generatePracticeFromLatestRag() {
    if (!latestRag || latestRag.results.length === 0) {
      setPracticeSet(null);
      setPracticeHint("请先提一个问题，或先选择资料，让系统先完成一次命中检索。");
      onOpenResourcePanel();
      return;
    }

    const learnerLevel = inferLearnerLevel(data.studyRecord.events);
    const nextPracticeSet = createPracticeSetFromRagResult(latestRag, learnerLevel.difficulty);
    if (!nextPracticeSet) {
      setPracticeHint("当前命中资料还不足以生成质量稳定的题目，请换一个更具体的问题再试。");
      return;
    }

    appendStudySessionEvent({
      id: `study-event-${Date.now()}`,
      type: "practice-generated",
      recordedAt: new Date().toISOString(),
      question: latestRag.query,
      resourceId: selectedResourceId ?? latestRag.results[0]?.resource.id ?? null,
      nodeId: selectedNodeId ?? null,
      taskId: taskId ?? null,
      hitResourceTitles: collectHitResourceTitles(latestRag),
      generatedPractice: true,
      llm: {
        usedRealModel: !(lastMessage?.usedFallback ?? true),
        providerLabel: lastMessage?.providerLabel ?? "本地回答",
        usedFallback: lastMessage?.usedFallback ?? true,
      },
    });
    onInteractionRecorded();
    setPracticeSet(nextPracticeSet);
    setPracticeAnswers({});
    setPracticeResults(null);
    setPracticeGraded(false);
    setPracticeSelfAssess(false);
    setPracticeHint(
      `已按「${learnerLevel.difficulty}」难度生成 ${nextPracticeSet.questions.length} 道题（${learnerLevel.reason}）作答后点「提交批改」。`
    );
    onStartPomodoro();
    onOpenResourcePanel();
  }

  function setPracticeAnswer(id: string, value: string) {
    setPracticeAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function setPracticeSelfVerdict(id: string, verdict: PracticeGradeResult["verdict"]) {
    setPracticeResults((prev) => ({
      ...(prev ?? {}),
      [id]: { verdict, comment: "自评" },
    }));
  }

  function finalizePracticeGrading(
    set: RagPracticeSet,
    resultsMap: Record<string, PracticeGradeResult>,
    llm: { usedRealModel: boolean; providerLabel: string; usedFallback: boolean }
  ) {
    const weight: Record<PracticeGradeResult["verdict"], number> = {
      对: 1,
      部分: 0.5,
      错: 0,
    };
    const score = set.questions.reduce(
      (sum, question) =>
        sum + (resultsMap[question.id] ? weight[resultsMap[question.id].verdict] : 0),
      0
    );
    const weakPrompts = set.questions
      .filter(
        (question) =>
          resultsMap[question.id] && resultsMap[question.id].verdict !== "对"
      )
      .map((question) => question.prompt);

    setPracticeResults(resultsMap);
    setPracticeGraded(true);
    setPracticeSelfAssess(false);

    const persisted = data.practiceSets.find(
      (item) => item.title === set.title || item.title.includes(set.primaryTitle)
    );
    if (persisted) onDataChange(updatePracticeSetStatus(persisted.id, "completed"));

    appendStudySessionEvent({
      id: `study-event-${Date.now()}`,
      type: "practice-completed",
      recordedAt: new Date().toISOString(),
      question: latestRag?.query ?? set.primaryTitle,
      resourceId: selectedResourceId ?? latestRag?.results[0]?.resource.id ?? null,
      nodeId: selectedNodeId ?? null,
      taskId: taskId ?? null,
      hitResourceTitles: latestRag ? collectHitResourceTitles(latestRag) : set.basedOnTitles,
      generatedPractice: false,
      practiceScore: Math.round(score * 10) / 10,
      practiceQuestionCount: set.questions.length,
      weakQuestionPrompts: weakPrompts,
      llm,
    });
    onInteractionRecorded();

    const scoreText = Number.isInteger(score) ? `${score}` : score.toFixed(1);
    setPracticeHint(
      `已记录批改结果：得分 ${scoreText} / ${set.questions.length}。${
        weakPrompts.length
          ? `有 ${weakPrompts.length} 题需巩固，已计入常错点。`
          : "全部正确，很棒！"
      }`
    );
  }

  async function gradePracticeSet() {
    if (!practiceSet || isGradingPractice || practiceGraded) return;
    const set = practiceSet;
    const providerConfig = await resolveLlmProviderConfig(data.settings.llm);
    const hasModel =
      providerConfig.provider !== "none" &&
      Boolean(providerConfig.apiKey) &&
      Boolean(providerConfig.model);

    if (!hasModel) {
      if (!practiceSelfAssess) {
        setPracticeSelfAssess(true);
        setPracticeHint("未配置模型，无法自动批改。请逐题自评后再点「记录自评结果」。");
        return;
      }
      finalizePracticeGrading(set, practiceResults ?? {}, {
        usedRealModel: false,
        providerLabel: "本地自评",
        usedFallback: true,
      });
      return;
    }

    setIsGradingPractice(true);
    const items = set.questions.map((question) => ({
      prompt: question.prompt,
      type: question.type,
      answerHint: question.answerHint,
      evidenceSnippet: question.evidence?.sourceSnippet,
      evidenceHighlights: question.evidence?.sourceHighlights,
      userAnswer: practiceAnswers[question.id] ?? "",
    }));
    const grade = await gradePracticeAnswers({ items, providerConfig });
    setIsGradingPractice(false);

    if (grade.usedFallback || grade.results.length !== set.questions.length) {
      setPracticeSelfAssess(true);
      setPracticeHint(
        `自动批改不可用（${grade.errorSummary ?? "结果异常"}），请逐题自评后记录结果。`
      );
      return;
    }

    const resultsMap: Record<string, PracticeGradeResult> = {};
    set.questions.forEach((question, index) => {
      resultsMap[question.id] = grade.results[index];
    });
    finalizePracticeGrading(set, resultsMap, {
      usedRealModel: true,
      providerLabel: grade.providerLabel,
      usedFallback: false,
    });
  }

  return {
    practiceSet,
    practiceHint,
    practiceAnswers,
    practiceResults,
    isGradingPractice,
    practiceGraded,
    practiceSelfAssess,
    clearCurrentPractice,
    resetPracticeState,
    generatePracticeFromLatestRag,
    setPracticeAnswer,
    gradePracticeSet,
    setPracticeSelfVerdict,
  };
}
