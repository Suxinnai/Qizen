# Qizen App

Qizen 桌面应用主工程（`Tauri + React + TypeScript + Vite`）。

## 当前进度（2026-04-28）

### 已完成
- 桌面骨架、路由、侧栏标题栏已完成。
- Onboarding 学习画像测试已完成。
- Dashboard / Goals / Notes / Settings 基础页已可用。
- Library 已支持 PDF / DOCX / Markdown / TXT 解析。
- Graph 已支持节点详情、相关节点、关联资料展示。
- Study 核心重构 Sprint 0 + Sprint 1 第一阶段已完成：
  - 意图识别、RAG 策略、输出清洗、回复策略均已抽为独立模块。
  - 关键组件已拆分：StudyEmptyState / MessageBody / StrategyBar / RagEvidenceCard / PracticePanel。
  - 新建会话干净、闲聊不触发 RAG、弱证据不展示、think 清洗已接入。
  - 学习会话列表、切换会话、标题生成已可用。
- 真实 LLM API（OpenAI-compatible / Anthropic）已接入，含 fallback。
- 学习记录埋点已开始。
- Profile & Reports 页面已接入路由与侧栏。
- Settings 已重组并标记"已接入/规划中/本地保存"状态。

### 待继续
- Study 右侧面板完整拆分 + 会话状态机正式化。
- API key 安全存储。
- Agent 化学习体验。
- Reports 升级为完整图表。
- 自适应出题、学习路径规划、长期记忆。

## 本地开发

```powershell
cd G:\alma\workspace\qizhi\app
pnpm install
pnpm tauri dev
```

## 常用命令

```powershell
pnpm dev        # 只启动 Vite 前端
pnpm build      # 构建前端（tsc + vite build）
pnpm tsc --noEmit  # 仅类型检查
pnpm tauri dev  # 启动桌面开发模式
pnpm tauri build
```

## 提醒

如果 `pnpm tauri dev` 报 `Error: Port 1420 is already in use`，说明旧 Vite / Tauri 进程未退出，先结束再重试。
