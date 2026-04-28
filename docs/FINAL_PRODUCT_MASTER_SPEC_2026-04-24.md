# 栖知最终产品总控文档

> 版本：v1.0-control  
> 日期：2026-04-24  
> 角色视角：产品经理 / 交互设计 / 技术落地联合审视  
> 状态：当前项目重整后的唯一总控基线  
> 适用范围：产品定义、模块职责、设计规则、学习逻辑、AI 行为、设置系统、进度规划

---

## 0. 总结结论

当前栖知已经不是“从零开始”的项目，而是一个**可用原型已经搭起来，但产品边界、学习逻辑、状态管理和文档体系开始失控**的项目。

现在最大风险不是功能少，而是：

1. **学习空间语义不稳定**：新建会话不干净、默认消息污染、右侧面板误弹。
2. **AI 可信度不足**：`<think>` 泄漏、RAG 误命中、弱相关证据被展示。
3. **模块关系混乱**：资料库、目标、图谱、笔记都能进入 Study，但上下文模型未稳定。
4. **产品层缺口明显**：个人中心、学习报告、通知中心、数据管理、资料权限分组未开发。
5. **设置页看似完整，但大量开关只是本地字段或半接线状态。**
6. **Study.tsx 过大，已经成为技术债中心。**

因此，项目下一阶段的正确策略是：

> **停止继续堆功能 → 先完成 P0 止血 → 重构学习空间 → 再恢复学习闭环开发。**

---

## 1. 产品定位

### 1.1 一句话定义

**栖知是一个面向个人长期学习的 AI 学习工作台，以资料、目标、知识图谱、笔记和学习记录为核心，帮助用户完成理解、练习、复习和路径推进。**

### 1.2 栖知不是

- 不是普通 AI 聊天窗口。
- 不是单纯 PDF 管理器。
- 不是题库平台。
- 不是只做番茄钟的效率工具。
- 不是所有问题都强行查资料的 RAG demo。

### 1.3 栖知必须是

- 有明确学习上下文的 AI 学习空间。
- 能区分闲聊、学习、资料追问、测验、工具操作的学习助手。
- 证据可信、来源清楚、弱相关不冒充依据。
- 能把资料、目标、图谱、笔记、练习串成闭环。
- 长期能沉淀学习画像、薄弱点、掌握进度和复习计划。

---

## 2. 当前代码与页面现状

### 2.1 当前已存在路由

当前 `app/src/App.tsx` 已存在：

| 页面 | 路由 | 状态 | 评价 |
|---|---|---|---|
| Onboarding | `/onboarding` | 已有 | 学习画像基础可用 |
| Dashboard | `/dashboard` | 已有 | 仍偏展示型，数据闭环弱 |
| Study | `/study` | 已有 | 核心但混乱，必须重构 |
| Goals | `/goals` | 已有 | 基础目标结构可用，缺少完整规划/暂停/放弃 |
| Library | `/library` | 已有 | 上传解析可用，缺权限/分组/原文定位 |
| Graph | `/graph` | 已有 | 节点展示可用，缺真实掌握度驱动 |
| Notes | `/notes` | 已有 | 基础编辑可用，缺整理、关联、版本管理 |
| Settings | `/settings` | 已有 | 字段较多，但部分是半成品配置 |

### 2.2 当前缺失页面

| 页面 | 优先级 | 必要性 |
|---|---|---|
| 个人中心 Profile | P1 | 用户身份、头像、画像摘要、学习总览需要统一入口 |
| 学习报告 Reports | P1 | 学习记录现在有埋点但没有消费界面 |
| 通知中心 Notifications | P2 | 当前有提醒入口但无真实通知管理 |
| 数据管理 Data Center | P1 | 清理画像、清理会话、导出数据、重置资料必须有安全入口 |
| Agent/自动化任务中心 | P3 | 后台标题、笔记整理、画像更新需要可见状态 |

---

## 3. 当前主要问题总表

### 3.1 P0 级问题：必须先修

