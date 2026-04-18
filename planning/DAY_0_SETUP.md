# 栖知 Day 0 · 环境准备

> 版本 v1.0 · 2026-04-17 · 已验证完成 ✅

---

## 一、环境清单（已就绪）

主人这台机器（Windows 11）的环境状态：

| 工具 | 版本 | 状态 |
|---|---|---|
| Rust | 1.95.0 | ✅ 已装 |
| Cargo | 1.95.0 | ✅ 已装 |
| Node.js | v22.19.0 | ✅ 已装 |
| pnpm | 10.16.0 | ✅ 已装 |
| Git | 2.47.1 | ✅ 已装 |
| WebView2 | 148.0 | ✅ Win11 自带 |
| Visual Studio 生成工具 2026 | 18.5.0 | ✅ 已装（含 C++ 桌面开发） |

**安装位置**：
- Rust 工具链：`C:\Users\20766\.cargo\bin\`
- pnpm 全局目录：`C:\Users\20766\AppData\Roaming\npm\`

---

## 二、验证命令（开 Day 1 前再跑一次）

打开 **Windows Terminal** 或 **cmd**（不要用 Git Bash，部分命令在 Git Bash 子环境里会有 PATH 问题）：

```powershell
rustc --version       # 应输出 rustc 1.95.x
cargo --version       # 应输出 cargo 1.95.x
node --version        # 应输出 v22.19.x
pnpm --version        # 应输出 10.16.x
git --version         # 应输出 git version 2.47.x
```

如果某个命令找不到 → 重启电脑再试。

---

## 三、AI API Key 准备

栖知用 **Claude 3.5 Sonnet** 做主教学模型，需要 Anthropic API Key。

### 获取方式

1. 访问 https://console.anthropic.com/
2. 注册 / 登录
3. 进入 **API Keys**，创建一个新 key
4. **复制保存**（key 只显示一次）

### Key 暂存方案

Day 1 开始前，把 key 临时保存到一个本地文本文件（比如桌面 `qizhi-keys.txt`），**不要 commit 到 git**。

后续在 Day 5 集成 AI 对话时，会在应用设置里输入，存到系统 keychain。

### 备用方案

如果暂时没有 Anthropic key，可用 **OpenAI key**（Day 5 加一个模型适配层）。
- 或临时用 OpenRouter（https://openrouter.ai）一个 key 调多个模型

---

## 四、可选工具（推荐装）

这些不是必需，但能让开发体验好很多：

### 1. VSCode 插件
- **rust-analyzer** —— Rust 代码智能补全
- **Tauri** —— Tauri 项目支持
- **Tailwind CSS IntelliSense** —— Tailwind 类名补全
- **ESLint** + **Prettier** —— 代码风格
- **Error Lens** —— 错误内联显示

### 2. SQLite 客户端
- **DB Browser for SQLite** —— https://sqlitebrowser.org/
- 用于直接打开和查看本地数据库文件

### 3. API 调试
- **Bruno**（推荐）或 **Postman** —— 测试 AI API 调用

---

## 五、Day 1 开干前的"傻瓜启动清单"

第二天起来，按这个顺序操作：

### 1. 验证环境（30 秒）
```powershell
rustc --version
node --version
pnpm --version
```
都有输出 → 继续

### 2. 进入项目目录
```powershell
cd G:\alma\workspace\qizhi
```

### 3. 创建 Tauri 应用
```powershell
pnpm create tauri-app
```
按提示填写：
- Project name: `app`
- Identifier: `com.qizhi.app`
- Frontend language: **TypeScript / JavaScript**
- Add a UI template: **React** (with TypeScript)
- Package manager: **pnpm**

### 4. 安装依赖 + 启动
```powershell
cd app
pnpm install
pnpm tauri dev
```

第一次启动 Tauri 会编译 Rust 代码，**需要 5-10 分钟**（耐心等）。
之后每次启动都很快（增量编译）。

成功后会弹出一个空白桌面应用窗口 → ✅ 可以正式开始 Day 1 的剩余任务了

---

## 六、可能遇到的坑 & 解决方案

### 坑 1：第一次 `pnpm tauri dev` 编译特别慢
**正常现象**。Rust 第一次编译要下载 + 编译 200+ 依赖，5-10 分钟正常。
之后每次启动只需几秒。

### 坑 2：编译报错"link.exe not found"
说明 Visual Studio 生成工具没装好或没勾选 C++ 桌面开发。
**解决**：重新打开 Visual Studio Installer，确保勾选了"使用 C++ 的桌面开发"。

### 坑 3：WebView2 没装
Win11 自带，Win10 可能要手动装：
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### 坑 4：pnpm 命令在 Git Bash 里行为怪
**用 cmd 或 PowerShell 跑**，不要用 Git Bash 子环境。

### 坑 5：网络慢导致 cargo 下依赖卡住
配置国内镜像（在 `C:\Users\20766\.cargo\config.toml` 创建）：
```toml
[source.crates-io]
replace-with = 'rsproxy-sparse'

[source.rsproxy]
registry = "https://rsproxy.cn/crates.io-index"

[source.rsproxy-sparse]
registry = "sparse+https://rsproxy.cn/index/"

[registries.rsproxy]
index = "https://rsproxy.cn/crates.io-index"
```

### 坑 6：pnpm 下包慢
配置淘宝镜像：
```powershell
pnpm config set registry https://registry.npmmirror.com
```

---

## 七、备用资源

- Tauri 官方文档：https://tauri.app/v2/guides/
- Rust 中文社区：https://rustcc.cn/
- shadcn/ui 文档：https://ui.shadcn.com/
- Drizzle ORM 文档：https://orm.drizzle.team/

---

## ✅ 主人，你现在的状态

环境**完全准备好了**。可以随时开 Day 1。

**建议**：今天就到这吧，明天精神好的时候开 Day 1。
**或者**现在就跑一次 `pnpm create tauri-app` 试试水（5 分钟），证明工具链通了，然后再正式开。
