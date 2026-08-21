# 栖知 Qizen

> 栖息于知识之中 —— 围绕个人资料、目标、知识图谱、笔记与学习记录构建的本地优先 AI 私人学习工作台。

## 项目定位

Qizen 不是题库、网课聚合器，也不是给聊天模型简单套一层学习 UI。

当前产品目标是：**把用户自己的资料、学习目标、知识图谱、历史学习记录和真实大模型能力串成一个可长期积累的个人学习闭环。**

主产品形态为 Windows / 桌面优先的 Electron 应用。

核心技术栈：

- Electron
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React

当前阶段：**可运行 MVP → 产品化稳定阶段**。

> 本 README 以 2026-08-21 当前 `master` 源码为准。历史 PRD、roadmap、prototype 与源码冲突时，以当前源码为准。

---

## 当前真实能力

### 核心学习闭环

```text
明确学习内容
→ 讨论学习方式
→ 生成并确认学习计划
→ 在线资源发现 + 本地资料融合
→ RAG 检索本地依据
→ 真实 LLM / 本地 fallback
→ 最近 N 轮会话上下文
→ SSE 流式回答
→ 基于命中资料生成练习
→ 用户作答
→ LLM 批改 / 无模型自评
→ 写入学习事件与薄弱点
→ Learner Memory / Profile / Reports 反馈
```

### 功能状态

| 模块 | 状态 | 当前真实实现 |
| --- | --- | --- |
| Electron 桌面壳 | ✅ | 无边框窗口、窗口控制、外链拦截、Electron smoke |
| Onboarding | ✅ | VARK 风格学习偏好评测、四维预览、本地画像保存 |
| Dashboard | ✅ | 今日提问、练习、学习分钟、目标任务、30 天节奏 |
| Goals | ✅ 基础可用 | goal → milestone → task，可从任务进入 Study |
| Library | ✅ 核心可用 | PDF / DOCX / Markdown / TXT 解析；图片可收纳但不做 OCR 深解析 |
| Library 摘要/重点 | ✅ 规则型 | 当前主要由本地文本规则提取，不是 LLM 摘要 |
| Knowledge Graph | ✅ 核心可用 | 启发式节点/边、缩放拖拽、节点详情、Study 入口 |
| Notes | ✅ | Markdown 编辑/预览，支持标题、列表、引用、代码、粗体/斜体 |
| Study 会话 | ✅ 核心可用 | 新建/切换/持久化、上下文进入、流式回答、RAG、工具面板 |
| 多轮上下文 | ✅ 主对话 | `contextWindowRounds` 控制最近 N 个用户轮次；12,000 字符总预算；长消息压缩 |
| 本地 RAG | ✅ | 关键词 + CJK 2–4gram + IDF + resource/node boost；不是向量检索 |
| LLM | ✅ | OpenAI-compatible + Anthropic；SSE 流式输出、连接测试 |
| Resource Agent | ✅ MVP | Wikipedia / 中文 Wikipedia / Wikibooks / DuckDuckGo；失败降级搜索入口 |
| Resource 搜索缓存 | ✅ | `searchCacheHours` 控制成功在线结果缓存，本地 Library lead 每次实时融合 |
| Learning Agent | ✅ MVP | 固定三步“讲解 → 检查理解 → 小结下一步”，不是通用工具 Agent |
| Adaptive Practice | ✅ | 根据历史事件推断基础 / 进阶 / 综合难度 |
| Practice Grading | ✅ | 有模型时 LLM 批改；无模型时自评；记录分数与薄弱题 |
| Learner Memory | ✅ MVP | 连续学习、真实常错点、重复巩固点、模型使用、主要 Provider |
| Reports | ✅ | 图表与时间线；练习完成统计已去重并兼容旧数据，完成率限制 0–100% |
| Profile | ✅ | 昵称、VARK 雷达图、学习记忆、统计、最近活动、重新评测 |
| Settings | ✅ 基础可用 | 模型、自动行为、RAG、缓存、上下文、数据等配置；部分字段仍未消费 |
| API Key 存储 | ✅ Electron | Electron `safeStorage`；旧明文 secret 自动迁移；无系统加密能力时诚实 fallback |
| GitHub Actions CI | ✅ | Windows 自动执行 contract + unit tests + TypeScript + Vite build + Electron smoke |
| 行为单元测试 | ✅ 基线 | Node 22 `node:test`，当前 3 套 Study 测试共 28 个 test case |
| 数据导出 | ✅ | 导出主 AppData JSON |
| 账号体系 / 云同步 | ❌ | 当前是本地单用户产品 |
| 系统通知 / 成就 | ❌ | 暂无真正通知调度、成就引擎 |
| 安装包 / 自动更新 | ❌ | 尚无 installer、签名、updater、Release 发布链 |

