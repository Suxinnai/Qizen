# 栖知 Qizen

> 栖息于知识之中 —— 一个真正“懂你”的 AI 私人学习导师桌面应用

## 命名说明

- 中文名：`栖知`
- 英文名：`Qizen`

> 从这次开始，项目文档里的英文名统一使用 `Qizen`。
> 当前本地目录仍是 `qizhi/`，这是工作目录名，后续如果你要，我可以再帮你统一重命名仓库目录与内部标识。

## 项目定位

Qizen 不是题库，不是网课，也不是把聊天模型套个学习皮。
它的目标是：**给每个学习者一个真正贴合学习风格、节奏和当前上下文的 AI 私教。**

## 当前状态（2026-04-19）

### 已完成的 MVP 能力
- `Tauri + React + TypeScript + Tailwind` 桌面应用骨架已跑通
- 首启 `Onboarding` 学习风格测试已完成，结果可本地保存
- `Dashboard` 已接本地数据，任务勾选可持久化
- `Study` 学习空间已实现核心对话工作区与学习流程 UI
- `Goals` / `Notes` / `Settings` 已从占位页升级为可用页面
- 学习画像、偏好设置、笔记、目标任务等关键数据已接本地持久化

### 当前仍是 MVP / 半成品的部分
- `Library`（资料库）仍是占位页
- `Graph`（知识图谱独立页）仍是占位页
- 学习空间中的 AI 仍以本地 mock / 规则驱动为主，未接真实教学模型
- 本地存储当前以轻量方案为主，**还没有切到 SQLite + Drizzle 正式数据层**

### 下一步优先级
1. 资料库上传与本地资料列表
2. 知识图谱真实页面与节点联动
3. 学习空间接入真实 AI 对话
4. 数据层升级到 SQLite + Drizzle

## 技术路线

- 桌面壳层：`Tauri 2`
- 前端：`React 19 + TypeScript + Vite`
- UI：`Tailwind CSS + Framer Motion + Lucide React`
- 当前数据层：轻量本地存储（MVP）
- 规划数据层：`SQLite + Drizzle`

## 当前信息架构

```text
Qizen（桌面应用）
├─ 首启 · 学习风格测试（已完成）
├─ 看板 Dashboard（已完成 MVP）
├─ 学习空间 Study（已完成 MVP）
├─ 我的目标 Goals（已完成 MVP）
├─ 资料库 Library（占位）
├─ 知识图谱 Graph（占位）
├─ 笔记 Notes（已完成 MVP）
└─ 设置 Settings（已完成 MVP）
```

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

## 文档索引

### 产品文档
- [PRD](./docs/PRD.md)
- [信息架构](./docs/INFORMATION_ARCHITECTURE.md)
- [技术栈与项目结构](./docs/TECH_STACK.md)

### 设计文档
- [看板设计方向](./design/DASHBOARD_DESIGN.md)
- [视觉规范](./design/VISUAL_SPEC.md)

### 规划与进度
- [Week 1 冲刺归档与实际进度](./planning/WEEK_1_SPRINT.md)
- [Day 0 环境准备](./planning/DAY_0_SETUP.md)

## 现状说明

如果你看到某些老文档里还出现 `Qizhi`、或仍写着“Day 1/Day 2 尚未开始”，那都是旧阶段留下来的信息。
这次已经先把最常被阅读、最容易误导的文档统一到了当前状态；其余文档我也可以继续帮你批量扫一遍。

---

由 灵 与 主人沐灵 一起把它慢慢养成真正的作品。
