import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf } from "../components/icons/Leaf";
import {
  buildLearningProfile,
  completeOnboarding,
  modeLabel,
  type LearningScores,
} from "../lib/storage";

type OptionValue = keyof LearningScores;

interface Question {
  id: string;
  prompt: string;
  options: { label: string; value: OptionValue }[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "当你学习一个全新的概念时，你最自然会先怎么做？",
    options: [
      { label: "先看图示、结构图或示意图", value: "visual" },
      { label: "想听别人讲一遍，或者自己说一说", value: "auditory" },
      { label: "直接读定义、资料和笔记", value: "reading" },
      { label: "先做一题或试着操作一下", value: "kinesthetic" },
    ],
  },
  {
    id: "q2",
    prompt: "老师讲得太抽象时，什么最能帮你听懂？",
    options: [
      { label: "画图或举结构关系图", value: "visual" },
      { label: "换一种说法重新讲一遍", value: "auditory" },
      { label: "给我一份清晰的文字总结", value: "reading" },
      { label: "给一个具体例子让我上手", value: "kinesthetic" },
    ],
  },
  {
    id: "q3",
    prompt: "复习时你最常用的方法是？",
    options: [
      { label: "看思维导图或标记过的重点", value: "visual" },
      { label: "口头复述给自己听", value: "auditory" },
      { label: "重新读笔记、整理提纲", value: "reading" },
      { label: "多做题、多练习", value: "kinesthetic" },
    ],
  },
  {
    id: "q4",
    prompt: "遇到难题卡住时，你更希望 AI 怎么帮你？",
    options: [
      { label: "给我画清楚逻辑关系", value: "visual" },
      { label: "像聊天一样一步步带我想", value: "auditory" },
      { label: "列出定义、步骤和关键点", value: "reading" },
      { label: "直接让我先做一个简化版练习", value: "kinesthetic" },
    ],
  },
  {
    id: "q5",
    prompt: "你记住知识最牢的时刻通常来自？",
    options: [
      { label: "脑海里形成清晰画面时", value: "visual" },
      { label: "我把它讲明白的时候", value: "auditory" },
      { label: "我把它写下来整理清楚的时候", value: "reading" },
      { label: "我真正把它用出来的时候", value: "kinesthetic" },
    ],
  },
  {
    id: "q6",
    prompt: "做计划时你更偏好哪种呈现？",
    options: [
      { label: "时间轴、看板、图形化安排", value: "visual" },
      { label: "一句句讲清楚今天做什么", value: "auditory" },
      { label: "清楚的文字清单和提纲", value: "reading" },
      { label: "拆成一个个可执行的小动作", value: "kinesthetic" },
    ],
  },
  {
    id: "q7",
    prompt: "如果要准备考试，你最安心的方式是？",
    options: [
      { label: "把所有章节关系看明白", value: "visual" },
      { label: "边讲边回忆知识点", value: "auditory" },
      { label: "把所有重点重新整理成文档", value: "reading" },
      { label: "通过模拟题找状态", value: "kinesthetic" },
    ],
  },
  {
    id: "q8",
    prompt: "你最不容易坚持下去的学习方式是？（反向理解）",
    options: [
      { label: "只有纯文字，没有结构和重点", value: "visual" },
      { label: "没人解释，只能自己硬啃", value: "auditory" },
      { label: "没有资料、只有口头说法", value: "reading" },
      { label: "一直听讲但不能练习", value: "kinesthetic" },
    ],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"welcome" | number | "result">("welcome");
  const [answers, setAnswers] = useState<OptionValue[]>([]);

  const progress = typeof step === "number" ? ((step + 1) / QUESTIONS.length) * 100 : step === "result" ? 100 : 0;

  const profile = useMemo(() => {
    if (answers.length !== QUESTIONS.length) return null;
    return buildLearningProfile(answers);
  }, [answers]);

  function start() {
    setStep(0);
  }

  function answer(value: OptionValue) {
    if (typeof step !== "number") return;
    const next = [...answers];
    next[step] = value;
    setAnswers(next);
    if (step === QUESTIONS.length - 1) {
      setStep("result");
    } else {
      setStep(step + 1);
    }
  }

  function goBack() {
    if (step === "welcome") return;
    if (step === "result") {
      setStep(QUESTIONS.length - 1);
      return;
    }
    if (typeof step === "number" && step > 0) {
      setStep(step - 1);
    } else {
      setStep("welcome");
    }
  }

  function finish() {
    if (!profile) return;
    completeOnboarding(profile);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen bg-qz-bg dark:bg-qz-bg-dark text-qz-text dark:text-qz-text-dark flex items-center justify-center p-8 overflow-auto">
      <div className="w-full max-w-4xl rounded-[24px] bg-qz-card dark:bg-qz-card-dark shadow-qz-window border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="px-8 py-5 border-b border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/20 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Leaf size={28} stroke="#2D7A6B" />
              <div>
                <div className="font-serif text-[24px] text-qz-primary">栖知</div>
                <div className="text-[12px] text-qz-text-muted">识汝所学，方能远行</div>
              </div>
            </div>
            {step !== "welcome" && (
              <button
                type="button"
                onClick={goBack}
                className="px-3 py-1.5 rounded-md text-[12px] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
              >
                返回
              </button>
            )}
          </div>
          <div className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-qz-primary to-qz-light transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {step === "welcome" && (
          <div className="p-10 md:p-14 flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1">
              <h1 className="font-serif text-[42px] leading-tight text-qz-primary mb-4">先认识你，再教你。</h1>
              <p className="text-[15px] text-qz-text-muted leading-7 mb-8">
                栖知不会拿同一种方式对待所有人。先用 8 个小问题认识你的学习偏好，之后我会把讲解节奏、资源类型和学习计划，慢慢调到更适合你的样子。
              </p>
              <div className="grid grid-cols-2 gap-4 text-[13px] text-qz-text-muted mb-8">
                <div className="qz-card !p-4">视觉 / 听觉 / 阅读 / 动手 四维学习画像</div>
                <div className="qz-card !p-4">结果保存在本地，后续会根据学习行为微调</div>
              </div>
              <button
                type="button"
                onClick={start}
                className="px-5 py-3 rounded-md bg-qz-primary text-white text-[14px] hover:bg-qz-dark transition-colors"
              >
                开始测试
              </button>
            </div>
            <div className="relative w-[280px] h-[280px] shrink-0 flex items-center justify-center">
              <Leaf size={160} rotate={18} className="absolute opacity-20" stroke="#2D7A6B" />
              <Leaf size={120} rotate={-25} className="absolute left-10 top-6 opacity-15" stroke="#5BA593" />
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-qz-light/20 to-qz-primary/20 backdrop-blur-sm flex items-center justify-center font-serif text-[22px] text-qz-primary">
                8 题
              </div>
            </div>
          </div>
        )}

        {typeof step === "number" && (
          <div className="p-10 md:p-14">
            <div className="text-[12px] text-qz-text-muted mb-2">问题 {step + 1} / {QUESTIONS.length}</div>
            <h2 className="font-serif text-[34px] leading-snug text-qz-text-strong dark:text-qz-text-dark mb-8">
              {QUESTIONS[step].prompt}
            </h2>
            <div className="grid gap-4">
              {QUESTIONS[step].options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => answer(option.value)}
                  className="text-left qz-card hover:border-qz-primary/40 hover:bg-qz-primary/5"
                >
                  <div className="text-[14px] text-qz-text-strong dark:text-qz-text-dark">{option.label}</div>
                  <div className="text-[12px] text-qz-text-muted mt-1">偏向{modeLabel(option.value)}型学习策略</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && profile && (
          <div className="p-10 md:p-14">
            <div className="text-[12px] text-qz-text-muted mb-2">你的学习画像</div>
            <h2 className="font-serif text-[36px] text-qz-primary mb-6">{modeLabel(profile.dominantMode)}型 + {modeLabel(profile.secondaryMode)}型</h2>
            <div className="grid lg:grid-cols-[1.2fr,1fr] gap-8 items-start">
              <div className="qz-card">
                <div className="grid gap-4">
                  {Object.entries(profile.scores).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between text-[13px] mb-2">
                        <span>{modeLabel(key as keyof LearningScores)}</span>
                        <span className="text-qz-text-muted">{value} / 8</span>
                      </div>
                      <div className="h-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-qz-primary to-qz-light" style={{ width: `${(value / 8) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="qz-card">
                  <div className="font-serif text-[22px] text-qz-text-strong dark:text-qz-text-dark mb-2">灵对你的判断</div>
                  <p className="text-[14px] text-qz-text-muted leading-7">{profile.summary}</p>
                </div>
                <div className="qz-card">
                  <div className="font-serif text-[20px] text-qz-text-strong dark:text-qz-text-dark mb-3">推荐教学策略</div>
                  <ul className="space-y-2 text-[13px] text-qz-text-muted">
                    {profile.teachingStrategies.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button type="button" onClick={finish} className="px-5 py-3 rounded-md bg-qz-primary text-white text-[14px] hover:bg-qz-dark transition-colors">
                开始我的学习之旅
              </button>
              <button type="button" onClick={goBack} className="px-4 py-3 rounded-md border border-black/10 dark:border-white/10 text-[13px] hover:bg-black/5 dark:hover:bg-white/5">
                重看上一题
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