---

## Study 当前架构

`Study.tsx` 主要承担 UI 编排，核心状态已经按职责拆分。

```text
app/src/routes/Study.tsx
└─ app/src/hooks/useStudySession.ts              # 学习流程总编排
   ├─ useStudyPomodoro.ts                        # 番茄钟状态 / timer
   ├─ useStudyConversationPersistence.ts         # 会话 snapshot / hydration / persistence
   └─ useStudyPractice.ts                        # 出题 / 作答 / 批改 / weak points

app/src/lib/study/
├─ conversation-context.ts                       # 最近 N 轮历史 / 字符预算 / 模型 query 拼接
├─ intent.ts
├─ rag-policy.ts
├─ reply-policy.ts
├─ session-policy.ts
├─ message-builders.ts
├─ adaptive.ts
├─ memory.ts
└─ study-helpers.ts
```

### `useStudySession.ts` 目前仍负责

- 当前 Study 上下文与目标选择
- 输入与消息流
- RAG 调用和证据状态
- OpenAI / Anthropic 实时流式生成
- 多轮历史接线
- 本地 fallback
- AI 会话标题
- 学习计划确认
- Resource Agent
- 三步 Learning Agent
- Notes 写入
- 学习进度写回
- Panel 自动打开编排

已经从主 Hook 抽离：

- ✅ Pomodoro 生命周期
- ✅ 会话 persistence / hydration
- ✅ Practice 生命周期与 grading

当前不继续为了 Hook 数量机械拆分；下一步优先增强测试和数据层。

---

## 多轮上下文

核心文件：

```text
app/src/lib/study/conversation-context.ts
app/src/hooks/useStudySession.ts
```

`contextWindowRounds` 已真实接入 Study 主对话模型请求。

当前语义：

- 1 轮 = 1 条 user 消息开始，到下一条 user 消息前的所有 assistant 消息。
- Settings 当前允许 6–20 轮，默认 10。
- 总历史字符预算：12,000。
- 单条历史消息超过约 3,000 字符时保留头部 + 尾部。
- 预算从最新消息向旧消息裁剪，不保留孤立的 assistant 历史。
- 历史和“当前问题”在模型 query 中明确分区。

边界：

- **RAG 检索仍只使用当前原始问题。**
- **学习事件 / Reports / Memory 仍记录当前原始问题。**
- **本地 fallback 仍基于当前原始问题。**
- Learning Agent 内部三步仍是任务型独立 prompt，不继承普通聊天历史。
- 当前实现是把历史块注入现有 model user prompt，而不是重写 Provider 为原生多条 message 数组。

这个设计优先保证现有 OpenAI-compatible / Anthropic 流式链路稳定；未来若要进一步优化 token 管理，可再升级为 provider-native message history。

---

## RAG 当前边界

核心文件：

```text
app/src/lib/rag.ts
app/src/lib/study/rag-policy.ts
```

当前检索使用：

- 文本 normalize
- ASCII token
- 中文 2–4 字 n-gram
- 小规模 IDF
- 通用学习意图词扩展
- 从用户资料派生词组
- 当前 resource boost
- 当前 graph node boost
- 标题 / 摘要 / highlights / preview / 正文分字段加权

证据展示还有独立强命中门槛：

- top result：score ≥ 10
- 后续 result：score ≥ 12
- `rag.sufficient === false` 时不展示证据

