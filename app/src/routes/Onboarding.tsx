import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf } from "../components/icons/Leaf";
import {
  buildLearningProfile,
  completeOnboarding,
  modeLabel,
  type LearningScores,
} from "../lib/storage";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Compass, 
  Eye, 
  Volume2, 
  BookOpen, 
  Activity,
  Award,
  ChevronRight
} from "lucide-react";
import clsx from "clsx";

type OptionValue = keyof LearningScores;

interface Question {
  id: string;
  category: string;
  prompt: string;
  options: { label: string; value: OptionValue; explanation: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    category: "新知接入 · Concept Acquisition",
    prompt: "当需要攻克一个完全陌生的专业领域概念时（如“多巴胺递质传导机制”），你最自然的切入点是？",
    options: [
      { label: "剖析系统全景图、突触架构示意图或递质流动的信息流向图", value: "visual", explanation: "偏好图形化映射与全局空间排布" },
      { label: "收听语音拆解、播客科普，或让 AI 用大白话逐步讲给我听", value: "auditory", explanation: "偏好语音节奏、韵律与对话沟通" },
      { label: "直接深度研读权威学术定义、系统文字笔记或精细的文本提纲", value: "reading", explanation: "偏好严谨书面语体系与文字阐释" },
      { label: "寻找一个在线交互式突触传导模拟器，调节递质浓度亲自做实验", value: "kinesthetic", explanation: "偏好参数交互、模拟沙箱与亲身实践" },
    ],
  },
  {
    id: "q2",
    category: "抽象破局 · Cognitive Breakthrough",
    prompt: "面对极其抽象、晦涩难懂的公式或算法（如“高维流形拓扑”），什么最能帮你拨云见日？",
    options: [
      { label: "观察三维动态渲染图像，或几何形变演化过程的动画演示", value: "visual", explanation: "偏好三维具象化与动态映射" },
      { label: "聆听 AI 用充满人情味的故事，将公式逻辑转化为生活中的比喻", value: "auditory", explanation: "偏好情境联想与叙事化解读" },
      { label: "拆解极其详尽的公式推导步骤，结合书面定义一行行对比研读", value: "reading", explanation: "偏好递进式逻辑与严密符号分析" },
      { label: "直接在代码沙箱中输入几组极限数值，测试输出波动并拟合曲线", value: "kinesthetic", explanation: "偏好数值试错、反馈迭代与实验验证" },
    ],
  },
  {
    id: "q3",
    category: "知识巩固 · Memory Consolidation",
    prompt: "在完成阶段性深度学习后，你最信任哪种自我知识内化与复习策略？",
    options: [
      { label: "亲手梳理并绘制一张节点纵横交错的超大尺寸思维导图/知识图谱", value: "visual", explanation: "偏好知识网络图谱化与拓扑重组" },
      { label: "闭上眼睛，假想面前有一位新手，口头复述并把这套知识解释一遍", value: "auditory", explanation: "偏好费曼学习法与听觉反馈强化" },
      { label: "系统整理出一份逻辑高度自洽的文字提纲，记录进精简卡片库", value: "reading", explanation: "偏好文档系统化沉淀与书面化再造" },
      { label: "不带任何参考资料，直接独立闭卷挑战 3 道高强度的实战模拟题", value: "kinesthetic", explanation: "偏好在题海演练与真题对抗中定位盲区" },
    ],
  },
  {
    id: "q4",
    category: "瓶颈求助 · Problem Solving",
    prompt: "编程或解题卡在死胡同（如代码报未知 Error），你最希望 AI 以何种形态提供破局线索？",
    options: [
      { label: "呈递一张清晰的程序执行调用栈图、内存指针图与数据流动架构图", value: "visual", explanation: "偏好图形化排查与空间拓扑定位" },
      { label: "像苏格拉底私人教练一样，通过一系列对话逐步循循善诱带我想透", value: "auditory", explanation: "偏好言语启发与渐进式对话纠偏" },
      { label: "直接向我呈现底层的运行原理细节、排查文档说明与正确修改大纲", value: "reading", explanation: "偏好原理解析与系统方案文档研读" },
      { label: "给出一个精简可运行的最小 Bug 复现沙箱，让我亲自修改并看报错变化", value: "kinesthetic", explanation: "偏好沙箱交互、动态反馈与动手纠错" },
    ],
  },
  {
    id: "q5",
    category: "记忆高光 · High-Retention Moments",
    prompt: "回顾以往，你发现自己脑海中保留最久、记忆最深的“知识高光时刻”往往发生在？",
    options: [
      { label: "闭上眼仍能清晰“看见”那一页核心图示的色彩分布或笔记排版布局", value: "visual", explanation: "偏好照相机式的空间图像存储" },
      { label: "某次激烈的学术研讨，或视频中主讲人脱口而出那句醍醐灌顶的比喻", value: "auditory", explanation: "偏好人声频率与对话高光记忆" },
      { label: "我自己在纸上或文档中整理出一条极其漂亮、排版严整的思维脉络时", value: "reading", explanation: "偏好文字梳理与文档再造时的成就感" },
      { label: "我自己亲手做砸了、踩坑踩到崩溃，最后终于一点点调通项目的时刻", value: "kinesthetic", explanation: "偏好肌肉记忆、踩坑反馈与攻关记忆" },
    ],
  },
  {
    id: "q6",
    category: "效率规划 · Planning & Execution",
    prompt: "开启一项大型长期学习计划时，你最喜欢以何种形态呈现每日任务？",
    options: [
      { label: "纵览甘特图、五彩斑斓的看板进度条，或节点清晰的双向链表路线图", value: "visual", explanation: "偏好视觉进度的直观冲击与空间感" },
      { label: "每天早晨自动收听一段 2 分钟的“今日学习要点与核心提示语音音频”", value: "auditory", explanation: "偏好语音晨报与伴随式听力摄入" },
      { label: "勾选逻辑井井有条、层级分明且配有详细文字注脚的待办清单", value: "reading", explanation: "偏好严谨的文字规整与文段勾选" },
      { label: "将任务切割为“每日番茄钟打卡”与“配套代码段/小练习实操任务”", value: "kinesthetic", explanation: "偏好短节奏反馈与动作指标配额" },
    ],
  },
  {
    id: "q7",
    category: "战前冲刺 · Exam Preparation",
    prompt: "在面临高压测试、考证或重大项目交付前的最后 24 小时，哪种备战方式能最快让你安心？",
    options: [
      { label: "全局快速扫视大章节的知识树形图，在大脑中模拟拼图归位", value: "visual", explanation: "偏好图像框架过电影般的快速浏览" },
      { label: "找一位学习伙伴相互提问考查，在快节奏的口头问答对线中碰撞盲区", value: "auditory", explanation: "偏好问答交锋与口头对练" },
      { label: "默读笔记、翻阅错题大纲，重点复习高亮标记的文献或概念注释", value: "reading", explanation: "偏好沉浸式文字默读与精简框架研习" },
      { label: "强力刷爆 2 套核心模拟卷或手写演练核心例程，用指尖肌肉寻找手感", value: "kinesthetic", explanation: "偏好高强度实弹演练与操作惯性" },
    ],
  },
  {
    id: "q8",
    category: "效率退潮 · Cognitive Fatigue",
    prompt: "在学习新概念时，你最容易在遇到哪种情况时产生严重的“大脑疲劳”与放弃念头？",
    options: [
      { label: "满屏全是密密麻麻的纯黑白字，没有任何加粗、色块高亮或结构图辅助", value: "visual", explanation: "极度抗拒排版杂乱、视觉死板的文字堆砌" },
      { label: "只能一个人干巴巴地啃冰冷书本，没有任何人声讲解或同伴研讨解说", value: "auditory", explanation: "极度抗拒零声音、零互动的死寂独学环境" },
      { label: "只有网课视频和口头宣讲，缺乏任何可以直接通读、标记和引用的书面讲义", value: "reading", explanation: "极度抗拒缺乏文本沉淀的快餐式口头讲解" },
      { label: "理论知识灌输了一大堆，却没有任何能让我實際上手操练、打字打卡的机会", value: "kinesthetic", explanation: "极度抗拒只有空谈、无法即刻动手转化的云端学习" },
    ],
  },
];

