# 栖知 Day 0 · 环境准备（归档）

> 状态：已完成并归档
> 更新时间：2026-04-20
> 说明：环境准备阶段已经结束，这份文档保留作历史记录和新机器初始化参考

---

## 一、这份文档现在的作用

Day 0 已经完成，所以这份文档不再表示“接下来要做什么”，而是表示：

- 当时的环境准备工作已经完成
- 以后如果换机器，可以按这里重新准备
- 当前开发应以实际仓库状态为准，而不是按 Day 0 节奏继续理解项目

---

## 二、当前已具备的开发基础

项目当前已经不是“准备创建 Tauri 工程”的状态，而是：
- 仓库已存在
- `app/` 主工程已存在
- 依赖已安装
- 项目已可本地运行与构建

### 当前常用启动方式
```powershell
cd G:\alma\workspace\qizhi\app
pnpm install
pnpm tauri dev
```

### 仅启动前端
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

## 三、当前仍然有效的环境要求

如果后面要在新机器复现环境，仍建议具备：

| 工具 | 说明 |
|---|---|
| Rust / Cargo | Tauri 构建需要 |
| Node.js | 前端依赖与构建需要 |
| pnpm | 当前包管理器 |
| Git | 仓库管理 |
| WebView2 | Windows 下 Tauri 运行需要 |
| Visual Studio C++ Build Tools | Windows 下 Rust / Tauri 构建常用依赖 |

---

## 四、现在已经过期的内容

以下叙述已经不适合继续写在“当前状态”里：
- “创建 Tauri 应用”
- “第一次启动空白窗口”
- “等 Day 1 再正式开发”
- “后续 Day 5 再集成 AI”

这些都已经是历史阶段了。

当前真实状态是：
- 应用已创建
- 页面已做出来
- 资料解析已接入
- RAG 已接入
- 真实 LLM API 已接入
- 学习记录埋点已接入

---

## 五、后续真正该关注的环境问题

接下来更值得关注的，不是“怎么创建项目”，而是：

### 1. 模型密钥安全
当前 API key 仍是本地存储 MVP 方案，后续要迁移到更安全的存储方式。

### 2. 打包与发布验证
后续需要验证：
- Windows 打包
- 安装包运行
- 首次启动体验
- 配置迁移与升级

### 3. 多格式资料与性能
后续需要观察：
- 大 PDF 解析性能
- DOCX 兼容性
- 图片 OCR 接入后的性能与体验

---

## 六、结论

Day 0 现在已经完成使命了。

它保留的意义，是告诉后来的人：
**这个项目最初怎么起步的。**

但当前开发节奏，应该完全以：
- `README.md`
- `docs/PRD.md`
- `docs/INFORMATION_ARCHITECTURE.md`
- `docs/TECH_STACK.md`

这些“当前态文档”为准。