这些边界已有 `node:test` 行为测试。

它仍然不是 embedding / vector database。

---

## Resource Agent 当前边界

核心文件：

```text
app/src/lib/webResourceAgent.ts
```

当前并行尝试：

- 中文 Wikipedia OpenSearch
- Wikipedia OpenSearch
- Wikibooks OpenSearch
- DuckDuckGo Instant Answer

成功在线结果根据 `searchCacheHours` 缓存；缓存只保存在线 lead，本地 Library 标题仍在每次调用时重新融合。

当前**不会**：

- 自动抓取任意网页全文
- 自动拉取 Bilibili / YouTube 课程目录
- 自动把网页正文写入 Library
- 浏览器自动化工具调用

因此当前更准确的定位是“资源发现 Agent”，不是“网页研究 Agent”。

---

## Practice 与 Learner Memory

```text
RAG 命中
→ inferLearnerLevel()
→ 生成基础 / 进阶 / 综合练习
→ 用户作答
→ LLM 批改 / 自评
→ practice-completed event
→ practiceScore / weakQuestionPrompts
→ deriveLearnerMemory()
→ Profile / Reports
```

Learner Memory 当前从既有事件派生：

- current / longest streak
- active days
- graded weak prompts（真实常错点）
- 重复命中的资料 / topic（巩固点）
- real model ratio
- preferred provider

当前自适应仍是规则型 MVP，不是 IRT / BKT / 知识追踪模型。

---

## 数据与持久化

### 主 AppData

当前仍使用浏览器 `localStorage`：

```text
qizen:mvp:v2
```

主要包含：

- appState
- learningProfile
- settings
- goals
- libraryItems
- practiceSets
- notes
- knowledgeGraph
- studyStats
- studyRecord

### Study 会话

独立存储：

```text
qizen:study:conversations:v1
```

已经有 schema migration、持久化文本清洗、active conversation 恢复，但底层仍是 localStorage。

### API Key

Electron 环境下通过主进程 secret IPC 写入：

```text
Electron userData/secrets/<key>.secret
```

当前行为：

- 系统加密能力可用时使用 `safeStorage.encryptString()`。
- 读取使用 `safeStorage.decryptString()`。
- 旧明文 `.secret` 首次成功读取后自动迁移。
- OS / Runner 没有可用 `safeStorage` 时使用明文 fallback，并明确保留该事实。
- 浏览器单独运行前端时仍使用独立 localStorage fallback；浏览器模式不等同于 Electron 系统级安全存储。

---

## Settings 接入状态

| 设置 | 状态 | 说明 |
| --- | --- | --- |
| username | ✅ | Dashboard / Profile / Sidebar |
| llm.provider | ✅ | OpenAI-compatible / Anthropic |
| llm.baseUrl | ✅ | OpenAI-compatible 请求地址 |
| llm.model | ✅ | 主模型 ID |
| API Key | ✅ | Electron safeStorage / 浏览器 fallback |
| autoStartPomodoro | ✅ | Study 自动行为 |
| autoOpenStudyPanels | ✅ | 工具面板自动打开 |
| autoAppendNote | ✅ | Study 自动笔记 |
| autoGenerateSessionTitle | ✅ | AI 会话标题 |
| pomodoroMinutes | ✅ | `useStudyPomodoro` |
| ragSimilarityThreshold | ✅ 部分接入 | 换算为关键词 RAG 分数门槛；“相似度”命名并不准确 |
| searchCacheHours | ✅ | Resource Agent 在线结果缓存 |
| contextWindowRounds | ✅ 主对话 | 最近 N 个用户轮次 + 12,000 字符预算；不污染 RAG / event question |
| requireTerminalConfirmation | ⚠️ 仅保存 | 当前没有 run_terminal 工具链 |
| autoSummarizeSessionNote | ⚠️ 未消费 | 没有完整执行链路 |
| autoUpdateLearningProfile | ⚠️ 未消费 | 练习结果不会增量更新 VARK 画像 |
| remindersEnabled | ⚠️ 未消费 | 尚无系统通知调度 |

