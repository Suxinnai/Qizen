# 栖知 Qizen

> 栖息于知识之中 —— 围绕个人资料、目标、知识图谱、笔记与学习记录构建的本地优先 AI 私人学习工作台。

## 项目定位

Qizen 不是题库、网课聚合器，也不是单纯给聊天模型套一层学习 UI。

当前产品的核心目标是：**把用户自己的资料、学习目标、知识图谱、历史学习记录与真实大模型能力串成一个长期可积累的学习闭环。**

目前主产品形态是 Windows / 桌面优先的 Electron 应用，核心技术栈为：

- Electron
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React

当前代码已经超过概念 Demo 阶段，属于 **可运行 MVP / 产品化整理阶段**。后续重点不应继续无节制堆功能，而应优先收敛数据层、会话编排、测试与发布能力。

---

## 当前真实状态（按 `master` 代码审计，更新于 2026-08-21）

> 本节以当前 `master` 源码为准，不以旧 PRD / 路线图中的计划描述为准。

### 已形成的核心学习闭环

当前 Study 主链路已经可以覆盖：

```text
明确学习内容
→ 讨论学习方式
→ 生成并确认学习计划
→ 查找在线资源 + 融合本地资料
→ RAG 检索本地依据
→ 调用真实 LLM / 本地 fallback
→ 流式回答
→ 基于命中资料生成练习
→ 用户作答
→ LLM 批改 / 无模型自评降级
→ 写入学习记录与薄弱点
→ 在 Profile / Reports 中反馈
```

### 已实现功能概览

| 模块 | 当前状态 | 真实实现说明 |
| --- | --- | --- |
| Electron 桌面壳 | ✅ 已实现 | 自定义无边框窗口、最小化/最大化/关闭、外链打开、Electron smoke test |
| Onboarding | ✅ 已实现 | 8 题 VARK 风格学习偏好评测，本地保存主/辅学习模式与教学策略 |
| Dashboard | ✅ 已实现 | 今日提问、练习、学习分钟、连续学习、目标任务、最近 30 天节奏 |
| Goals | ✅ 基础可用 | goal → milestone → task 层级，支持从 task 进入 Study |
| Library | ✅ 核心可用 | PDF / DOCX / Markdown / TXT 文本解析；图片可收纳但不做 OCR 深解析 |
| Library 摘要/重点 | ✅ 已实现（规则型） | 当前摘要与重点由本地文本规则提取，不是 LLM 摘要 |
| Knowledge Graph | ✅ 核心可用 | 资料解析后启发式生成节点/边；支持缩放、拖拽、节点详情与学习入口 |
| Notes | ✅ 基础可用 | Markdown 编辑/预览、学习空间写入、要点/易混淆点、复制全文 |
| Study 会话 | ✅ 核心可用 | 新建/切换/持久化、上下文进入、流式回答、RAG、策略按钮、右侧工具面板 |
| 本地 RAG | ✅ 已实现 | 关键词 + CJK 2–4gram + IDF + 当前资料/节点 boost；不是向量检索 |
| LLM | ✅ 已实现 | OpenAI-compatible + Anthropic；支持真实 SSE 流式输出与连接测试 |
| Resource Agent | ✅ MVP | Wikipedia / 中文 Wikipedia / Wikibooks / DuckDuckGo 发现资源，失败时降级搜索入口 |
| Learning Agent | ✅ MVP | 固定三步“讲解 → 检查理解 → 小结下一步”，不是通用工具调用 Agent |
| Adaptive Practice | ✅ 已实现 | 根据历史提问/练习完成情况推断基础 / 进阶 / 综合，调整题量和题型 |
| Practice Grading | ✅ 已实现 | 有模型时整组 LLM 批改；无模型时允许用户自评；记录真实分数与错题 |
| Learner Memory | ✅ MVP | 从学习事件派生连续学习、常错/需巩固点、模型使用占比、主要 Provider |
| Reports | ✅ 已增强 | 7 天柱状图、30 天热力图、资料命中 Top 5、练习完成率、模型使用占比、事件时间线 |
| Profile | ✅ 已增强 | 昵称、VARK 雷达图、学习记忆、统计、最近活动、重新评测 |
| 数据导出 | ✅ 已实现 | 导出当前主 AppData JSON |
| 会话清理 / 全量重置 | ✅ 已实现 | 可单独清理 Study 会话；可重置主数据 |
| 账号体系 / 云同步 | ❌ 未实现 | 当前是本地单用户产品 |
| 系统通知 / 成就 | ❌ 未实现 | 暂无真正通知调度、成就引擎 |
| 安装包 / 自动更新 | ❌ 未实现 | 目前没有 electron-builder / forge / updater / 签名发布链 |

