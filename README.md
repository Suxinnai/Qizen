# 栖知 Qizen

> 栖息于知识之中 —— 围绕个人资料、目标、知识图谱、笔记与学习记录构建的本地优先 AI 私人学习工作台。

## 项目定位

Qizen 不是题库、网课聚合器，也不是单纯给聊天模型套一层学习 UI。

当前产品的核心目标是：**把用户自己的资料、学习目标、知识图谱、历史学习记录与真实大模型能力串成一个长期可积累的学习闭环。**

主产品形态是 Windows / 桌面优先的 Electron 应用，核心技术栈：

- Electron
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React

当前阶段：**可运行 MVP → 产品化稳定阶段**。

> 本 README 以 2026-08-21 当前 `master` 源码为准。历史 PRD、roadmap、prototype 与源码冲突时，以源码为准。

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
→ SSE 流式回答
→ 基于命中资料生成练习
→ 用户作答
→ LLM 批改 / 无模型自评
→ 写入学习事件与薄弱点
→ Profile / Reports 反馈
```

### 功能状态

| 模块 | 状态 | 当前真实实现 |
| --- | --- | --- |
| Electron 桌面壳 | ✅ | 无边框窗口、窗口控制、外链拦截、Electron smoke |
| Onboarding | ✅ | VARK 风格学习偏好评测，含四维预览与本地画像保存 |
| Dashboard | ✅ | 今日提问、练习、学习分钟、目标任务、30 天节奏 |
| Goals | ✅ 基础可用 | goal → milestone → task，可从任务进入 Study |
| Library | ✅ 核心可用 | PDF / DOCX / Markdown / TXT 解析；图片可收纳但不做 OCR 深解析 |
| Library 摘要/重点 | ✅ 规则型 | 当前主要由本地文本规则提取，不是 LLM 摘要 |
| Knowledge Graph | ✅ 核心可用 | 启发式生成节点/边、缩放拖拽、节点详情、学习入口 |
| Notes | ✅ | Markdown 编辑/预览，支持 H1-H6、列表、引用、围栏代码、粗体/斜体/行内代码 |
| Study 会话 | ✅ 核心可用 | 新建/切换/持久化、上下文进入、流式回答、RAG、工具面板 |
| 本地 RAG | ✅ | 关键词 + CJK 2–4gram + IDF + resource/node boost；不是向量检索 |
| LLM | ✅ | OpenAI-compatible + Anthropic；SSE 流式输出、连接测试 |
| Resource Agent | ✅ MVP | Wikipedia / 中文 Wikipedia / Wikibooks / DuckDuckGo；失败降级搜索入口 |
| Resource 搜索缓存 | ✅ | `searchCacheHours` 控制成功在线结果缓存，本地 Library lead 每次保持实时 |
| Learning Agent | ✅ MVP | 固定三步“讲解 → 检查理解 → 小结下一步”，不是通用工具 Agent |
| Adaptive Practice | ✅ | 根据历史学习事件推断基础 / 进阶 / 综合难度 |
| Practice Grading | ✅ | 有模型时 LLM 批改；无模型时自评；记录分数与薄弱题 |
| Learner Memory | ✅ MVP | 连续学习、常错点、模型使用、主要 Provider 等派生记忆 |
| Reports | ✅ | 图表与时间线已实现；练习完成统计已去重并兼容旧数据，完成率限制在 0–100% |
| Profile | ✅ | 昵称、VARK 雷达图、学习记忆、统计、最近活动、重新评测 |
| Settings | ✅ 基础可用 | 模型、自动行为、RAG、缓存、数据等配置；部分字段仍未消费 |
| API Key 存储 | ✅ Electron | 使用 Electron `safeStorage`；旧明文 secret 可自动迁移 |
| GitHub Actions CI | ✅ | Windows 上自动执行 contract + TypeScript + Vite build + Electron smoke |
| 数据导出 | ✅ | 导出主 AppData JSON |
| 账号体系 / 云同步 | ❌ | 当前是本地单用户产品 |
| 系统通知 / 成就 | ❌ | 暂无真正通知调度、成就引擎 |
| 安装包 / 自动更新 | ❌ | 尚无 installer、签名、updater、Release 发布链 |

---

## 核心架构

### Study 学习空间

Study 是产品核心。页面已经从早期巨型组件拆成 UI 编排层，但复杂业务仍主要集中在 Hook：

```text
app/src/routes/Study.tsx
app/src/hooks/useStudySession.ts
app/src/components/study/
app/src/components/study/panels/
app/src/lib/study/
```

当前支持：

- 自由新会话
- Library / Graph / Goal / Note 上下文进入
- 历史会话恢复
- 自动会话标题
- `<think>` / `<thinking>` / `<thought>` 清洗
- 非学习闲聊绕开 RAG
- 强证据门槛
- OpenAI / Anthropic 实时流式输出
- 本地 fallback
- 学习计划生成与确认
- Resource Agent
- 资料证据卡
- 番茄钟
- 选中文字保存笔记
- 学习路线面板
- 三步 Learning Agent
- 自适应练习
- LLM 批改 / 自评降级

### RAG 当前边界

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

它不是 embedding / vector database。证据展示还会经过强命中过滤，因此“检索到”不等于“展示为证据”。

### Resource Agent 当前边界

核心文件：

```text
app/src/lib/webResourceAgent.ts
```

当前并行尝试：

- 中文 Wikipedia OpenSearch
- Wikipedia OpenSearch
- Wikibooks OpenSearch
- DuckDuckGo Instant Answer

成功在线结果会根据 `searchCacheHours` 缓存；缓存只保存在线 lead，当前本地资料标题仍在每次调用时重新融合。

当前**不会**：

- 自动抓取任意网页全文
- 自动拉取 Bilibili / YouTube 课程目录
- 自动把网页正文写入 Library
- 浏览器自动化工具调用

因此请把它理解为“资源发现 Agent”，不是“网页研究 Agent”。

### 练习与学习记忆

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

当前自适应仍是规则型 MVP，不是 IRT / BKT / 知识追踪模型。

---

## 数据与持久化

### 主数据

当前主 AppData 仍使用浏览器 `localStorage`：

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

会话独立存储：

```text
qizen:study:conversations:v1
```

已经有 schema migration / 文本清洗逻辑，但仍属于 localStorage 持久化。

### API Key

Electron 环境下，API Key 不写入主 AppData，而是通过主进程 secret IPC 写入：

```text
Electron userData/secrets/<key>.secret
```

当前行为：

- 系统加密能力可用时，使用 Electron `safeStorage.encryptString()` 写入密文。
- 读取时使用 `safeStorage.decryptString()`。
- 旧版本明文 `.secret` 首次成功读取后会自动迁移成加密格式。
- 如果当前 OS / 运行环境没有可用的 safeStorage 加密能力，会保持可用性并使用明文 fallback，不伪装成已加密。
- 浏览器单独运行前端时，`secretStore` 仍有独立 localStorage fallback，因此浏览器模式不等同于 Electron 的系统级安全存储。

---

## Settings 接入状态

| 设置 | 状态 | 说明 |
| --- | --- | --- |
| username | ✅ | Dashboard / Profile / Sidebar 使用 |
| llm.provider | ✅ | OpenAI-compatible / Anthropic |
| llm.baseUrl | ✅ | OpenAI-compatible 请求地址 |
| llm.model | ✅ | 主模型 ID |
| API Key | ✅ | Electron safeStorage / 浏览器 fallback |
| autoStartPomodoro | ✅ | Study 自动行为 |
| autoOpenStudyPanels | ✅ | 控制工具面板自动打开 |
| autoAppendNote | ✅ | Study 自动笔记 |
| autoGenerateSessionTitle | ✅ | 会话标题生成 |
| pomodoroMinutes | ✅ | Study 番茄钟 |
| ragSimilarityThreshold | ✅ 部分接入 | 被换算为关键词 RAG 分数门槛；“相似度”命名并不准确 |
| searchCacheHours | ✅ | 控制 Resource Agent 成功在线结果缓存时长 |
| contextWindowRounds | ⚠️ 仅保存 | 当前 LLM 请求没有真正按 N 轮历史构造 messages |
| requireTerminalConfirmation | ⚠️ 仅保存 | 当前没有 run_terminal 工具链 |
| autoSummarizeSessionNote | ⚠️ 未消费 | 字段存在，没有完整执行链路 |
| autoUpdateLearningProfile | ⚠️ 未消费 | 练习结果不会自动增量更新 VARK 画像 |
| remindersEnabled | ⚠️ 未消费 | 尚无通知调度系统 |

原则：**UI 暴露 ≠ 已实现。只有被业务逻辑真实消费后，README 才标记为“已接入”。**

---

## 当前代码结构

```text
Qizen/
├─ .github/
│  └─ workflows/
│     └─ ci.yml                     # Windows delivery CI
├─ README.md
├─ CLAUDE.md                        # AI/协作开发约定
├─ app/
│  ├─ electron/
│  │  ├─ main.cjs                  # 窗口 / safeStorage secret / Electron smoke
│  │  ├─ preload.cjs               # contextBridge
│  │  └─ dev.cjs                   # Electron + Vite 开发启动
│  ├─ scripts/
│  │  ├─ check-delivery.mjs        # 字符串/契约存在性检查
│  │  ├─ verify-delivery.cjs       # contract + tsc + build + Electron smoke
│  │  ├─ resource-agent-smoke.mjs  # 在线资源发现 smoke
│  │  └─ visual-smoke.cjs          # 视觉 smoke
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ ui/
│  │  │  │  ├─ EmptyState.tsx
│  │  │  │  └─ Switch.tsx
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
│  │  │  └─ useStudySession.ts     # 当前最复杂的核心会话编排
│  │  ├─ lib/
│  │  │  ├─ storage.ts             # 主数据模型 + localStorage
│  │  │  ├─ studyConversations.ts  # 会话持久化 / migration
│  │  │  ├─ library-parser.ts
│  │  │  ├─ rag.ts
│  │  │  ├─ llm.ts
│  │  │  ├─ secretStore.ts
│  │  │  ├─ webResourceAgent.ts
│  │  │  └─ study/
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
│  ├─ pnpm-lock.yaml
│  └─ vite.config.ts
├─ docs/
├─ design/
├─ planning/
└─ prototype/                       # 历史原型，不代表当前实现
```

---

## 开发与验证

### 推荐环境

- Node.js 22
- pnpm 9.15.9（当前 CI 固定版本）
- Windows / Electron

> 当前 lockfile + Electron 安装链在 pnpm 10 下会遇到 dependency build scripts 默认被阻止的问题。CI 暂时固定 pnpm 9.15.9。未来升级 pnpm 10+ 时，应显式配置允许的 Electron / esbuild build dependencies，而不是盲目放开所有依赖脚本。

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

### 验证

类型检查：

```powershell
pnpm exec tsc --noEmit
```

生产构建：

```powershell
pnpm build
```

Electron smoke：

```powershell
pnpm electron:check
```

组合交付检查：

```powershell
pnpm verify:delivery
```

当前 `verify:delivery` 实际执行：

```text
check-delivery contract checks
→ TypeScript tsc --noEmit
→ Vite production build
→ Electron smoke
```

注意：`check-delivery.mjs` 主要是字符串 / 契约存在性检查，不是行为测试；CI 全绿也不能替代真实交互测试。

在线资源 smoke 与视觉 smoke 仍需按需单独执行：

```powershell
pnpm smoke:resources -- calculus
pnpm smoke:visual
```

### GitHub Actions

`.github/workflows/ci.yml` 在以下场景自动执行：

- PR → `master`
- push → `master`

当前 CI：

```text
windows-latest
Node 22
pnpm 9.15.9
pnpm install --frozen-lockfile
pnpm verify:delivery
```

外部网络资源 smoke 不作为 required CI，以避免公共 API 网络波动造成 flaky failure。

---

## 已知问题与技术债

### P0 — 稳定性 / 数据正确性

#### 1. 拆 `useStudySession.ts`

`Study.tsx` 已经变轻，但复杂度集中到了 `app/src/hooks/useStudySession.ts`。

当前一个 Hook 同时负责：

- 会话切换 / 水合 / 持久化
- RAG
- LLM 流式生成
- 学习计划
- Resource Agent
- Learning Agent
- 练习生成 / 批改
- 番茄钟
- 笔记
- 进度写回

建议拆分：

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

当前资料、学习事件、知识图谱、目标和报告数据仍依赖 localStorage。

下一阶段应设计：

```text
SQLite
+ schema migration
+ localStorage import migration
```

Drizzle 可以作为候选 ORM，但先设计数据边界再选实现。

### P1 — 测试 / 发布 / 核心能力

#### 3. 正式自动化测试

现在已经有 CI，但仍没有 Vitest / React Testing Library / Playwright。

优先补：

- `rag.ts`
- `adaptive.ts`
- `memory.ts`
- `intent.ts` / `rag-policy.ts`
- Reports 指标计算
- Study 会话恢复 / 新建 / 切换
- LLM 批改 JSON 防御性解析
- Library 上传解析回归

#### 4. LLM 多轮上下文

`contextWindowRounds` 目前仍未真正进入模型请求。

需要正式设计：

```text
最近 N 轮会话
+ 当前 query
+ 当前 RAG 证据
+ token budget
+ 隐私边界
```

并同时兼容 OpenAI-compatible 与 Anthropic message 格式。

#### 5. 桌面产品发布链

当前缺少：

- installer
- electron-builder / forge
- Windows code signing
- auto updater
- GitHub Release workflow

进入外部用户测试前必须补齐。

#### 6. RAG 升级

当前关键词 RAG 对小型个人资料库足够，后续可逐步升级：

- chunk 索引
- embedding
- hybrid retrieval
- rerank
- source citation schema

升级时应保留当前可解释 fallback。

### P2 — 产品一致性

#### 7. 清理未消费 Settings

仍需决定“实现还是移除 UI”：

- `requireTerminalConfirmation`
- `autoSummarizeSessionNote`
- `autoUpdateLearningProfile`
- `remindersEnabled`

#### 8. 修正文案超前

仍需继续核对：

- Library 把规则摘要描述成“AI 智能分析”的文案
- Library 关于练习自动更新学习画像的文案
- 其它“AI / 自动化 / 隐私”描述是否与真实能力一致

---

## 已在 2026-08-21 完成的稳定化工作

- ✅ 补 GitHub Actions Windows CI
- ✅ 发现并解决 pnpm 10 阻止 Electron / esbuild postinstall 导致 CI smoke 失败的问题；当前 CI 固定 pnpm 9.15.9
- ✅ Electron API Key 使用 `safeStorage` 系统级加密，兼容旧明文 secret 自动迁移
- ✅ Electron smoke 增加真实 secret round-trip / 密文检查
- ✅ `searchCacheHours` 正式接入 Resource Agent
- ✅ Resource Agent 只缓存成功在线结果，本地资料融合保持实时
- ✅ 删除无引用旧 `storage/types.ts`
- ✅ 去掉 Study 空状态“数学定理”学科硬编码
- ✅ 合并 Notes Markdown / Settings Switch / EmptyState / Onboarding VARK UI polish
- ✅ 修复 Reports 练习完成双计数；completion event 作为新数据真源，旧 practiceSets 仅作兼容 fallback

---

## 建议后续开发顺序

```text
1. 拆 useStudySession，收敛会话状态
2. 补正式单元 / 集成 / E2E 测试
3. 设计 SQLite schema 与 localStorage migration
4. 清理未消费 Settings 与超前产品文案
5. 完成 Windows installer / signing / Release
6. 正式实现 contextWindowRounds 多轮上下文
7. 再升级 Resource Agent / RAG / Agent 工具体系
```

当前不建议继续大规模增加页面。

**最重要的是把已经存在的能力变成稳定、可测试、可迁移、可发布的产品。**

---

## 信息架构

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
5. **任何核心状态重构都必须先补可验证边界。**
6. **新增功能前优先修正确性、迁移、测试和发布能力。**
