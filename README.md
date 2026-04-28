# 栖知 Qizen

> 栖息于知识之中 —— 围绕个人资料、目标、图谱、笔记和学习记录构建的 AI 私人学习工作台

## 项目介绍

Qizen 不是题库，不是网课，也不是给聊天模型套一层学习皮。
它的目标是：**把用户自己的资料、知识图谱、学习记录和真实大模型能力结合起来，做成一个能长期陪伴、能解释、能出题、能追踪进度的 AI 学习产品。**

当前以桌面端为主，技术栈 `Tauri 2 + React 19 + TypeScript + Vite`。项目已经进入"产品化整理期"：先保证学习空间可信、干净、可维护，再继续扩展 Agent 与长期学习能力。

## 命名说明

- 中文名：`栖知`
- 英文名：`Qizen`
- 当前本地目录仍叫 `qizhi/`，仅工作目录名，不影响产品命名。

---

## 当前开发进度（2026-04-28）

### 已完成 / 已有可运行原型

#### 1. 桌面应用骨架
- `Tauri + React + TypeScript + Tailwind` 骨架已跑通。
- 路由结构、基础布局、侧栏导航、自定义标题栏已可用。

#### 2. Onboarding 学习画像
- 首启学习风格测试已完成。
- 生成并本地保存学习画像，可展示主偏好、次偏好与推荐策略。

#### 3. Dashboard / Goals / Notes / Settings
- Dashboard 看板接本地数据，有学习报告入口。
- Goals 有 goals / milestones / tasks 层级展示，可带 task 进入学习空间。
- Notes 可查看编辑，可带 note 进入学习空间。
- Settings 重组为：模型与 API / 自动化行为 / 记忆与数据，标记"已接入 / 规划中 / 本地保存"。

#### 4. Library 资料库
- 支持上传解析：PDF / DOCX / Markdown / TXT。
- 支持摘要提取、重点提取、正文预览、基础练习生成。
- 资料可关联知识图谱节点，可从资料库带 resourceId/nodeId 进入学习空间。

#### 5. Graph 知识图谱
- 独立图谱页，点击节点查看详情、相关节点、关联资料。
- 支持从图谱带 nodeId 进入学习空间。

#### 6. Study 学习空间（核心重构线程）
- **Sprint 0 止血已完成**：
  - 新建会话是干净空状态。
  - 闲聊/身份问题不触发 RAG。
  - 弱相关资料不展示为证据。
  - `<think>` / 未闭合标签在标题、正文、持久化读取时统一清洗。
  - 历史会话恢复不再带入默认脏消息。
- **Sprint 1 重构第一阶段已完成**：
  - 抽出策略层：`intent.ts` / `rag-policy.ts` / `sanitize.ts` / `reply-policy.ts`。
  - 抽出组件：`StudyEmptyState` / `MessageBody` / `StrategyBar` / `RagEvidenceCard` / `PracticePanel`。
  - `Study.tsx` 从单文件巨型组件降为约 1200 行（仍需继续拆分右侧面板）。
- 学习会话列表、新建/切换会话、AI/规则标题生成均已可用。
- 从资料库/图谱/目标/笔记带上下文进入链路完整。

#### 7. 真实 LLM API 接入
- 支持 OpenAI-compatible 与 Anthropic Claude。
- 学习链路：意图识别 → 必要时 RAG → 真实模型 → fallback 本地回答。
- Settings 已支持：provider / base URL / model / API key / 测试连接。

#### 8. 学习记录与报告
- 记录最小交互事件：问题、命中资料、上下文、模型使用、fallback、练习生成。
- 新增 Reports 学习报告 MVP 页面：今日提问、交互总数、资料命中、fallback、练习生成、最近问题与命中资料。
- 新增 Profile 个人中心：学习画像、统计数据、快捷入口。

#### 9. 产品骨架
- Profile & Reports 页面已接入路由、侧栏、Dashboard 轻入口。
- 路线图与总控文档：`planning/PROJECT_STATUS_AND_ROADMAP_2026-04-24.md`
- 产品设计文档：`design/PRODUCT_DESIGN.md`、`docs/FINAL_PRODUCT_MASTER_SPEC_2026-04-24.md`

---

### 待继续完善

#### 高优先级
- `Study.tsx` 右侧复杂面板完整拆分 + 会话状态机正式化。
- API key 从 localStorage 迁移到安全存储。
- Agent 化学习体验（自动推进、多步推理）。

#### 中优先级
- Reports 从 MVP 统计升级为完整图表报告。
- 自适应出题（根据用户水平调整难度）。
- 学习路径规划推荐。
- 长期记忆系统（常错点、连续学习状态、偏好强化）。

#### 低优先级
- 个人中心完善 / 自定义头像。
- 通知提醒 / 成就系统。
- 数据导出 / 清理。
- 多设备同步 / 账号体系。

---

## 技术路线

- 桌面壳层：`Tauri 2`
- 前端：`React 19 + TypeScript + Vite`
- UI：`Tailwind CSS + Framer Motion + Lucide React`
- 文档解析：`pdfjs-dist + mammoth`
- 当前数据层：轻量本地存储（MVP）
- 规划数据层：后续可升级 `SQLite + Drizzle`

---

## 当前信息架构

```text
Qizen（桌面应用）
├─ 首启 · 学习风格测试（已完成）
├─ 看板 Dashboard（已完成 MVP）
├─ 学习空间 Study（核心重构中，Sprint 1 第一阶段完成）
├─ 我的目标 Goals（已完成基础版）
├─ 资料库 Library（已完成核心原型）
├─ 知识图谱 Graph（已完成核心原型）
├─ 笔记 Notes（已完成基础版）
├─ 学习报告 Reports（已完成 MVP）
├─ 个人中心 Profile（已完成 MVP）
├─ 设置 Settings（已完成增强版，含状态标记）
└─ 通知 / 激励 / 同步（待开发）
```

---

## 运行方式

### 开发模式
```powershell
cd G:\alma\workspace\qizhi\app
pnpm install
pnpm tauri dev
```

### 仅跑前端
```powershell
cd G:\alma\workspace\qizhi\app
pnpm dev
```

### 构建
```powershell
cd G:\alma\workspace\qizhi\app
pnpm build
```

---

## 文档索引

### 产品与设计
- [PRD](./docs/PRD.md)
- [产品总控文档](./docs/FINAL_PRODUCT_MASTER_SPEC_2026-04-24.md)
- [产品设计文档](./design/PRODUCT_DESIGN.md)
- [信息架构](./docs/INFORMATION_ARCHITECTURE.md)
- [技术栈与项目结构](./docs/TECH_STACK.md)

### 规划与进度
- [项目状态与路线图](./planning/PROJECT_STATUS_AND_ROADMAP_2026-04-24.md)
- [Week 1 冲刺归档](./planning/WEEK_1_SPRINT.md)

---

由 灵 与 主人沐灵 一起，把它慢慢养成真正的作品。