---

## 核心模块说明

### 1. Study 学习空间

Study 是当前产品核心。

`app/src/routes/Study.tsx` 已经从早期巨型页面拆成 UI 编排层，主要依赖：

```text
app/src/routes/Study.tsx
app/src/hooks/useStudySession.ts
app/src/components/study/
app/src/components/study/panels/
app/src/lib/study/
```

当前支持：

- 自由新会话
- 从 Library / Graph / Goal / Note 带上下文进入
- 历史会话恢复
- 会话标题生成
- `<think>` / `<thinking>` / `<thought>` 清洗
- 非学习闲聊绕开 RAG
- 强证据门槛控制
- OpenAI / Anthropic 真实流式输出
- 本地 fallback
- 学习计划生成与确认
- Resource Agent
- 资料证据卡
- 番茄钟
- 选中文字保存笔记
- 学习路线面板
- Agent 带学一轮
- 自适应练习
- LLM 批改 / 自评降级

### 2. RAG 实现边界

当前 RAG 不是 embedding / vector database。

核心实现位于：

```text
app/src/lib/rag.ts
app/src/lib/study/rag-policy.ts
```

检索主要使用：

- 文本 normalize
- ASCII token
- 中文 2–4 字 n-gram
- 小规模 IDF 加权
- 通用学习意图同义词
- 从用户资料自动派生的词组扩展
- 当前 resource boost
- 当前 graph node boost
- 标题 / 摘要 / highlights / preview / 正文分字段加权

证据展示还会经过第二层强命中过滤，因此“检索到”不等于“展示为证据”。

### 3. 在线资源发现

`app/src/lib/webResourceAgent.ts` 当前做的是 **资源发现**，不是网页内容抓取 Agent。

当前会并行尝试：

- 中文 Wikipedia OpenSearch
- Wikipedia OpenSearch
- Wikibooks OpenSearch
- DuckDuckGo Instant Answer

拿不到结果时，会生成 Bing 可点击搜索入口。

当前不会：

- 自动打开并解析任意网页全文
- 自动抓 Bilibili / YouTube 视频目录
- 自动理解网页正文后写入 Library
- 做浏览器自动化工具调用

### 4. 练习与长期学习记忆

当前已经有第一版学习反馈闭环：

```text
RAG 命中
→ 生成练习
→ 推断难度
→ 用户作答
→ LLM 批改 / 自评
→ practice-completed event
→ weakQuestionPrompts
→ Learner Memory
→ Profile / Reports
```

难度推断当前采用简单规则：

- 基础：默认起点
- 进阶：完成 ≥2 组练习或累计提问较多
- 综合：稳定完成多组练习且完成率较高

这仍属于 MVP 级自适应，不是知识追踪模型 / IRT / BKT。

---

## 当前数据与持久化

### 主数据

主 AppData 使用浏览器 `localStorage`：

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

会话单独存储：

```text
qizen:study:conversations:v1
```

当前已有 schema migration / 文本清洗逻辑，但仍然属于 localStorage 持久化。

### API Key

Electron 环境下 API Key 已从主 AppData 中分离：

```text
Electron userData/secrets/secrets.json
```

说明：

- Electron 运行时不会把 API Key 写回主 AppData localStorage。
- 浏览器单独运行前端时，secretStore 会 fallback 到独立 localStorage key。
- **当前 secret 文件不是系统 Keychain / Windows Credential Manager / DPAPI 加密存储。**

因此 UI 中不应宣称“本地加密存储”已经完成。

---

## 设置项接入状态

Settings 中有一部分字段是真实接入，一部分目前只是保存配置。