| 编号 | 问题 | 现象 | 影响 | 处理原则 |
|---|---|---|---|---|
| P0-1 | 新建会话不干净 | 新会话自动出现助手消息/策略按钮 | 用户不信任上下文 | 新会话必须 messages=[] |
| P0-2 | 右侧面板误弹 | 空白会话出现图谱面板 | 用户困惑“后面的是什么” | 空白会话 activePanel=null |
| P0-3 | `<think>` 泄漏 | 标题/侧栏出现模型思考 | 严重破坏产品感 | 所有模型输出入库前清洗 |
| P0-4 | RAG 误命中 | “你是谁？”命中数据结构资料 | AI 可信度崩坏 | 闲聊/身份问题禁止 RAG |
| P0-5 | 弱证据展示 | 回答说无依据但下面展示证据卡 | 前后矛盾 | 只有 strong evidence 展示证据卡 |
| P0-6 | 历史脏数据残留 | 修代码后旧会话仍污染 UI | 用户以为没修好 | 读取时迁移/清洗 localStorage |

### 3.2 P1 级问题：影响可维护性

| 编号 | 问题 | 说明 |
|---|---|---|
| P1-1 | `Study.tsx` 过大 | UI、状态、RAG、会话、面板、练习混在一个文件 |
| P1-2 | 会话状态机缺失 | empty/context/chat/loading/error 没有清晰边界 |
| P1-3 | 设置页半接线 | 有些开关只是字段，实际行为未完整绑定 |
| P1-4 | 数据流无总线 | Goals/Library/Graph/Notes 到 Study 靠 route state 拼接 |
| P1-5 | 任务推进过轻率 | “我懂了”直接完成任务，缺验证策略 |
| P1-6 | API key 存储不安全 | 当前仍在本地前端存储，后续需要 Tauri secure storage |

### 3.3 P2 级问题：影响产品完整度

| 编号 | 问题 | 说明 |
|---|---|---|
| P2-1 | 个人中心缺失 | 没有用户资料、头像、画像总览入口 |
| P2-2 | 学习报告缺失 | 已记录学习事件，但无可视化报告 |
| P2-3 | 通知中心缺失 | 有提醒概念，但无提醒管理 |
| P2-4 | 资料分组缺失 | RAG 无法限定学科/文件夹/标签范围 |
| P2-5 | 笔记体系薄弱 | 缺 AI 整理、标签、关联节点、版本历史 |
| P2-6 | 图谱状态不真实 | 节点 mastered/current/next 仍偏静态 |

---

## 4. 最终信息架构

```text
栖知 Qizen
├─ 首启 Onboarding
│  └─ 学习画像初始化
│
├─ Dashboard 看板
│  ├─ 今日学习计划
│  ├─ 最近学习进度
│  ├─ 待复习提醒
│  └─ 学习报告入口
│
├─ Study 学习空间（核心）
│  ├─ 自由学习会话
│  ├─ 带资料会话
│  ├─ 带目标会话
│  ├─ 带笔记会话
│  ├─ 带图谱节点会话
│  ├─ RAG 证据
│  ├─ 练习/测验
│  ├─ 番茄钟
│  └─ AI 笔记
│
├─ Goals 我的目标
│  ├─ 目标列表
│  ├─ 阶段 Milestone
│  ├─ 任务 Task
│  ├─ 暂停/放弃/跳过
│  └─ 进入 Study
│
├─ Library 资料库
│  ├─ 上传资料
│  ├─ 文件夹/标签/学科分组
│  ├─ 解析摘要
│  ├─ 原文预览/定位
│  ├─ 关联知识节点
│  └─ 进入 Study
│
├─ Graph 知识图谱
│  ├─ 节点关系
│  ├─ 前置依赖
│  ├─ 掌握状态
│  ├─ 关联资料
│  └─ 进入 Study
│
├─ Notes 笔记
│  ├─ 用户笔记
│  ├─ AI 整理笔记
│  ├─ 标签/节点/资料关联
│  ├─ 导出
│  └─ 进入 Study
│
├─ Reports 学习报告（新增）
│  ├─ 学习时长
│  ├─ 问答记录
│  ├─ 资料命中率
│  ├─ fallback 率
│  ├─ 掌握节点
│  └─ 薄弱点
│
├─ Profile 个人中心（新增）
│  ├─ 头像/昵称
│  ├─ 学习画像摘要
│  ├─ 学习偏好
│  ├─ 学习统计
│  └─ 数据管理入口
│
├─ Notifications 通知中心（新增）
│  ├─ 复习提醒
│  ├─ 番茄钟结束
│  ├─ 计划推送
│  └─ 系统通知
│
└─ Settings 设置
   ├─ 模型与 API
   ├─ 自动化行为
   ├─ 记忆与数据
   ├─ 安全与权限
   └─ 危险操作
```

