# 栖知 Qizen 技术栈与项目结构

> 版本 v0.3 · 2026-04-20
> 更新：按当前真实代码状态同步，不再把“计划采用”写成“已经落地”

---

## 一、当前真实技术栈

### 1. 桌面端基础
| 层 | 当前技术 | 状态 |
|---|---|---|
| 桌面框架 | `Tauri 2` | ✅ 已落地 |
| 前端框架 | `React 19` | ✅ 已落地 |
| 语言 | `TypeScript` | ✅ 已落地 |
| 路由 | `react-router-dom` | ✅ 已落地 |
| 构建工具 | `Vite` | ✅ 已落地 |
| 包管理 | `pnpm` | ✅ 已落地 |

### 2. UI 与交互
| 层 | 当前技术 | 状态 |
|---|---|---|
| 样式 | `Tailwind CSS` | ✅ 已落地 |
| 动画 | `Framer Motion` | ✅ 已落地 |
| 图标 | `Lucide React` | ✅ 已落地 |
| 组件体系 | 自定义组件 + Tailwind | ✅ 已落地 |
| `shadcn/ui` | 暂未接入 | ❌ 未落地 |

### 3. 资料解析
| 能力 | 当前技术 | 状态 |
|---|---|---|
| PDF 解析 | `pdfjs-dist` | ✅ 已落地 |
| DOCX 解析 | `mammoth` | ✅ 已落地 |
| Markdown / TXT | 浏览器文本读取 | ✅ 已落地 |
| 图片 OCR | 暂未接入 | ❌ 未落地 |

### 4. 数据与存储
| 层 | 当前方案 | 状态 |
|---|---|---|
| 主数据存储 | `localStorage` | ✅ 已落地 |
| 数据封装 | `app/src/lib/storage.ts` | ✅ 已落地 |
| SQLite | 后续规划 | ❌ 未落地 |
| Drizzle ORM | 后续规划 | ❌ 未落地 |
| 向量数据库 | 当前未接入 | ❌ 未落地 |

### 5. AI 与检索
| 能力 | 当前方案 | 状态 |
|---|---|---|
| 本地 RAG | `app/src/lib/rag.ts` 启发式检索 | ✅ 已落地 |
| 真实模型接入 | OpenAI-compatible / Anthropic | ✅ 已落地 |
| fallback 回答 | 本地回答兜底 | ✅ 已落地 |
| 长期记忆 | 暂未接入 | ❌ 未落地 |
| 自适应出题 | 暂未完成 | ❌ 未落地 |

---

## 二、当前目录结构

```text
qizhi/
├─ README.md
├─ docs/
│  ├─ PRD.md
│  ├─ INFORMATION_ARCHITECTURE.md
│  └─ TECH_STACK.md
├─ design/
│  ├─ DASHBOARD_DESIGN.md
│  └─ VISUAL_SPEC.md
├─ planning/
│  ├─ DAY_0_SETUP.md
│  └─ WEEK_1_SPRINT.md
└─ app/
   ├─ package.json
   ├─ src/
   │  ├─ App.tsx
   │  ├─ App.css
   │  ├─ components/
   │  │  ├─ Layout.tsx
   │  │  ├─ Sidebar.tsx
   │  │  ├─ TitleBar.tsx
   │  │  └─ icons/
   │  ├─ routes/
   │  │  ├─ Dashboard.tsx
   │  │  ├─ Goals.tsx
   │  │  ├─ Graph.tsx
   │  │  ├─ Library.tsx
   │  │  ├─ Notes.tsx
   │  │  ├─ Onboarding.tsx
   │  │  ├─ Settings.tsx
   │  │  └─ Study.tsx
   │  └─ lib/
   │     ├─ library-parser.ts
   │     ├─ llm.ts
   │     ├─ rag.ts
   │     └─ storage.ts
   └─ src-tauri/
```

---

## 三、关键模块说明

### `app/src/lib/storage.ts`
当前项目的核心本地数据层，负责：
- 学习画像
- 目标 / milestone / task
- 笔记
- 资料库条目
- 知识图谱
- 设置项
- 学习记录

### `app/src/lib/library-parser.ts`
负责资料解析与结构化输出，当前支持：
- PDF
- DOCX
- Markdown
- TXT

### `app/src/lib/rag.ts`
当前 RAG 方案不是向量检索，而是 **启发式文本检索与打分**，会结合：
- 关键词命中
- 同义词扩展
- 当前资料加权
- 当前节点加权
- 摘要 / 重点 / 正文片段匹配

### `app/src/lib/llm.ts`
负责真实模型接入与 fallback：
- OpenAI-compatible
- Anthropic Claude
- 连接测试
- 回答失败后的兜底逻辑

---

## 四、当前真实产品链路

```text
用户上传资料
→ 解析文本 / 摘要 / 重点
→ 存入本地数据
→ 与知识节点关联
→ 进入 Study 提问
→ 本地 RAG 检索命中资料
→ 调用真实 LLM 回答
→ 展示证据卡
→ 基于命中资料生成练习题
→ 记录学习交互事件
```

---

## 五、当前未落地但仍在规划中的技术项

以下内容仍然是规划，不应再被文档描述为“已经使用”：

- `SQLite + Drizzle`
- 向量数据库 / embedding 检索
- 图片 OCR
- 安全密钥存储（Tauri keychain / secure storage）
- 长期记忆系统
- 自适应推荐 / 自适应出题

---

## 六、下一阶段推荐技术演进

### 第一阶段
- 继续用当前本地数据层把业务逻辑补完整
- 做学习记录可视化
- 做自适应出题的规则层

### 第二阶段
- 把 LLM API key 从前端本地存储迁移到更安全的存储方案
- 给 Study / Report / Profile 提供更清晰的数据结构

### 第三阶段
- 评估引入 `SQLite + Drizzle`
- 评估从启发式 RAG 升级到 embedding 检索

---

## 七、结论

当前技术栈的关键词不是“很先进”，而是：

**已经能跑、已经能用、已经有真实学习链路，但还没有进入正式数据层与长期记忆阶段。**

这才是栖知现在最准确的技术状态。