| 设置 | 状态 | 说明 |
| --- | --- | --- |
| username | ✅ 已接入 | Dashboard / Profile / Sidebar 使用 |
| llm.provider | ✅ 已接入 | 控制 OpenAI-compatible / Anthropic |
| llm.baseUrl | ✅ 已接入 | OpenAI-compatible 请求地址 |
| llm.model | ✅ 已接入 | 主模型 ID |
| API Key | ✅ 已接入 | secretStore 保存并用于请求 |
| autoStartPomodoro | ✅ 已接入 | Study 工具面板自动行为 |
| autoOpenStudyPanels | ✅ 已接入 | 控制工具面板自动打开 |
| autoAppendNote | ✅ 已接入 | Study 自动笔记行为 |
| autoGenerateSessionTitle | ✅ 已接入 | 会话标题生成 |
| pomodoroMinutes | ✅ 已接入 | Study 番茄钟 |
| ragSimilarityThreshold | ✅ 部分接入 | 被换算为当前关键词 RAG 分数门槛；名称“相似度”并不准确 |
| contextWindowRounds | ⚠️ 仅保存 | 当前 LLM 请求没有真正按多轮历史构造 messages |
| searchCacheHours | ⚠️ 仅保存 | Resource Agent 当前没有缓存实现 |
| requireTerminalConfirmation | ⚠️ 仅保存 | 当前产品没有 run_terminal 工具链 |
| autoSummarizeSessionNote | ⚠️ 未消费 | 数据字段存在，但没有完整执行链路 |
| autoUpdateLearningProfile | ⚠️ 未消费 | 当前学习画像不会依据练习结果自动增量更新 |
| remindersEnabled | ⚠️ 未消费 | 尚无通知调度系统 |

后续新增设置时，必须保证：**UI 暴露 ≠ 已实现；只有被业务逻辑真实消费后才标为“已接入”。**

---

## 当前代码结构

```text
Qizen/
├─ README.md
├─ CLAUDE.md                         # AI/协作开发约定与架构注意事项
├─ app/
│  ├─ electron/
│  │  ├─ main.cjs                   # Electron 主进程 / 窗口 / secret IPC / smoke
│  │  ├─ preload.cjs                # contextBridge
│  │  └─ dev.cjs                    # Electron + Vite 开发启动
│  ├─ scripts/
│  │  ├─ check-delivery.mjs         # 字符串/契约存在性检查
│  │  ├─ verify-delivery.cjs        # 类型检查 + build + Electron smoke 等组合验证
│  │  ├─ resource-agent-smoke.mjs   # 在线资源发现 smoke
│  │  └─ visual-smoke.cjs           # 浏览器/Electron 截图视觉 smoke
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ Sidebar.tsx
│  │  │  ├─ TitleBar.tsx
│  │  │  └─ study/
│  │  │     ├─ MessageList.tsx
│  │  │     ├─ MessageBody.tsx
│  │  │     ├─ StudyInput.tsx
│  │  │     ├─ StudyEmptyState.tsx
│  │  │     ├─ StrategyBar.tsx
│  │  │     ├─ RagEvidenceCard.tsx
│  │  │     ├─ PracticePanel.tsx
│  │  │     └─ panels/
│  │  ├─ hooks/
│  │  │  └─ useStudySession.ts      # 当前最复杂的核心会话编排
│  │  ├─ lib/
│  │  │  ├─ storage.ts              # 主数据模型 + localStorage + 数据操作
│  │  │  ├─ studyConversations.ts   # Study 会话持久化/迁移
│  │  │  ├─ library-parser.ts       # PDF / DOCX / MD / TXT 解析
│  │  │  ├─ rag.ts                  # 本地关键词 RAG + 练习生成
│  │  │  ├─ llm.ts                  # OpenAI-compatible / Anthropic + SSE
│  │  │  ├─ secretStore.ts          # API Key 分离存储
│  │  │  ├─ webResourceAgent.ts     # 公共搜索源资源发现
│  │  │  └─ study/
│  │  │     ├─ intent.ts
│  │  │     ├─ rag-policy.ts
│  │  │     ├─ reply-policy.ts
│  │  │     ├─ sanitize.ts
│  │  │     ├─ session-policy.ts
│  │  │     ├─ message-builders.ts
│  │  │     ├─ adaptive.ts
│  │  │     ├─ memory.ts
│  │  │     └─ types.ts
│  │  └─ routes/
│  │     ├─ Onboarding.tsx
│  │     ├─ Dashboard.tsx
│  │     ├─ Study.tsx
│  │     ├─ Goals.tsx
│  │     ├─ Library.tsx
│  │     ├─ Graph.tsx
│  │     ├─ Notes.tsx
│  │     ├─ Reports.tsx
│  │     ├─ Profile.tsx
│  │     └─ Settings.tsx
│  ├─ package.json
│  └─ vite.config.ts
├─ docs/
├─ design/
├─ planning/
└─ prototype/                        # 历史原型，不代表当前产品实现
```

