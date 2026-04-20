# 栖知 Qizen

> 栖息于知识之中 —— 一个真正“懂你”的 AI 私人学习导师桌面应用

## 项目介绍

Qizen 不是题库，不是网课，也不是给聊天模型套一层学习皮。
它的目标是：**把用户自己的资料、知识图谱、学习记录和真实大模型能力结合起来，做成一个能长期陪伴、能解释、能检索、能出题、能追踪进度的 AI 学习产品。**

当前项目以桌面端为主，技术栈是 `Tauri 2 + React 19 + TypeScript + Vite`，前端数据层目前以轻量本地存储为主，后续会继续补更完整的数据层、长期记忆与产品模块。

## 命名说明

- 中文名：`栖知`
- 英文名：`Qizen`

> 当前本地目录仍叫 `qizhi/`，这是工作目录名，不影响产品命名。

---

## 当前开发进度（2026-04-20）

### 已完成 / 已有可用原型的部分

#### 1. 桌面应用骨架
- `Tauri + React + TypeScript + Tailwind` 桌面应用骨架已跑通
- 路由结构、基础布局、页面导航已可用

#### 2. Onboarding 学习画像
- 首启学习风格测试已完成
- 支持生成并本地保存学习画像
- 已能展示主学习偏好、次学习偏好与推荐策略

#### 3. Dashboard / Goals / Notes / Settings 基础页
- Dashboard 看板已接本地数据
- Goals 目标页已具备基础目标 / milestone / task 展示
- Notes 笔记页已支持查看与编辑
- Settings 已支持偏好设置与学习画像展示

#### 4. Library 资料库
- 已支持上传并解析：
  - PDF
  - DOCX
  - Markdown / TXT
- 已支持：
  - 摘要提取
  - 重点提取
  - 正文预览
  - 基础练习生成
- 资料已可关联知识图谱节点
- 已支持从资料库带着资料进入学习空间

#### 5. Graph 知识图谱
- 已有独立图谱页
- 支持点击节点查看详情
- 支持展示相关节点
- 支持展示关联资料
- 支持从图谱进入学习空间
- 已修复资料库 / 图谱白屏问题

#### 6. Study 学习空间
- 已有对话式学习界面
- 已支持从资料库 / 图谱带上下文进入
- 已接入本地 RAG 检索
- 已展示证据卡：
  - 命中资料
  - 命中片段
  - 命中重点
  - 命中原因
- 已支持基于命中资料出题
- 已支持每道题证据回链

#### 7. 真实 LLM API 接入
- 已支持配置：
  - OpenAI-compatible provider
  - Anthropic Claude provider
- 学习空间当前链路：
  - 先本地 RAG 检索
  - 再调用真实模型回答
  - 失败时自动 fallback 到本地回答
- 已在 Settings 中支持：
  - provider
  - base URL
  - model
  - api key
  - 测试连接

#### 8. 学习记录埋点（MVP）
- 已开始记录最小学习交互事件，包含：
  - 用户问题
  - 命中资料
  - 当前节点 / 资料上下文
  - 是否使用真实模型
  - 是否 fallback
  - 是否生成练习题
- Settings / Study 已有轻量交互次数展示

---

## 当前仍待完善 / 待实现的部分

### A. 学习核心还未完成的能力
- 根据用户水平自适应出题
- 学习路径规划推荐
- 学习记录可视化与学习报告中心
- 长期记忆系统（常错点、连续学习状态、偏好强化）
- 更安全的 API key 存储（当前仍是本地存储 MVP）

### B. 产品层待开发模块
- 个人中心
- 自定义头像
- 个人资料展示与编辑
- 学习报告中心
- 提醒 / 通知中心
- 成就 / 激励系统
- 数据导出 / 清理
- 多设备同步 / 账号体系（后期）

### C. 资料与图谱后续增强
- 资料搜索高亮
- 原文定位跳转
- 图片 OCR
- 节点掌握度动态更新
- 图谱驱动的学习路径展示

---

## 推荐的后续开发顺序

### 第一优先级：把学习核心做扎实
1. 自适应出题
2. 学习记录可视化
3. 路径规划推荐

### 第二优先级：补产品骨架
4. 个人中心
5. 自定义头像
6. 学习报告中心

### 第三优先级：补产品完整度
7. 通知提醒中心
8. 成就 / 激励系统
9. 数据导出 / 清理

### 第四优先级：高级能力
10. 长期记忆升级
11. 更安全的密钥存储
12. 同步 / 账号体系

---

## 技术路线

- 桌面壳层：`Tauri 2`
- 前端：`React 19 + TypeScript + Vite`
- UI：`Tailwind CSS + Framer Motion + Lucide React`
- 文档解析：`pdfjs-dist + mammoth`
- 当前数据层：轻量本地存储（MVP）
- 规划数据层：后续可升级到更完整的本地数据库方案（如 `SQLite + Drizzle`）

---

## 当前信息架构

```text
Qizen（桌面应用）
├─ 首启 · 学习风格测试（已完成）
├─ 看板 Dashboard（已完成 MVP）
├─ 学习空间 Study（已完成核心原型）
├─ 我的目标 Goals（已完成基础版）
├─ 资料库 Library（已完成核心原型）
├─ 知识图谱 Graph（已完成核心原型）
├─ 笔记 Notes（已完成基础版）
├─ 设置 Settings（已完成增强版）
├─ 个人中心 Profile（待开发）
├─ 学习报告 Reports（待开发）
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

---

由 灵 与 主人沐灵 一起，把它慢慢养成真正的作品。