原则：**UI 有字段 ≠ 功能已接入。只有被业务逻辑真实消费后才标记为 ✅。**

---

## 当前代码结构

```text
Qizen/
├─ .github/workflows/ci.yml
├─ README.md
├─ CLAUDE.md
├─ app/
│  ├─ electron/
│  │  ├─ main.cjs
│  │  ├─ preload.cjs
│  │  └─ dev.cjs
│  ├─ scripts/
│  │  ├─ check-delivery.mjs
│  │  ├─ verify-delivery.cjs
│  │  ├─ resource-agent-smoke.mjs
│  │  └─ visual-smoke.cjs
│  ├─ tests/
│  │  ├─ study-policies.test.mjs
│  │  ├─ study-memory-rag-builders.test.mjs
│  │  └─ study-conversation-context.test.mjs
│  ├─ src/
│  │  ├─ hooks/
│  │  │  ├─ useStudySession.ts
│  │  │  ├─ useStudyPomodoro.ts
│  │  │  ├─ useStudyConversationPersistence.ts
│  │  │  └─ useStudyPractice.ts
│  │  ├─ components/study/
│  │  ├─ lib/
│  │  │  ├─ storage.ts
│  │  │  ├─ studyConversations.ts
│  │  │  ├─ library-parser.ts
│  │  │  ├─ rag.ts
│  │  │  ├─ llm.ts
│  │  │  ├─ secretStore.ts
│  │  │  ├─ webResourceAgent.ts
│  │  │  └─ study/
│  │  └─ routes/
│  │     ├─ Dashboard.tsx
│  │     ├─ Study.tsx
│  │     ├─ Goals.tsx
│  │     ├─ Library.tsx
│  │     ├─ Graph.tsx
│  │     ├─ Notes.tsx
│  │     ├─ Reports.tsx
│  │     ├─ Profile.tsx
│  │     ├─ Settings.tsx
│  │     └─ Onboarding.tsx
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  └─ vite.config.ts
├─ docs/
├─ design/
├─ planning/
└─ prototype/
```

---

## 开发与验证

### 推荐环境

- Node.js 22
- pnpm 9.15.9（CI 当前固定版本）
- Windows / Electron

> 当前 lockfile + Electron 安装链在 pnpm 10 下会遇到 dependency build scripts 默认被阻止的问题。升级 pnpm 10+ 时应显式配置允许的 Electron / esbuild build dependencies，而不是盲目开放所有依赖脚本。

### 安装

```powershell
cd app
pnpm install --frozen-lockfile
```

### 开发

```powershell
pnpm electron:dev
```

仅前端：

```powershell
pnpm dev
```

### 单元测试

```powershell
pnpm test:unit
```

当前使用 Node 22 内置 `node:test`，显式开启 TypeScript type stripping，不额外引入 Vitest/Jest。

当前 3 套 suite 共 28 个 test case，重点覆盖：

- Adaptive Practice 难度边界
- intent / RAG 入口策略
- Study session policy
- panel auto-open
- learning progress 权限
- RAG strong evidence policy
- Learner Memory
- learning topic / plan confirmation / Resource Agent intent
- plan step 结构
- conversation history 轮数语义
- history 字符预算 / 超长消息压缩
- contextual model query 的历史/当前问题分区

### 类型检查

```powershell
pnpm exec tsc --noEmit
```

### 生产构建

```powershell
pnpm build
```

### Electron smoke

```powershell
pnpm electron:check
```

### 组合交付检查

```powershell
pnpm verify:delivery
```

当前真实顺序：

```text
check-delivery contract checks
→ Study behavior unit tests
→ TypeScript tsc --noEmit
→ Vite production build
→ Electron smoke
```

`check-delivery.mjs` 仍然是字符串 / 契约存在性检查，不是行为测试；真正行为边界逐步迁移到 `node:test`。当前 contract 也会验证 `contextWindowRounds` 确实接在主模型调用链上。

在线资源与视觉 smoke 仍需按需单独执行：