---

## 开发与验证

### 环境

- Node.js
- pnpm
- Windows / Electron 开发环境

前端 dev server 固定使用：

```text
127.0.0.1:1420
```

### 安装

```powershell
cd app
pnpm install
```

### Electron 开发

```powershell
pnpm electron:dev
```

### 仅前端

```powershell
pnpm dev
```

### 类型检查

项目历史上出现过 `npx tsc` 误装错误包的问题，因此优先：

```powershell
.\node_modules\.bin\tsc --noEmit
```

或：

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

注意：

- `check-delivery.mjs` 主要是字符串 / 契约存在性检查，不是行为测试。
- `verify-delivery.cjs` 会组合类型检查、构建和 Electron smoke，但仍不能替代真实交互测试。
- 在线资源 smoke 和视觉 smoke 需要单独执行。

```powershell
pnpm smoke:resources -- calculus
pnpm smoke:visual
```

---

## 已知技术债与优先级

### P0 / 下一阶段必须优先处理

#### 1. 拆 `useStudySession.ts`

当前 `Study.tsx` 已经明显变轻，但复杂度迁移到了 `app/src/hooks/useStudySession.ts`。

目前会话切换、水合、持久化、RAG、LLM、Agent、计划、Resource Agent、练习、批改、番茄钟、笔记、进度写回仍集中在一个 Hook 中，并使用多个 ref 协调时序。

建议拆分方向：

```text
useStudyConversation
useStudyPersistence
useStudyGeneration
useStudyPlan
useStudyResourceAgent
useStudyPractice
useStudyProgress
```

并逐步用 reducer / state machine 收敛状态转换。

#### 2. localStorage → SQLite

当前资料、学习事件、知识图谱、目标和报告数据仍全部放在 localStorage。

当真实用户开始积累大量资料、对话和事件后，这会成为容量、查询、迁移和可靠性瓶颈。

建议正式引入：

```text
SQLite + migration layer
```

Drizzle 可作为 ORM 方案候选，但应先设计 schema / migration / import-existing-localStorage。

#### 3. 补正式自动化测试

当前没有 Vitest / React Testing Library / Playwright。

优先补：

- `rag.ts` 纯函数测试
- `adaptive.ts` 测试
- `memory.ts` 测试
- `intent.ts` / `rag-policy.ts` 测试
- Study 会话恢复 / 新建 / 切换测试
- LLM JSON 批改防御性解析测试
- Library 上传解析回归测试

#### 4. 桌面产品发布链

目前只能开发运行 / preview / smoke，没有：

- installer
- electron-builder / forge
- Windows code signing
- auto updater
- release workflow

要进入真实用户测试，必须补这一层。

### P1 / 明确功能缺口

#### 5. LLM 多轮上下文

Settings 有 `contextWindowRounds`，但当前核心生成请求仍然主要围绕“当前 query + 当前 RAG/上下文”构造，没有真正把 N 轮聊天历史传给模型。

需要把会话历史正式纳入 prompt/messages，同时控制 token 与隐私边界。

#### 6. Resource Agent 缓存

Settings 有 `searchCacheHours`，但当前没有资源检索缓存。

建议后续增加：

```text
query + locale + source → cached result + fetchedAt
```

#### 7. API Key 系统安全存储

当前 Electron secret file 只是“从主 localStorage 分离”，不等于加密。

Windows 上可考虑：

- DPAPI
- Credential Manager
- keytar / Electron safeStorage

#### 8. RAG 升级

当前关键词 RAG 对小型个人资料库足够，但后续可以升级：

- chunk 索引
- embedding
- hybrid retrieval
- rerank
- source citation schema

