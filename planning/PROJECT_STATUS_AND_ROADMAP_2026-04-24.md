# 栖知项目进度与路线重规划

> 日期：2026-04-24  
> 状态：开发止血与重规划  
> 结论：当前项目已经进入“必须先稳定学习空间状态机，再继续扩功能”的阶段。

---

## 1. 当前总体判断

项目已经完成了可用原型的很多模块，但最近学习空间的开发出现了明显失控迹象：

- 单文件持续膨胀。
- 多个状态来源互相覆盖。
- 会话持久化、标题生成、RAG、面板自动化混在一起。
- 历史测试数据污染 UI。
- “新建会话”“证据展示”“身份问题”这些基础语义没有稳定。

因此当前阶段不能继续盲目加 Agent、自动笔记、番茄钟等功能。

**当前正确策略：先止血，再重构，再补闭环。**

---

## 2. 当前真实进度

### 2.1 已经具备的基础能力

| 模块 | 状态 | 说明 |
|---|---|---|
| 桌面应用框架 | 已完成 | React + Tauri + Vite + Tailwind |
| 左侧导航 | 已完成雏形 | 支持菜单/会话列表切换 |
| 学习空间 | 可用但不稳定 | 核心页面存在职责过重问题 |
| 资料库 | 可用雏形 | 支持上传、解析、摘要、重点、预览 |
| RAG | 可用但策略需收紧 | 当前存在误命中风险 |
| LLM 配置 | 可用雏形 | 支持 provider 配置与 fallback |
| 知识图谱 | 可用雏形 | 支持节点与资料关联 |
| 笔记 | 基础可用 | 可编辑，可进入学习空间 |
| 设置 | 基础可用 | 已有模型/自动化/记忆数据分组 |
| 目标 | 基础可用 | 可从任务进入学习空间 |

### 2.2 当前高风险问题

| 编号 | 问题 | 影响 | 优先级 |
|---|---|---|---|
| R1 | 新建会话不干净 | 用户无法信任上下文 | P0 |
| R2 | `<think>` 泄漏 | 直接破坏产品可信度 | P0 |
| R3 | 闲聊触发 RAG | 错误资料会污染回答 | P0 |
| R4 | Study.tsx 过大 | 后续修改极易回归 | P1 |
| R5 | 历史 localStorage 脏数据 | 修完代码后旧数据仍可能显示异常 | P1 |
| R6 | 面板自动打开规则混乱 | 用户不理解“后面的是什么” | P1 |
| R7 | 学习完成状态推进过轻率 | “我懂了”可能误标记 | P2 |

---

## 3. 立即止血计划（P0）

### 3.1 干净会话

目标：点击 “+” 后，新学习空间必须为空白。

验收标准：
- 中间区域只显示空状态。
- 无 assistant 消息。
- 无策略按钮。
- 右侧面板关闭。
- 左侧新会话不出现 `<think>` 标题。

涉及文件：
- `app/src/routes/Study.tsx`
- `app/src/components/Sidebar.tsx`
- `app/src/lib/studyConversations.ts`

### 3.2 输出清洗

目标：任何模型输出进入 UI 或存储前都必须清洗。

验收标准：
- 标题不显示 `<think>`。
- 侧栏不显示 `<think>`。
- assistant 正文不显示 `<think>`。
- 未闭合 `<think>` 也能兜底清理。

涉及文件：
- `app/src/lib/llm.ts`
- `app/src/lib/studyConversations.ts`
- `app/src/routes/Study.tsx`

### 3.3 RAG 门控

目标：非学习问题不触发 RAG，弱证据不展示。

验收标准：
- “你是谁？”不展示 RAG 证据卡。
- “你能做什么？”不打开资料面板。
- 弱相关资料不作为证据卡显示。
- 只有强相关才展示 RAG 证据。

涉及文件：
- `app/src/routes/Study.tsx`
- 后续应迁移到 `app/src/lib/study/rag-policy.ts`

---

## 4. 第一阶段重构计划（P1）

### 4.1 拆分 Study.tsx

当前 `Study.tsx` 不应继续膨胀。

目标拆分：

```text
app/src/routes/Study.tsx
app/src/components/study/StudyEmptyState.tsx
app/src/components/study/MessageList.tsx
app/src/components/study/MessageBody.tsx
app/src/components/study/StudyInput.tsx
app/src/components/study/RightToolDock.tsx
app/src/components/study/panels/ResourcePanel.tsx
app/src/components/study/panels/GraphPanel.tsx
app/src/components/study/panels/NotePanel.tsx
app/src/components/study/panels/PomodoroPanel.tsx
app/src/lib/study/intent.ts
app/src/lib/study/session-policy.ts
app/src/lib/study/rag-policy.ts
app/src/lib/study/sanitize.ts
```