```powershell
pnpm smoke:resources -- calculus
pnpm smoke:visual
```

### GitHub Actions

`.github/workflows/ci.yml`：

- PR → `master`
- push → `master`

环境：

```text
windows-latest
Node 22
pnpm 9.15.9
pnpm install --frozen-lockfile
pnpm verify:delivery
```

外部网络资源 smoke 不作为 required CI，避免公共 API 网络波动造成 flaky failure。

---

## 当前技术债

### P0 — 数据层与核心稳定性

#### 1. localStorage → SQLite

这是当前最重要的数据架构升级。

需要先设计：

```text
SQLite schema
+ schema version / migration
+ localStorage import migration
+ repository / data-access boundary
+ failure / rollback strategy
```

Drizzle 可以作为候选 ORM，但先确定数据边界，再决定 ORM。

优先覆盖：

- goals / milestones / tasks
- libraryItems
- notes
- knowledgeGraph
- studyRecord events
- practiceSets
- Study conversations

secret 继续独立于主学习数据库。

### P1 — 测试与 Study 核心

#### 2. 扩大正式行为测试

已经有纯函数单元测试基线，但还缺：

- Reports 练习指标行为测试
- `rag.ts` 检索排序与 boost
- LLM grading JSON 防御性解析
- conversation persistence / migration
- `useStudyPractice` Hook 集成测试
- Study 新建 / 切换 / hydration 集成测试
- Library parser 回归
- React component interaction tests
- 最小 E2E

后续如果需要 DOM / Hook 测试，再引入 Vitest + React Testing Library；不要为了“有测试框架”而先加依赖。

#### 3. 多轮上下文下一阶段优化

`contextWindowRounds` 已接入主对话，但当前实现仍有可升级点：

- 字符预算未来可升级为真实 token budget。
- Provider 可升级为原生多条 message history，而不是单 user prompt 中的历史块。
- 可根据模型 context window 动态调整预算。
- Learning Agent 是否继承会话历史应单独设计，不应默认混用。

这些属于优化，不再是“功能未实现”。

#### 4. `useStudySession` 后续拆分

第一阶段拆分已完成：

- ✅ `useStudyPomodoro`
- ✅ `useStudyConversationPersistence`
- ✅ `useStudyPractice`

下一步不要继续机械拆分。只有在测试边界建立后，再评估：

```text
useStudyGeneration
useStudyPlan
useStudyResourceAgent
useStudyProgress
```

优先解决真实耦合，而不是追求 Hook 数量。

### P1 — 桌面发布

#### 5. Windows 发布链

当前缺少：

- installer
- electron-builder / forge
- Windows code signing
- auto updater
- GitHub Release workflow

进入外部用户测试前需要补齐。

### P2 — 产品一致性

#### 6. 清理未消费 Settings

需要逐个决定“实现还是移除 UI”：

- `requireTerminalConfirmation`
- `autoSummarizeSessionNote`
- `autoUpdateLearningProfile`
- `remindersEnabled`

#### 7. 修正文案超前

继续核对：

- Library 把规则摘要描述成“AI 智能分析”的文案
- Library 关于练习自动更新学习画像的文案
- 其它“AI / 自动化 / 隐私”描述是否与真实能力一致

### P2 — RAG / Agent 能力升级

当前关键词 RAG 对小型个人资料库可用，后续可逐步升级：

- chunk index
- embedding
- hybrid retrieval
- rerank
- source citation schema

Resource Agent 后续可考虑网页正文抓取 / 课程目录抽取，但应建立来源、版权、失败降级与缓存边界后再做。

---

## 2026-08-21 稳定化进展

已完成：