---

## 5. 各模块最终职责与验收标准

### 5.1 Study 学习空间

#### 职责

Study 是学习执行区，负责当前会话、问答、证据、练习、工具面板。

#### 必须支持的会话类型

| 类型 | 上下文 | 初始行为 |
|---|---|---|
| 自由会话 | 无 | 空白，不插入消息，不开面板 |
| 资料会话 | `resourceId` | 显示资料上下文，可开资料面板 |
| 图谱会话 | `nodeId` | 显示节点上下文，可开图谱面板 |
| 目标会话 | `taskId` | 绑定任务，不默认开图谱 |
| 笔记会话 | `noteId` | 显示笔记上下文，不默认 RAG |

#### P0 验收

- 新建会话后 `messages.length === 0`。
- 新建会话后 `activePanel === null`。
- 首屏只显示空状态 + 输入框。
- 首问后才生成标题。
- 任何标题不含 `<think>`。
- “你是谁？”不展示 RAG 证据。

---

### 5.2 AI 回答系统

#### 回答前流程

```text
用户输入
→ normalize
→ intent classify
→ context resolve
→ rag decision
→ model/fallback decision
→ sanitize output
→ render
→ persist
```

#### 意图类型

| 类型 | 是否 RAG | 是否展示证据 |
|---|---|---|
| 闲聊/身份 | 否 | 否 |
| 学习解释 | 是 | 强相关才展示 |
| 资料追问 | 是，限定当前资料 | 强相关才展示 |
| 练习测验 | 需要当前节点/资料 | 展示题目证据 |
| 工具操作 | 否 | 否 |

#### 输出治理

必须清理：
- `<think>` 完整标签。
- 未闭合 `<think>` 后续文本。
- 标题中的 Markdown。
- 空泛系统话术。

禁止：
- 将弱相关 RAG 称为依据。
- 回答说“无资料依据”但展示证据卡。
- 闲聊问题强行套学习资料。

---

### 5.3 Library 资料库

#### 当前问题

- 资料上传解析已有，但缺文件夹/标签范围检索。
- RAG 不能明确限定“当前学科/当前文件夹”。
- 原文定位能力不足。
- 没有资料删除、重命名、移动、重新解析。

#### 最终要求

- 资料支持学科、文件夹、标签。
- RAG 支持 filter：`courseId / folderId / tag / resourceId / nodeId`。
- 证据卡可跳回原文片段。
- 支持删除、重命名、重新解析。
- 支持解析状态和失败重试。

---

### 5.4 Goals 我的目标

#### 当前问题

- 只有目标/阶段/任务展示。
- task 状态只有 done，不够表达暂停、跳过、进行中。
- “我懂了”直接完成任务，缺验证。

#### 最终状态模型

```text
not_started
in_progress
paused
skipped
mastered
needs_review
abandoned
```

#### 推进策略

- 用户第一次点“我懂了”：接受。
- 同知识点短期内多次点“我懂了”：触发轻量验证。
- 验证通过后才能标记 mastered。
- 未通过进入 needs_review。

---

### 5.5 Graph 知识图谱

#### 当前问题

- 节点状态偏静态。
- Study 的推进没有可靠写回 Graph。
- 图谱面板有时误弹。

#### 最终要求

- 节点状态由学习记录、测验结果、用户确认共同驱动。
- 每个节点可关联资料、笔记、练习、目标任务。
- Graph 进入 Study 时明确绑定 nodeId。
- 空白会话不自动打开 Graph。

---

### 5.6 Notes 笔记

#### 当前问题

- 基础编辑可用。
- AI 整理还不是完整流程。
- 缺标签、关联资料、关联节点、版本历史。

#### 最终要求

- 手动笔记与 AI 整理笔记区分来源。
- 笔记支持 tags、resourceIds、nodeIds。
- 会话结束后可生成结构化笔记草稿，用户确认后保存。
- 笔记可进入 Study 复习。

---

### 5.7 Settings 设置

#### 当前问题