验收标准：
- `Study.tsx` 控制在 250 行以内。
- RAG 策略不写在 JSX 文件里。
- 新会话、上下文会话、历史会话各自路径清楚。
- 组件拆分后 `pnpm tsc --noEmit` 通过。

### 4.2 会话状态机

定义明确状态：

```text
empty-free
contextual-ready
chatting
loading
error
```

状态规则：
- `empty-free` 不允许自动插入消息。
- `contextual-ready` 可以显示上下文提示，但不等于已经有对话。
- `chatting` 才持久化消息。
- `loading` 禁止重复发送。
- `error` 允许重试。

### 4.3 历史数据迁移

需要对本地历史会话做一次读取时迁移：
- 清洗标题。
- 清洗消息。
- 删除只有默认欢迎语的“伪会话”或标记为空。
- 补版本字段。

---

## 5. 第二阶段学习闭环（P2）

前提：P0/P1 完成后再做。

### 5.1 资料学习闭环

- 上传资料。
- 解析摘要和重点。
- 从资料进入 Study。
- 提问命中资料。
- 展示证据。
- 生成练习。
- 练习结果写入学习记录。

### 5.2 目标学习闭环

- 从目标任务进入 Study。
- 学习完成后点击“我懂了”。
- 前两次直接接受。
- 第三次同知识点触发轻量验证。
- 通过后推进任务/节点。

### 5.3 笔记闭环

- 从会话整理笔记。
- 笔记可回到 Study 复习。
- 笔记能关联资料和节点。

---

## 6. 第三阶段 Agent 化（P3）

当前不建议马上做完整 Agent 层。

原因：
- 前端状态机还不稳定。
- RAG 策略还没收敛。
- 工具调用边界还不清楚。

待 P0/P1/P2 稳定后再接：
- 学习规划 Agent。
- 资料搜集 Agent。
- 评估 Agent。
- 笔记整理 Agent。

---

## 7. 开发纪律

从现在开始必须执行：

1. **先写策略，再写 UI。**
2. **Study 不再继续塞业务逻辑。**
3. **任何模型输出进 UI 前必须清洗。**
4. **任何 RAG 证据展示必须有强相关门槛。**
5. **每轮改动必须跑 `pnpm tsc --noEmit`。**
6. **涉及 UI 状态必须说明空态、加载态、错误态。**
7. **本地历史数据污染要有迁移策略，不能假装不存在。**

---

## 8. 建议执行顺序

### Sprint 0：止血

- 修干净新会话。
- 修 `<think>` 清洗。
- 修 RAG 闲聊误触发。
- 清理历史脏会话读取。
- 保证 build 通过。

### Sprint 1：Study 重构

- 拆 MessageList / StudyInput / ToolDock / Panels。
- 抽 intent / rag-policy / sanitize。
- 建立会话状态机。

### Sprint 2：数据流闭环

- Library → Study 强化。
- Goal → Study 强化。
- Note → Study 强化。
- Graph → Study 强化。

### Sprint 3：评估与画像

- “我懂了”验证策略。
- 测验结果写入学习记录。
- 画像增量更新。

---

## 9. 执行进度更新（2026-04-24 20:32）

### 已完成

- Sprint 0 止血已完成：干净新会话、`<think>` 清洗、RAG 闲聊门控、历史会话读取清洗均已接入。
- Sprint 1 第一阶段已完成：已抽出 `intent`、`rag-policy`、`sanitize`、`reply-policy`，并拆出 `StudyEmptyState`、`MessageBody`、`StrategyBar`、`RagEvidenceCard`、`PracticePanel`。
- Sprint 2 可落地入口已完成：Goals / Library / Notes / Graph 到 Study 的 route state 上下文入口已存在，Study 写回任务和笔记时限定当前上下文。
- Sprint 3 产品骨架已完成：新增 `Profile` 和 `Reports` 页面，并接入路由、侧栏与 Dashboard 轻入口。
- Sprint 4 设置梳理已完成一版：Settings 增加已接入 / 规划中 / 本地保存状态标记，危险操作改为禁用说明，避免假执行。

### 仍需后续继续

- `Study.tsx` 仍有约 1200 行，右侧复杂 panels 尚未完全拆分，这是下一轮重构重点。
- 真实安全 Keychain、真实搜索 API、完整 Agent 化、Reports 深度图表仍未做。
- 当前数据层仍为 localStorage，后续需要正式迁移策略。

### 最新验证

- `pnpm tsc --noEmit` 已通过。
- `pnpm build` 已通过，仅保留 Vite 大 chunk 警告。

---

## 10. 当前结论

项目不是失败了，是进入了原型转产品时最容易混乱的阶段。

现在要停止继续“凭感觉加功能”，改成：

**先保证学习空间可信、干净、可维护，再继续做智能化。**