- ✅ GitHub Actions Windows CI
- ✅ CI 固定 pnpm 9.15.9，解决 pnpm 10 阻止 Electron / esbuild postinstall
- ✅ Electron API Key 使用 `safeStorage`，兼容旧明文 secret 自动迁移
- ✅ Electron secret round-trip / 密文 smoke
- ✅ `searchCacheHours` 正式接入 Resource Agent
- ✅ Resource Agent 缓存只保存成功在线结果，本地资料保持实时融合
- ✅ 清理旧 `storage/types.ts`
- ✅ 去掉 Study 学科硬编码
- ✅ 合并 Notes Markdown / Settings Switch / EmptyState / Onboarding VARK UI polish
- ✅ Reports 练习完成统计去重，legacy fallback，完成率限制 100%
- ✅ 抽出 `useStudyPomodoro`
- ✅ 抽出 `useStudyConversationPersistence`
- ✅ 抽出 `useStudyPractice`
- ✅ delivery contract 跟随新 Hook 边界更新
- ✅ 建立 Node 22 `node:test` 正式行为测试基线
- ✅ 第二批覆盖 RAG policy / Learner Memory / message builders
- ✅ `contextWindowRounds` 正式接入主 Study 模型回答
- ✅ 多轮历史增加 12,000 字符预算、单消息压缩与 7 个行为测试

---

## 建议后续开发顺序

```text
1. 扩大核心行为测试（rag.ts / conversation persistence / practice / grading）
2. 设计 SQLite schema 与 localStorage migration
3. 清理未消费 Settings 与超前产品文案
4. 完成 Windows installer / signing / Release
5. 再评估 Study Generation / Agent 拆分
6. 再升级 Resource Agent / hybrid RAG / provider-native history
```

当前不建议继续大规模增加页面或堆新 Agent 功能。

**现阶段最重要的工作，是把已有能力变成稳定、可测试、可迁移、可发布的产品。**

---

## 信息架构

```text
Qizen
├─ Onboarding · 学习画像
├─ Dashboard · 学习看板
├─ Study · 核心学习空间
│  ├─ 会话历史 / persistence
│  ├─ 最近 N 轮对话上下文
│  ├─ 学习计划
│  ├─ RAG / evidence
│  ├─ Resource Agent
│  ├─ Learning Agent
│  ├─ Practice / Grading
│  ├─ Pomodoro
│  ├─ Notes
│  └─ Route / Graph panel
├─ Goals · 目标 / 里程碑 / 任务
├─ Library · 本地资料库
├─ Graph · 知识图谱
├─ Notes · 笔记
├─ Reports · 学习报告
├─ Profile · 学习画像与长期记忆
└─ Settings · 模型 / 自动化 / 数据
```

---

## 文档索引

### 开发约定

- [`CLAUDE.md`](./CLAUDE.md) — 构建、验证、架构约定与技术债

### 产品 / 设计历史

- [`docs/PRD.md`](./docs/PRD.md)
- [`docs/FINAL_PRODUCT_MASTER_SPEC_2026-04-24.md`](./docs/FINAL_PRODUCT_MASTER_SPEC_2026-04-24.md)
- [`docs/INFORMATION_ARCHITECTURE.md`](./docs/INFORMATION_ARCHITECTURE.md)
- [`docs/TECH_STACK.md`](./docs/TECH_STACK.md)
- [`design/PRODUCT_DESIGN.md`](./design/PRODUCT_DESIGN.md)

### 交付 / 路线历史

- [`docs/DELIVERY_AUDIT.md`](./docs/DELIVERY_AUDIT.md)
- [`planning/PROJECT_STATUS_AND_ROADMAP_2026-04-24.md`](./planning/PROJECT_STATUS_AND_ROADMAP_2026-04-24.md)
- [`planning/WEEK_1_SPRINT.md`](./planning/WEEK_1_SPRINT.md)

这些文档保留历史决策价值；与本 README 或当前源码冲突时，以当前源码为准。

---

## 开发原则

1. **代码事实优先于规划文档。**
2. **UI 有开关，不等于功能已经接入。**
3. **AI 文案必须与真实模型调用链一致。**
4. **用户学习数据与 secret 分开管理。**
5. **核心重构先建立可验证边界，再迁移职责。**
6. **字符串 contract 只做存在性守门，关键逻辑应逐步转为行为测试。**
7. **当前问题、RAG 检索和历史上下文必须保持边界清晰。**
8. **新增功能前优先修正确性、迁移、测试和发布能力。**
