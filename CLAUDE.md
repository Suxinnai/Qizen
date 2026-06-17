# CLAUDE.md — 栖知 Qizen 工作约定

桌面端 AI 学习工作台。技术栈：Electron + React 19 + TypeScript + Vite + Tailwind。
应用代码在 `app/`，包管理用 `pnpm`。

## 构建 / 验证命令（在 `app/` 下执行）

- 类型检查：**`./node_modules/.bin/tsc --noEmit`**
  - ⚠️ **不要用 `npx tsc`**：本环境出现过 `npx` 误装无关包 `tsc@2.0.3`（不是 TypeScript 编译器）并返回假的 exit 0 的情况。务必走本地 bin 或 `pnpm exec tsc`。
- 生产构建：`./node_modules/.bin/vite build`
- 交付检查：`node scripts/check-delivery.mjs`（注意：仅做字符串存在性 grep，**不是行为测试**，绿了不代表功能正确）
- 开发运行：`pnpm electron:dev`（dev server 固定端口 1420，Electron 自动 attach）

## UI 视觉验证（无法看 GUI 时的可行办法）

Electron 无头渲染在本机不稳（GPU/sandbox 超时）。改用 **Edge headless 截图**：

1. 先 `vite build` 生成 `dist/`。
2. 起 fixture server（注入种子数据）：`node scripts/visual-smoke.cjs --server-only`（监听 `http://127.0.0.1:18531`）。
3. Edge 截图任意路由（hash 路由）：
   `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --screenshot=OUT.png --window-size=1440,1100 --virtual-time-budget=9000 "http://127.0.0.1:18531/#/study"`
   （可换 `#/reports`、`#/profile` 等）
4. 用 Read 工具看 PNG。完事杀掉 server，删 `.visual-smoke/`（测试产物，勿提交）。

## 架构要点

- 数据层 `app/src/lib/storage.ts`：localStorage 持久化（key `qizen:mvp:v2`），含 legacy 种子清理。种子数据已全部清空（首启为真空状态）。
- 学习链路核心 `app/src/hooks/useStudySession.ts`（大 Hook）：意图识别 → RAG → LLM(真流式) → fallback 本地回答 → 记录事件。
- 策略层 `app/src/lib/study/`：intent / rag-policy / reply-policy / session-policy / message-builders / adaptive / memory。
- LLM `app/src/lib/llm.ts`：OpenAI 兼容 + Anthropic，真实 SSE 流式（`onToken`）。
- RAG `app/src/lib/rag.ts`：关键词 + CJK n-gram + IDF（非向量）。
- API key 经 `secretStore.ts` 存 Electron `userData/secrets/` 文件（非 localStorage）。

## 编码约定（来自历史返工）

- **禁止把单一学科知识写死进通用逻辑**（曾有微积分/中值定理硬编码污染 RAG 同义词与 fallback 回答）。学科召回交给"从用户资料自动派生"。
- **报表/记忆类用"按需派生"**：从既有 `studyRecord`/`studyStats` 计算，不新增持久层、不做数据迁移（见 Reports、`memory.ts`）。
- 改动流式相关逻辑要谨慎：`sendMessage` 的流式路径已验证，新功能优先走独立代码路径（如学习 Agent `streamOneAgentStep`），别重写已工作的核心。

## 已知技术债

- `useStudySession` 会话切换/水合/持久化用 9 个 ref 协调，时序脆弱，未深拆。
- `app/src-tauri` 已删除（早期 Tauri 方案遗留，曾误导）。