不要直接替换现有实现，应保留 fallback 与可解释性。

### P2 / 清理与一致性

#### 9. 清理遗留数据模型

`app/src/lib/storage/types.ts` 存在一套与当前 `storage.ts` 不一致的旧 RootStore / TeachingStyle 定义，当前未发现真实业务引用，应确认后删除或归档。

#### 10. 去除剩余学科硬编码

虽然核心 RAG 已经去掉早期微积分硬编码，但仍存在少量 UI / 推断规则残留，例如：

- `StudyEmptyState.tsx` 的快捷提示仍写有“数学定理”
- Goals UI 对“数学 / 英语 / 编程”有固定主题样式
- Knowledge Graph 节点 kind 推断仍包含定理/概念类启发式规则

通用学习产品应继续去领域化。

#### 11. 修正文案超前问题

当前部分 UI 文案比真实实现更激进，例如：

- Onboarding 宣称“本地加密隐私”，实际主数据是 localStorage，secret 也只是文件分离
- Library 把规则摘要称为“AI 智能分析”
- Library 宣称练习会自动更新学习画像，但当前并没有这条增量更新链路

后续任何产品文案都应和实现保持一致。

#### 12. Reports 练习完成统计口径

当前 Reports 的 completed 统计同时读取 `practice-completed` event 和 `practiceSets.status === completed`，需要检查是否存在重复计数场景，并统一数据真源。

---

## 建议后续开发顺序

```text
1. 合并 / 处理现有 UI polish PR
2. 拆 useStudySession + 收敛会话状态
3. 补 Vitest / Study 关键行为测试
4. 设计 SQLite schema 与 localStorage 迁移
5. 修复 Settings 假接入项和产品文案超前
6. 完成 Windows 安装包 / Release 流程
7. 正式实现多轮上下文
8. 再升级 Resource Agent / RAG / Agent 工具体系
```

当前阶段不建议继续大规模增加新页面。

**最重要的是先把已经存在的能力变成稳定、可测试、可迁移、可发布的产品。**

---

## 当前信息架构

```text
Qizen
├─ Onboarding · 学习画像
├─ Dashboard · 学习看板
├─ Study · 核心学习空间
│  ├─ 会话历史
│  ├─ 学习计划
│  ├─ RAG / 证据
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

- [`CLAUDE.md`](./CLAUDE.md) — 构建、验证、架构约定与已知技术债

### 产品 / 设计历史文档

- [`docs/PRD.md`](./docs/PRD.md)
- [`docs/FINAL_PRODUCT_MASTER_SPEC_2026-04-24.md`](./docs/FINAL_PRODUCT_MASTER_SPEC_2026-04-24.md)
- [`docs/INFORMATION_ARCHITECTURE.md`](./docs/INFORMATION_ARCHITECTURE.md)
- [`docs/TECH_STACK.md`](./docs/TECH_STACK.md)
- [`design/PRODUCT_DESIGN.md`](./design/PRODUCT_DESIGN.md)

### 交付与路线历史

- [`docs/DELIVERY_AUDIT.md`](./docs/DELIVERY_AUDIT.md)
- [`planning/PROJECT_STATUS_AND_ROADMAP_2026-04-24.md`](./planning/PROJECT_STATUS_AND_ROADMAP_2026-04-24.md)
- [`planning/WEEK_1_SPRINT.md`](./planning/WEEK_1_SPRINT.md)

> 上述旧文档保留历史决策价值，但若与本 README 和当前源码冲突，以当前源码为准。

---

## 项目原则

后续开发建议继续遵守：

1. **代码事实高于产品文案。**
2. **先修闭环与可信度，再加新功能。**
3. **通用逻辑禁止写死单一学科知识。**
4. **RAG 没有强依据就不展示成证据。**
5. **模型输出进入 UI / 持久化前必须清洗。**
6. **新增 Settings 必须区分“仅保存”与“真实接入”。**
7. **每次核心改动必须至少通过 TypeScript、build 和对应行为测试。**
8. **长期数据能力优先考虑迁移、兼容与可恢复性。**

由「灵」和使用者一起，把 Qizen 从可运行 MVP 继续养成真正可以长期使用的个人学习系统。
