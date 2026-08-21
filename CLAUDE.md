# CLAUDE.md — 栖知 Qizen 工作约定

桌面端 AI 学习工作台。技术栈：Electron + React 19 + TypeScript + Vite + Tailwind。
应用代码在 `app/`，包管理用 `pnpm`。

## 构建 / 验证命令（在 `app/` 下执行）

- 单元测试：`pnpm test:unit`
  - 当前使用 Node 22 内置 `node:test` + `--experimental-strip-types`。
  - 当前 3 套 Study 测试共 28 个 test case，不额外依赖 Vitest/Jest。
- 类型检查：**`./node_modules/.bin/tsc --noEmit`**
  - ⚠️ **不要用 `npx tsc`**：本环境出现过 `npx` 误装无关包 `tsc@2.0.3`（不是 TypeScript 编译器）并返回假的 exit 0。务必走本地 bin 或 `pnpm exec tsc`。
- 生产构建：`./node_modules/.bin/vite build`
- contract 检查：`node scripts/check-delivery.mjs`
  - 这是字符串 / 契约存在性检查，**不是行为测试**。
  - 重构后若职责迁到新模块，应让 contract 跟随真实调用链，不要为了让 grep 变绿把逻辑塞回旧文件。
- 完整交付验证：`pnpm verify:delivery`
  - 顺序：contract → unit tests → TypeScript → Vite build → Electron smoke。
- 开发运行：`pnpm electron:dev`（dev server 固定端口 1420，Electron 自动 attach）。

## UI 视觉验证（无法看 GUI 时的可行办法）

Electron 无头渲染在部分环境不稳（GPU/sandbox 超时）。优先使用 **Edge headless 截图**：

1. `vite build` 生成 `dist/`。
2. 起 fixture server：`node scripts/visual-smoke.cjs --server-only`（监听 `http://127.0.0.1:18531`）。
3. Edge 截图 hash 路由：
   `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --screenshot=OUT.png --window-size=1440,1100 --virtual-time-budget=9000 "http://127.0.0.1:18531/#/study"`
4. 可替换为 `#/reports`、`#/profile` 等。
5. 完成后停止 server，删除 `.visual-smoke/`，不要提交测试产物。

## 当前架构要点

### 数据与持久化

- 主数据层：`app/src/lib/storage.ts`
  - localStorage key：`qizen:mvp:v2`
  - 含 legacy 种子清理；首启为真空状态。
- Study conversations：`app/src/lib/studyConversations.ts`
  - localStorage key：`qizen:study:conversations:v1`
  - 含 migration / sanitize / active conversation。
- API key：`app/src/lib/secretStore.ts`
  - Electron 通过主进程 IPC 写入 `userData/secrets/`。
  - 系统能力可用时使用 Electron `safeStorage`；旧明文 secret 自动迁移。
- 主学习数据下一阶段目标是 SQLite + migration；secret 不进入主学习数据库。

### Study hooks

`app/src/hooks/useStudySession.ts` 仍是学习流程总编排，但已经完成第一阶段职责拆分：

- `useStudyPomodoro.ts`
  - Pomodoro seconds/running/progress/timer effect。
- `useStudyConversationPersistence.ts`
  - active conversation id、snapshot、create/upsert、change event、hydration、自动持久化。
- `useStudyPractice.ts`
  - practice state、adaptive generation、LLM grading、自评 fallback、完成事件和 weak prompts。

`useStudySession.ts` 目前继续负责：

- 当前上下文 / 目标选择
- RAG 调用
- LLM 真流式生成
- 最近 N 轮会话历史接线
- fallback
- 学习计划
- Resource Agent
- Learning Agent
- Notes
- progress
- panel orchestration

不要为了“继续拆 Hook”而机械拆分。后续只有在测试边界建立后，再评估 Generation / Plan / Resource Agent / Progress 是否值得独立。

### 多轮上下文

`app/src/lib/study/conversation-context.ts` 已接入 `contextWindowRounds`：

- 1 轮 = 1 条 user 消息开始，到下一条 user 消息前的所有 assistant 消息。
- Settings 允许 6–20 轮，默认 10。
- 最近历史总字符预算 12,000。
- 单条超长历史消息压缩为头部 + 尾部，最多约 3,000 字符。
- 从最新消息向旧消息裁剪，不保留孤立 assistant。
- `buildContextualUserQuery()` 把历史与当前问题明确分区。

