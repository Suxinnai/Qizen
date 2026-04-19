# Qizen App

这是 `Qizen` 的桌面应用主工程（`Tauri + React + TypeScript + Vite`）。

## 当前状态

- 已可运行桌面端 MVP
- 已完成：Onboarding、Dashboard、Study、Goals、Notes、Settings
- 未完成：Library、Graph 的真实功能页
- 数据层当前为轻量本地持久化方案，后续会升级为 `SQLite + Drizzle`

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