- 页面分组已有，但很多开关只是字段或半接线。
- API Key 仍在 localStorage，安全性不足。
- 危险操作没有真正确认流。
- 模型配置没有区分主模型/Agent 模型/标题模型的真实行为。

#### 最终分组

##### 模型与 API

- 主对话模型。
- Agent/后台任务模型。
- 标题生成模型。
- 搜索 API。
- API Key 安全存储。
- 连接测试。

##### 自动化行为

- AI 自动启动番茄钟。
- AI 自动写入笔记。
- 会话结束生成标题。
- 会话结束整理笔记。
- 学习画像自动更新。
- run_terminal 始终确认。

##### 记忆与数据

- 上下文保留轮数。
- RAG 阈值。
- 搜索缓存时长。
- 清除会话历史。
- 清除学习画像。
- 导出数据。
- 重置全部本地数据。

##### 安全与权限

- 终端沙箱策略。
- 文件访问范围。
- API Key 存储方式。
- 本地数据位置。

---

### 5.8 Profile 个人中心（必须新增）

#### 为什么必须有

当前“用户是谁”散落在 Onboarding、Settings、侧栏底部，没有正式个人中心。学习产品必须有用户身份和学习画像总览入口。

#### MVP 内容

- 头像。
- 昵称。
- 学习画像摘要。
- 当前学习偏好。
- 学习统计入口。
- 数据管理入口。

---

### 5.9 Reports 学习报告（必须新增）

#### 为什么必须有

当前已有 `studyRecord.events`，但没有消费这些记录的页面，导致学习闭环断掉。

#### MVP 指标

- 今日提问数。
- 学习分钟数。
- 资料命中次数。
- fallback 次数。
- 练习生成次数。
- 最近薄弱点。
- 已掌握节点。

---

### 5.10 Notifications 通知中心（后置新增）

#### MVP 内容

- 复习提醒。
- 番茄钟结束提醒。
- 今日计划提醒。
- 系统配置提醒。

---

## 6. 数据模型补齐

### 6.1 Conversation