边界约定：

- RAG 检索始终使用当前原始问题，不把历史拼进检索 query。
- study event / Reports / Learner Memory 始终记录当前原始问题。
- 本地 fallback 始终使用当前原始问题。
- Learning Agent 内部步骤仍使用各自 task prompt，不默认继承普通聊天历史。
- 当前 Provider 层没有改成原生多 message history；历史通过现有 user prompt 注入。未来可单独升级。

### 策略层

`app/src/lib/study/`：

- `conversation-context.ts`
- `intent.ts`
- `rag-policy.ts`
- `reply-policy.ts`
- `session-policy.ts`
- `message-builders.ts`
- `adaptive.ts`
- `memory.ts`
- `study-helpers.ts`

当前 `node:test` 已覆盖：

- Adaptive Practice 难度边界
- intent / RAG 入口
- session status
- panel auto-open
- progress permission
- RAG strong evidence threshold
- Learner Memory streak / weak points / provider ratio
- learning topic / plan confirmation / resource intent / plan steps
- contextWindowRounds 最近 N 轮语义
- history 字符预算 / 超长消息压缩
- contextual query 历史/当前问题分区

### LLM / RAG

- LLM：`app/src/lib/llm.ts`
  - OpenAI-compatible + Anthropic
  - 真实 SSE 流式 `onToken`
- RAG：`app/src/lib/rag.ts`
  - 关键词 + CJK n-gram + IDF，非向量。
- RAG evidence policy：`app/src/lib/study/rag-policy.ts`
  - top result score ≥ 10
  - subsequent score ≥ 12
  - insufficient 时不展示 evidence。

## 编码约定（来自历史返工）

- **禁止把单一学科知识写死进通用逻辑。** 曾有微积分/中值定理硬编码污染 RAG 同义词与 fallback 回答；学科召回应来自用户资料和上下文。
- **报表/记忆类优先按需派生。** 从既有 `studyRecord` / `studyStats` 计算，不轻易新增持久字段。
- **流式核心改动要谨慎。** `sendMessage` 的真实 SSE 路径已验证；新增 Agent/工具行为优先建立独立路径和测试，不要大改已工作的 streaming core。
- **重构先守住外部 API。** 抽 Hook 时优先保持 Study route / component 的返回字段和 handler 名称不变，再逐步收敛内部实现。
- **contract 与行为测试职责分开。** contract 负责发现“关键链路是否还存在”，纯逻辑正确性应放到 `node:test`。
- **当前问题 / RAG / 历史必须分层。** 多轮历史只能增强模型连续性，不得污染检索 query、fallback query 或 event question。
- **新 Settings 不允许只做 UI。** 字段没有被业务消费时 README 必须标记“仅保存 / 未消费”。

## 当前已知技术债

- 主 AppData / conversations 仍基于 localStorage，需设计 SQLite schema 与 migration。
- `contextWindowRounds` 已接入主对话，但目前使用字符预算 + 单 user prompt 历史块；未来可升级 token budget 与 provider-native messages。
- `useStudySession` 仍承担 generation / plan / Resource Agent / Learning Agent / notes / progress 编排，但已不再包含 Pomodoro、conversation persistence、practice lifecycle。
- 目前只有纯函数行为单测；还缺 Hook integration、React component interaction、最小 E2E。
- Reports 指标、`rag.ts` 排序/boost、LLM grading JSON 防御解析、conversation migration 都需要继续补行为测试。
- Windows installer / signing / updater / GitHub Release 流程尚未建立。
- `requireTerminalConfirmation`、`autoSummarizeSessionNote`、`autoUpdateLearningProfile`、`remindersEnabled` 等 Settings 尚未完整消费。
- `app/src-tauri` 已删除；不要重新引用早期 Tauri 方案。

## 当前开发优先级

1. 扩大行为测试：`rag.ts` / conversation persistence / practice / grading。
2. 设计 SQLite schema + localStorage import migration。
3. 清理未消费 Settings 与超前文案。
4. Windows installer / signing / Release。
5. 再评估更深层 Study Hook 拆分、provider-native history 和 Agent/RAG 能力升级。
