# 栖知学习链路交付审计

更新时间：2026-05-31

## 覆盖范围

当前版本围绕以下链路交付：

1. 用户明确学习内容。
2. AI 先讨论学习方式，并生成可执行学习计划。
3. 用户确认计划后，计划写入路线进度。
4. 资源 Agent 在线查找学习资源，并融合本地资料。
5. AI 开始引导学习。
6. 番茄钟用于专注计时，并在生成练习题后自动开始计时。
7. 学习中可记笔记，助手回答选中文字后可直接保存为 AI 整理笔记。
8. 资料组件展示 AI 找到的资源、本地依据和搜索降级入口。
9. 路线组件展示当前计划进度。
10. 对话输出支持 Markdown 分块渲染、流式输出、AI 任务动画和可见思路轨迹。

## 主要实现证据

- 学习链路状态、计划确认、资源 Agent 调用、流式输出、番茄钟联动：`app/src/hooks/useStudySession.ts`
- 在线资源 Agent：`app/src/lib/webResourceAgent.ts`
- Markdown 渲染：`app/src/components/study/MessageBody.tsx`
- AI 动画、可见思路轨迹、选区记笔记：`app/src/components/study/MessageList.tsx`
- 资源面板：`app/src/components/study/panels/ResourcePanel.tsx`
- 路线进度面板：`app/src/components/study/panels/GraphPanel.tsx`
- 五步学习进度条：`app/src/routes/Study.tsx`
- 交付自检脚本：`app/scripts/check-delivery.mjs`
- 在线资源 smoke 脚本：`app/scripts/resource-agent-smoke.mjs`
- 标准交付验收脚本：`app/scripts/verify-delivery.cjs`
- 视觉 smoke 验收入口：`app/scripts/visual-smoke.cjs`、`app/electron/main.cjs`
- 生产构建分包：`app/vite.config.ts`

## 已执行验证

在 `G:\code\qizhi\app` 下执行：

```powershell
node scripts\verify-delivery.cjs
node scripts\check-delivery.mjs
node scripts\resource-agent-smoke.mjs calculus
node node_modules\typescript\bin\tsc --noEmit
node node_modules\vite\bin\vite.js build
node_modules\.bin\electron.cmd . --smoke-test
node scripts\visual-smoke.cjs
```

结果：

- 交付自检：12 项全部通过。
- 在线资源 smoke：沙箱内网络被拦截；放行网络后通过，`calculus` 查询返回 Wikipedia/中文维基百科可打开资源。
- TypeScript：通过。
- Vite 生产构建：通过；通过 `manualChunks` 拆分 React、Router、motion、PDF/DOC 解析和图标包后，应用 JS chunk 均低于 500 KB。`pdf.worker.min` 作为独立 worker 资源保留 1.24 MB。
- Electron smoke-test：通过；Windows 上出现 Chromium/OS crypt/GPU 日志，但进程退出码为 0。
- Visual smoke：脚本已接入 Electron 主进程并提供 Chrome/Edge fallback；本机执行时 Electron 分支在 `/study` 渲染阶段超时，Edge fallback 被 Chromium GPU 初始化错误阻塞，错误形态包括 `GPU process isn't usable`，未完成截图级断言。

## 已知风险

- 在线资源 Agent 依赖公开 API 和用户网络环境。Wikipedia/Wikibooks OpenSearch 已验证能返回结果；DuckDuckGo Instant Answer 对部分学习查询返回不稳定，因此仅作为补充源。离线或受限网络下会降级为可点击搜索入口。
- 当前未完成截图级可视验收；Electron 渲染分支在本机超时，系统 Edge/Chrome headless 分支在本机 Chromium GPU 初始化阶段失败。需要在可用浏览器/GPU 环境中补一次 `node scripts\visual-smoke.cjs`。
- `npm run verify:delivery` 依赖本机 npm 可用；本机 npm 缺失 `npm-cli.js`，因此当前使用 `node scripts\verify-delivery.cjs` 直接执行同一组验收。