```ts
interface StudyConversation {
  id: string;
  title: string;
  mode: "free" | "resource" | "node" | "task" | "note";
  context: StudyContext | null;
  messages: StudyMessage[];
  status: "empty" | "chatting" | "loading" | "error";
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 StudyContext

```ts
interface StudyContext {
  source: "library" | "graph" | "goal" | "note" | "free";
  resourceId?: string;
  nodeId?: string;
  taskId?: string;
  noteId?: string;
}
```

### 6.3 Evidence

```ts
interface EvidenceResult {
  sourceId: string;
  sourceTitle: string;
  score: number;
  strength: "strong" | "medium" | "weak";
  snippet: string;
  highlights: string[];
  canDisplayAsEvidence: boolean;
}
```

### 6.4 UserProfile

```ts
interface UserLearningProfile {
  stable: {
    learningStyle: string;
    teachingPreference: string;
    pacePreference: string;
  };
  dynamic: {
    masteredNodeIds: string[];
    weakPoints: string[];
    effectiveExamples: string[];
    focusDurationStats: number[];
  };
}
```

---

## 7. 技术重构要求

### 7.1 Study 拆分

当前 `Study.tsx` 必须拆分。

目标结构：

```text
app/src/routes/Study.tsx
app/src/components/study/StudyEmptyState.tsx
app/src/components/study/StudyHeader.tsx
app/src/components/study/MessageList.tsx
app/src/components/study/MessageBody.tsx
app/src/components/study/StudyInput.tsx
app/src/components/study/StrategyBar.tsx
app/src/components/study/RightToolDock.tsx
app/src/components/study/panels/PomodoroPanel.tsx
app/src/components/study/panels/ResourcePanel.tsx
app/src/components/study/panels/NotePanel.tsx
app/src/components/study/panels/GraphPanel.tsx
app/src/lib/study/intent.ts
app/src/lib/study/rag-policy.ts
app/src/lib/study/session-policy.ts
app/src/lib/study/sanitize.ts
app/src/lib/study/title.ts
```

### 7.2 不允许继续做的事

- 不允许继续把业务逻辑塞进 `Study.tsx`。
- 不允许没有意图识别就 RAG。
- 不允许弱相关证据出现在证据卡。
- 不允许没有状态机就继续加 Agent。
- 不允许设置页开关只展示不接行为。

---

## 8. 最终路线图

### Sprint 0：止血与数据清理（必须先做）

目标：恢复学习空间可信度。

任务：
1. 新建会话彻底空白。
2. 所有历史会话读取时清洗 `<think>`。
3. 删除/隐藏只有默认欢迎语的伪会话。
4. 闲聊/身份问题禁止 RAG。
5. 弱相关证据不显示。
6. 右侧面板只在明确上下文或用户点击时打开。

验收：
- 新建会话无 assistant 消息。
- 问“你是谁？”无 RAG 卡。
- 侧栏无 `<think>`。
- `pnpm tsc --noEmit` 通过。
- `pnpm build` 通过。

### Sprint 1：Study 架构重构

目标：让学习空间可维护。

任务：
1. 拆分 Study 组件。
2. 抽 intent/rag-policy/sanitize/session-policy。
3. 建立会话状态机。
4. 面板独立组件化。
5. 消息渲染统一。

验收：
- `Study.tsx` 小于 250 行。
- 每个 panel 独立文件。
- 策略逻辑不在 JSX 内。
- 新增单元测试或最小策略测试。

### Sprint 2：模块数据流闭环

目标：让各板块不是孤岛。

任务：
1. Library → Study：资料上下文完整传入。
2. Goals → Study：任务上下文完整传入。
3. Notes → Study：笔记上下文完整传入。
4. Graph → Study：节点上下文完整传入。
5. Study → Goals/Graph/Notes：学习结果可写回。

验收：
- 每个入口进入 Study 后标题、上下文、面板行为正确。
- “我懂了”只影响当前 task/node。
- 笔记整理不会覆盖用户原笔记。

### Sprint 3：Profile + Reports

目标：补产品骨架。

任务：
1. 新增 Profile 路由。
2. 新增 Reports 路由。
3. Dashboard 接入学习报告摘要。
4. Settings 增加数据管理入口。

验收：
- 用户能看到自己的学习画像与统计。
- 学习记录不再只是埋点。

### Sprint 4：设置与安全

目标：让设置页从“看起来有”变成“真的能控”。

任务：
1. API Key 迁移到安全存储方案。
2. 自动化开关全部接行为。
3. 危险操作二次确认。
4. 数据导出/清理。
5. run_terminal 沙箱策略明确。

验收：
- 每个设置项都有真实行为或标记为“未接入”。
- 危险操作不可误触。

### Sprint 5：Agent 化与长期学习

前提：Sprint 0-4 完成。

任务：
1. 学习规划 Agent。
2. 资料搜集 Agent。
3. 评估 Agent。
4. 笔记整理 Agent。
5. 学习画像异步更新。

---

## 9. 统一验收清单

任何后续版本必须满足：

- [ ] 新建会话为空白。
- [ ] 闲聊不触发 RAG。
- [ ] 弱证据不展示。
- [ ] `<think>` 不进入 UI/标题/侧栏/存储。
- [ ] 右侧面板不误弹。
- [ ] 设置项不是假开关。
- [ ] Study 不继续膨胀。
- [ ] 个人中心和报告中心纳入正式 IA。
- [ ] `pnpm tsc --noEmit` 通过。
- [ ] `pnpm build` 通过。

---

## 10. 最终产品原则

1. **干净上下文优先于自动化。**
2. **可信证据优先于“看起来聪明”。**
3. **少做假功能，多做闭环。**
4. **先稳定 Study，再接 Agent。**
5. **每个模块必须有入口、出口、状态和验收。**
6. **用户能看懂系统为什么这么回答。**
7. **产品文档必须反映真实状态，不许粉饰。**

---

## 11. 当前最终结论

栖知当前不是要推倒重来，而是需要一次严肃的产品化整理。

最短路径是：

```text
Sprint 0 止血
→ Sprint 1 Study 重构
→ Sprint 2 数据流闭环
→ Sprint 3 Profile/Reports 补骨架
→ Sprint 4 设置与安全
→ Sprint 5 Agent 化
```

只要按这个顺序做，项目还能稳住；如果继续在当前 `Study.tsx` 上乱加功能，后面一定会继续出现“新会话不干净”“证据乱跳”“设置是假开关”这种问题。

所以从今天开始，栖知进入产品化整理期。