const MODE_THEMES: Record<OptionValue, {
  label: string;
  icon: typeof Eye;
  color: string;
  bgLight: string;
  bgDark: string;
  badgeLight: string;
  badgeDark: string;
  glow: string;
}> = {
  visual: {
    label: "视觉",
    icon: Eye,
    color: "#2D7A6B", // Emerald
    bgLight: "bg-emerald-50/50 border-emerald-100/50",
    bgDark: "dark:bg-emerald-950/20 dark:border-emerald-800/20",
    badgeLight: "bg-emerald-100 text-emerald-800",
    badgeDark: "dark:bg-emerald-500/20 dark:text-emerald-300",
    glow: "rgba(45, 122, 107, 0.15)",
  },
  auditory: {
    label: "听觉",
    icon: Volume2,
    color: "#8B5CF6", // Violet
    bgLight: "bg-violet-50/50 border-violet-100/50",
    bgDark: "dark:bg-violet-950/20 dark:border-violet-800/20",
    badgeLight: "bg-violet-100 text-violet-800",
    badgeDark: "dark:bg-violet-500/20 dark:text-violet-300",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  reading: {
    label: "阅读",
    icon: BookOpen,
    color: "#F59E0B", // Amber
    bgLight: "bg-amber-50/50 border-amber-100/50",
    bgDark: "dark:bg-amber-950/20 dark:border-amber-800/20",
    badgeLight: "bg-amber-100 text-amber-800",
    badgeDark: "dark:bg-amber-500/20 dark:text-amber-300",
    glow: "rgba(245, 158, 11, 0.15)",
  },
  kinesthetic: {
    label: "动手",
    icon: Activity,
    color: "#F43F5E", // Rose
    bgLight: "bg-rose-50/50 border-rose-100/50",
    bgDark: "dark:bg-rose-950/20 dark:border-rose-800/20",
    badgeLight: "bg-rose-100 text-rose-800",
    badgeDark: "dark:bg-rose-500/20 dark:text-rose-300",
    glow: "rgba(244, 63, 94, 0.15)",
  },
};

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
    <div className="h-screen w-screen bg-qz-bg dark:bg-[#1C1C1E] text-qz-text dark:text-qz-text-dark flex items-center justify-center p-4 md:p-6 overflow-hidden relative select-none">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#2D7A6B]/[0.03] dark:bg-[#2D7A6B]/[0.05] blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#8B5CF6]/[0.02] dark:bg-[#8B5CF6]/[0.04] blur-[120px] pointer-events-none z-0" />

      <div className="w-full max-w-4xl h-[85vh] max-h-[720px] min-h-[500px] rounded-[28px] bg-white dark:bg-qz-card-dark shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden z-10 flex flex-col relative backdrop-blur-3xl transition-all duration-300">
        
        {/* Onboarding Header */}
        <div className="px-6 md:px-10 py-5 border-b border-black/[0.03] dark:border-white/[0.04] bg-white/40 dark:bg-black/10 backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E2F1EC] dark:bg-[#2D7A6B]/20 flex items-center justify-center text-qz-primary dark:text-[#5BA593] shadow-sm">
                <Leaf size={20} />
              </div>
              <div>
                <div className="font-serif text-[22px] text-qz-primary font-bold tracking-tight">栖知 <span className="text-[11px] font-sans font-medium px-2 py-0.5 bg-qz-primary/10 rounded-full ml-1">VARK 2.0</span></div>
                <div className="text-[11.5px] text-qz-text-muted mt-0.5 font-medium font-sans">识汝所学，方能远行 · Cognitive Onboarding</div>
              </div>
            </div>
            {step !== "welcome" && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={goBack}
                className="px-3.5 py-1.5 rounded-xl border border-black/5 dark:border-white/8 bg-white dark:bg-zinc-800 text-[12px] font-bold text-qz-text hover:bg-black/[0.02] dark:hover:bg-white/[0.03] hover:text-qz-primary flex items-center gap-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.01)] cursor-pointer transition-all duration-200"
              >
                <ArrowLeft size={12} strokeWidth={2.5} />
                <span>返回</span>
              </motion.button>
            )}
          </div>
          
          {/* Pulsing Gradient Progress Bar */}
          {step !== "welcome" && (
            <div className="relative pt-1">
              <div className="flex items-center justify-between text-[11px] text-qz-text-muted font-bold font-mono tracking-wider mb-1.5 select-none">
                <span>{step === "result" ? "COMPLETED" : `EVALUATING`}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-qz-primary via-[#5BA593] to-[#8B5CF6] rounded-full shadow-[0_0_8px_rgba(45,122,107,0.3)]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Carousel Content Area */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* Welcome Screen */}
            {step === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="p-6 md:p-10 lg:p-12 flex-1 flex flex-col overflow-y-auto scrollbar-thin"
              >
                <div className="my-auto w-full flex flex-col md:flex-row gap-8 lg:gap-12 items-center justify-center shrink-0">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-qz-primary/10 text-qz-primary text-[11px] font-extrabold tracking-wider uppercase mb-5 select-none">
                      <Compass size={11} />
                      <span>认知偏好引擎</span>
                    </div>
                    <h1 className="font-serif text-[38px] md:text-[44px] leading-tight text-qz-text-strong dark:text-qz-text-dark font-bold tracking-tight mb-5">
                      先认识你，<br /><span className="text-qz-primary bg-gradient-to-r from-qz-primary to-qz-light bg-clip-text text-transparent">再教你。</span>
                    </h1>
                    <p className="text-[14.5px] text-qz-text-muted leading-7 mb-8 font-sans">
                      栖知不会拿同一套死板的模式对待所有人。先用 8 个源自 VARK 认知行为学的小问题认识您的学习偏好，我会帮您把讲解节奏、图谱比重、摘要形态和练习配额，慢慢调节至最符合您天性的样子。
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-[12.5px] text-qz-text-strong dark:text-qz-text-dark font-semibold mb-8 select-none">
                      <div className="qz-card !p-4 border border-black/5 bg-black/[0.01] dark:bg-white/[0.01] hover:shadow-sm hover:border-[#2D7A6B]/20 transition-all duration-300">
                        🎨 视觉/听觉/阅读/动手 四维剖析
                      </div>
                      <div className="qz-card !p-4 border border-black/5 bg-black/[0.01] dark:bg-white/[0.01] hover:shadow-sm hover:border-[#2D7A6B]/20 transition-all duration-300">
                        💾 结果本地加密保存，依后续行为微调
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.025, y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      type="button"
                      onClick={start}
                      className="px-6 py-3.5 rounded-2xl bg-qz-primary text-white text-[14px] font-bold hover:bg-[#205a4e] cursor-pointer shadow-[0_4px_16px_rgba(45,122,107,0.22)] transition-all duration-300 flex items-center gap-1.5"
                    >
                      <span>开启认知基因测试</span>
                      <Compass size={13.5} />
                    </motion.button>
                  </div>
                  
                  {/* Visual Decorative leaf background */}
                  <div className="relative w-[280px] h-[280px] shrink-0 flex items-center justify-center select-none hidden md:flex">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-qz-light/5 to-qz-primary/[0.03] blur-3xl animate-pulse" />
                    <Leaf size={170} rotate={18} className="absolute opacity-15 dark:opacity-10" stroke="#2D7A6B" />
                    <Leaf size={120} rotate={-25} className="absolute left-10 top-6 opacity-10 dark:opacity-8" stroke="#5BA593" />
                    <div className="w-36 h-36 rounded-full border border-qz-primary/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md flex flex-col items-center justify-center font-serif shadow-[0_8px_32px_rgba(0,0,0,0.02)]">
                      <span className="text-[28px] font-bold text-qz-primary tracking-tight font-serif">8</span>
                      <span className="text-[11px] text-qz-text-muted font-bold font-sans tracking-widest uppercase mt-0.5">Questions</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Questions Screen */}
            {typeof step === "number" && (
              <motion.div
                key={`q-${step}`}
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -25 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-6 md:p-10 lg:p-12 w-full flex-1 flex flex-col overflow-y-auto scrollbar-thin"
              >
                <div className="my-auto w-full flex flex-col shrink-0">
                  <div className="flex items-center justify-between mb-5 select-none">
                    <div className="px-3 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-[11px] font-bold text-qz-text-muted font-sans tracking-wide">
                      {QUESTIONS[step].category}
                    </div>
                    <div className="text-[12.5px] font-bold font-mono text-qz-primary tracking-widest">
                      {(step + 1).toString().padStart(2, "0")} / {QUESTIONS.length.toString().padStart(2, "0")}
                    </div>
                  </div>
                  
                  <h2 className="font-serif text-[26px] md:text-[30px] leading-snug text-qz-text-strong dark:text-qz-text-dark font-bold tracking-tight mb-8">
                    {QUESTIONS[step].prompt}
                  </h2>
                  
                  <div className="grid gap-4">
                    {QUESTIONS[step].options.map((option, idx) => {
                      const letter = ["A", "B", "C", "D"][idx];
                      return (
                        <motion.button
                          key={idx}
                          whileHover={{ 
                            scale: 1.012,
                            borderColor: "rgba(45, 122, 107, 0.25)",
                            backgroundColor: "rgba(45, 122, 107, 0.015)",
                            boxShadow: "0 4px 16px rgba(45, 122, 107, 0.04)"
                          }}
                          whileTap={{ scale: 0.995 }}
                          type="button"
                          onClick={() => answer(option.value)}
                          className="text-left p-5 rounded-[20px] border border-black/[0.05] dark:border-white/[0.08] bg-white dark:bg-white/[0.01] transition-all duration-300 cursor-pointer shadow-sm relative group flex items-center gap-4"
                        >
                          {/* Elegant Circular Letter Badge */}
                          <div className="w-9 h-9 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-qz-text-muted group-hover:border-qz-primary/30 group-hover:bg-[#E2F1EC] group-hover:text-qz-primary dark:group-hover:bg-[#2D7A6B]/20 dark:group-hover:text-[#5BA593] flex items-center justify-center shrink-0 text-[13px] font-bold font-sans transition-all duration-300">
                            {letter}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-[14.5px] font-semibold text-qz-text-strong dark:text-qz-text-dark leading-snug group-hover:text-qz-primary dark:group-hover:text-white transition-colors duration-200">
                              {option.label}
                            </div>
                            <div className="text-[11.5px] text-qz-text-muted mt-1 font-medium font-sans">
                              {option.explanation}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Results Screen */}
            {step === "result" && profile && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="p-6 md:p-10 overflow-y-auto flex-1 scrollbar-thin"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F1EC] dark:bg-[#2D7A6B]/20 text-qz-primary dark:text-[#5BA593] text-[11px] font-extrabold tracking-wider uppercase mb-5 select-none">
                  <Award size={12} strokeWidth={2.4} />
                  <span>评测诊断完成</span>
                </div>
                
                {/* Title Highlight Card */}
                <div className="p-6 rounded-[22px] border border-[#B5DCD3] dark:border-[#2D7A6B]/30 bg-[#E2F1EC]/20 dark:bg-[#2D7A6B]/5 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 select-none">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-bold text-qz-primary tracking-wider uppercase mb-1">主导/辅助复合学习画像</div>
                    <h2 className="font-serif text-[32px] md:text-[35px] text-[#1A5C4A] dark:text-[#5BA593] font-bold tracking-tight">
                      {modeLabel(profile.dominantMode)}型 <span className="font-sans text-[20px] font-medium text-qz-text-muted align-middle mx-1.5">+</span> {modeLabel(profile.secondaryMode)}型
                    </h2>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-2xl px-5 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                    <Leaf size={16} className="text-qz-primary shrink-0 animate-pulse" />
                    <span className="text-[13px] font-bold text-qz-text-strong dark:text-qz-text-dark font-serif">栖知高度契合</span>
                  </div>
                </div>

                {/* VARK Circular Progress Dashboard */}
                <div className="mb-8">
                  <div className="text-[12.5px] text-qz-text-strong dark:text-qz-text-dark mb-4 font-bold font-sans tracking-wide">四维得分雷达分布 · VARK Dimension scores</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(profile.scores).map(([key, value]) => {
                      const optKey = key as OptionValue;
                      const theme = MODE_THEMES[optKey];
                      const Icon = theme.icon;
                      // Circle animation formulas
                      const radius = 22;
                      const strokeWidth = 4.5;
                      const circumference = 2 * Math.PI * radius; // 138.2
                      const offset = circumference * (1 - value / QUESTIONS.length);

                      return (
                        <div 
                          key={key} 
                          className={clsx(
                            "p-5 rounded-[22px] border shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-md",
                            theme.bgLight,
                            theme.bgDark
                          )}
                        >
                          <div className="min-w-0 flex-1 flex flex-col gap-2">
                            <div className="flex items-center gap-2 select-none flex-wrap">
                              <span className="font-serif text-[17px] font-bold text-qz-text-strong dark:text-qz-text-dark whitespace-nowrap">
                                {theme.label}维度
                              </span>
                              {profile.dominantMode === optKey && (
                                <span className="text-[10px] font-bold bg-[#1A5C4A] text-white rounded-[6px] px-2 py-0.5 whitespace-nowrap shadow-sm font-sans">主导</span>
                              )}
                              {profile.secondaryMode === optKey && (
                                <span className="text-[10px] font-bold bg-[#8B5CF6] text-white rounded-[6px] px-2 py-0.5 whitespace-nowrap shadow-sm font-sans">辅助</span>
                              )}
                            </div>
                            <div className="font-serif text-[22px] font-bold text-qz-primary dark:text-[#5BA593]">{value} <span className="text-[12px] text-qz-text-muted font-sans font-medium">/ {QUESTIONS.length} 题</span></div>
                          </div>
                          
                          {/* Radial Progress Ring SVG */}
                          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center select-none">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle 
                                cx="28" cy="28" r={radius} 
                                fill="none" stroke="rgba(0,0,0,0.04)" 
                                strokeWidth={strokeWidth} 
                              />
                              <motion.circle 
                                cx="28" cy="28" r={radius} 
                                fill="none" 
                                stroke={theme.color} 
                                strokeWidth={strokeWidth} 
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: offset }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div 
                              className="absolute w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                              style={{
                                color: theme.color,
                                backgroundColor: theme.color + "12"
                              }}
                            >
                              <Icon size={13} strokeWidth={2.5} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Advice & Strategies */}
                <div className="grid md:grid-cols-[1fr,1.1fr] gap-6">
                  <div className="p-6 rounded-[22px] border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.005] dark:bg-white/[0.005] shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-3.5 text-qz-primary dark:text-[#5BA593] select-none">
                      <Compass size={16} className="animate-pulse" />
                      <h3 className="font-serif text-[19px] font-bold">灵之眼 · 认知画像诊断</h3>
                    </div>
                    <p className="text-[13.5px] text-qz-text leading-7 font-sans flex-1">
                      {profile.summary}
                    </p>
                  </div>
                  
                  <div className="p-6 rounded-[22px] border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.005] dark:bg-white/[0.005] shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-qz-primary dark:text-[#5BA593] select-none">
                      <Compass size={16} />
                      <h3 className="font-serif text-[19px] font-bold">为您定制的学习策略</h3>
                    </div>
                    <ul className="space-y-3 flex-1 flex flex-col justify-center">
                      {profile.teachingStrategies.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 py-0.5">
                          <CheckCircle2 size={15} strokeWidth={2.5} className="text-qz-primary dark:text-[#5BA593] shrink-0 mt-0.5 opacity-90" />
                          <span className="text-[13px] text-qz-text font-medium leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Onboarding Complete Action Button */}
                <div className="mt-9 flex items-center gap-3 select-none">
                  <motion.button 
                    whileHover={{ scale: 1.025, y: -0.5 }}
                    whileTap={{ scale: 0.985 }}
                    type="button" 
                    onClick={finish} 
                    className="px-6 py-3.5 rounded-2xl bg-qz-primary text-white text-[14px] font-bold hover:bg-[#205a4e] cursor-pointer shadow-[0_4px_16px_rgba(45,122,107,0.22)] transition-all duration-300 flex items-center gap-1.5"
                  >
                    <span>开启我的栖知之旅</span>
                    <ChevronRight size={14} strokeWidth={2.6} className="animate-bounce-horizontal" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button" 
                    onClick={goBack} 
                    className="px-4 py-3.5 rounded-2xl border border-black/10 dark:border-white/10 text-[13px] font-bold text-qz-text hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200"
                  >
                    重新检查上一题
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
