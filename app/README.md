# Qizen App

这是 `Qizen` 的桌面应用主工程（`Tauri + React + TypeScript + Vite`）。

## 项目介绍

当前 `app/` 目录承载的是 Qizen 的桌面端主应用，核心目标是把：
- 用户上传资料
- 知识图谱
- 学习空间
- 真实 LLM API
- 学习记录

这些能力整合成一个真正可用的 AI 学习产品原型。

## 当前进度（2026-04-20）

### 已完成
- 桌面应用骨架已跑通
- Onboarding 学习画像测试已完成
- Dashboard / Goals / Notes / Settings 基础页已可用
- Library 已支持 PDF / DOCX / Markdown / TXT 解析
- Graph 已支持节点详情、相关节点、关联资料展示
- Study 已支持：
  - 本地 RAG 检索
  - 证据展示
  - 基于命中资料出题
  - 每道题证据回链
  - 真实 LLM API（OpenAI-compatible / Anthropic）
  - fallback 本地回答
- Settings 已支持模型配置与测试连接
- 学习记录埋点已开始接入

### 待完善
- 自适应出题
- 学习路径规划推荐
- 学习记录可视化 / 报告中心
- 个人中心
- 自定义头像
- 通知提醒 / 成就系统
- 更安全的 API key 存储

## 本地开发

```powershell
cd G:\alma\workspace\qizhi\app
pnpm install
pnpm tauri dev
```

## 常用命令

```powershell
pnpm dev        # 只启动 Vite 前端
pnpm build      # 构建前端
pnpm tauri dev  # 启动桌面开发模式
pnpm tauri build
```

## 提醒

如果 `pnpm tauri dev` 报：

```text
Error: Port 1420 is already in use
```

说明之前的 Vite / Tauri 进程还没退出，先结束旧进程再重试。
