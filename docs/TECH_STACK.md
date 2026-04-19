# 栖知 Qizen 技术栈 & 项目结构

> 版本 v0.2 · 桌面应用路线（Tauri 直接起步）
> 更新：从 Next.js Web 改为 Tauri 桌面应用，本地优先

---

## 一、路线变更说明

### v0.1 → v0.2 重大调整

**原计划**：Next.js Web → 后期用 Tauri 打包桌面端
**新计划**：**直接 Tauri + React 桌面应用**起步

**为什么变**：
- 主人确认产品最终形态就是桌面 App
- 学习场景适合本地化、隐私优先
- 避免"先 Web 后桌面"的二次工作
- 桌面 App 视觉表现力更强（毛玻璃、原生菜单、托盘）

**代价**：
- 学习曲线略陡（需要 Rust 工具链）
- 初期环境配置多 30 分钟
- 不能直接部署到 Vercel 给人在线试用

**回报**：
- 从第一天就是真桌面应用
- 体积小（~10MB vs Electron 100MB+）
- 性能好、内存占用少
- 原生体验

---

## 二、技术选型一览

### 2.1 桌面壳层

| 层 | 技术 | 理由 |
|---|---|---|
| 桌面框架 | **Tauri 2.0** | 体积小、性能好、Rust 后端可选 |
| 前端 | **React 18 + TypeScript** | 生态最强、组件化 |
| 路由 | **React Router 6** | SPA 路由 |
| 构建 | **Vite** | Tauri 默认搭配，快 |
| 包管理 | **pnpm** | 节省磁盘 |

### 2.2 UI & 视觉

| 层 | 技术 | 理由 |
|---|---|---|
| UI 组件库 | **shadcn/ui** | 美观度天花板，源码可控 |
| 样式 | **Tailwind CSS** | 与 shadcn 无缝 |
| 动画 | **Framer Motion** | 让看板"活起来" |
| 图表 | **Recharts**（基础）+ **D3**（知识图谱）| 兼顾易用与表现力 |
| 图标 | **Lucide React** | 与 Notion / Linear 一致 |
| 字体 | Cormorant Garamond + Noto Serif SC + Inter + PingFang | 栖知 DNA 字体混搭 |

### 2.3 状态 & 数据

| 层 | 技术 | 理由 |
|---|---|---|
| 状态管理 | **Zustand** | 轻量、TS 友好、零样板 |
| 表单 | **React Hook Form + Zod** | 类型安全、性能好 |
| 数据请求 | **TanStack Query** | 缓存、重试、乐观更新 |

### 2.4 本地存储

| 层 | 技术 | 理由 |
|---|---|---|
| 主数据库 | **SQLite**（通过 `tauri-plugin-sql`）| 轻量、本地、零配置 |
| ORM | **Drizzle ORM** | 类型安全、轻量、支持 SQLite |
| 向量存储 | **sqlite-vec**（SQLite 扩展）| 资料 RAG，不用额外服务 |
| 文件存储 | **Tauri 文件系统 API** | 用户上传资料存本地 |
| 用户偏好 | **tauri-plugin-store** | 简单 KV 存储 |

### 2.5 AI 层

| 用途 | 模型 | 调用方式 |
|---|---|---|
| 教学主模型 | **Claude 3.5 Sonnet** | API 流式响应 |
| 联网搜索 / 多模态 | **GPT-4o** | API + tool use |
| 轻量任务（标题生成、摘要）| **Claude Haiku / GPT-4o-mini** | 降本 |
| Embeddings | **OpenAI text-embedding-3-small** | 资料向量化 |
| AI SDK | **Vercel AI SDK** | 流式响应统一封装 |

### 2.6 系统集成（Tauri 专属能力）

| 能力 | 说明 |
|---|---|
| 系统托盘 | 后台运行 + 快捷启动 |
| 全局快捷键 | 一键唤起「灵」对话 |
| 系统通知 | 番茄钟结束、复习提醒 |
| 文件拖拽 | 直接拖 PDF 到资料库 |
| 自动更新 | Tauri Updater |
| 深色模式 | 跟随系统 |

### 2.7 文件解析

| 类型 | 库 |
|---|---|
| PDF | `pdf-parse` |
| Word | `mammoth` |
| 图片 OCR | `tesseract.js` |
| Markdown | `unified` + `remark` |

---

## 三、为什么选这些（关键决策说明）

### 为什么 Tauri 不是 Electron？
- **体积**：Tauri ~10MB，Electron ~100MB+
- **内存**：Tauri 用系统 webview，Electron 自带 Chromium
- **性能**：启动快、运行轻
- **代价**：Rust 学习曲线，但栖知初期不需要写复杂 Rust

### 为什么 SQLite 不是 PostgreSQL？
- 桌面应用本地优先，不需要服务器数据库
- 单文件，备份/迁移简单
- `sqlite-vec` 扩展支持向量检索，一站式
- 用户数据 100% 本地，隐私无忧

### 为什么 Drizzle 不是 Prisma？
- Drizzle 更轻量，与 SQLite 兼容好
- 不需要单独的 schema 文件 + 代码生成步骤
- TypeScript-first，类型推导更自然
- Prisma 在桌面端打包稍麻烦

### 为什么双 AI 模型（Claude + GPT）？
- Claude：教学、长文本理解、推理
- GPT-4o：联网搜索、多模态、tool use
- 根据任务路由，体验最优

### 为什么 shadcn/ui？
- 代码进你的项目，不是依赖 → 完全可定制
- 与 Tailwind 无缝
- 符合栖知"Notion 极简 + macOS 桌面感"的目标

---

## 四、项目目录结构

```
qizhi/
├── README.md
├── docs/                       ← 产品文档
│   ├── PRD.md
│   ├── TECH_STACK.md          ← 你正在看
│   └── INFORMATION_ARCHITECTURE.md
├── design/
│   ├── DASHBOARD_DESIGN.md
│   └── VISUAL_SPEC.md
├── planning/
│   └── WEEK_1_SPRINT.md
├── prototype/                  ← HTML 静态原型（视觉参考）
│   ├── index.html
│   ├── onboarding.html
│   └── ...
└── app/                        ← Tauri 应用主目录
    ├── src/                    ← React 前端
    │   ├── routes/             ← React Router 页面
    │   │   ├── onboarding.tsx
    │   │   ├── dashboard.tsx
    │   │   ├── study.tsx       ⭐ 学习空间
    │   │   ├── goals.tsx
    │   │   ├── library.tsx
    │   │   ├── graph.tsx
    │   │   ├── notes.tsx
    │   │   └── settings.tsx
    │   ├── components/
    │   │   ├── ui/             ← shadcn 组件
    │   │   ├── window/         ← macOS 窗口框架（标题栏、侧栏）
    │   │   ├── dashboard/
    │   │   ├── study/          ← 学习空间专属（左中右栏组件）
    │   │   ├── chat/           ← AI 对话气泡
    │   │   ├── pomodoro/       ← 番茄钟
    │   │   ├── graph/          ← 知识图谱组件
    │   │   └── shared/
    │   ├── lib/
    │   │   ├── ai/             ← AI 模型调用封装
    │   │   ├── db/             ← Drizzle + SQLite 连接
    │   │   ├── rag/            ← RAG 流程
    │   │   ├── tauri/          ← Tauri API 封装
    │   │   └── utils.ts
    │   ├── stores/             ← Zustand stores
    │   ├── hooks/
    │   ├── styles/
    │   ├── types/
    │   ├── App.tsx
    │   └── main.tsx
    ├── src-tauri/              ← Rust 后端
    │   ├── src/
    │   │   ├── main.rs
    │   │   ├── commands/       ← Tauri commands（前端可调用的 Rust 函数）
    │   │   └── db/             ← 数据库初始化
    │   ├── tauri.conf.json     ← Tauri 配置
    │   └── Cargo.toml
    ├── drizzle/                ← Drizzle migration
    ├── public/
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── vite.config.ts
    └── .env.example
```

---

## 五、数据模型（SQLite + Drizzle）

```typescript
// drizzle/schema.ts
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';

// 用户（本地应用通常只有一个）
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  avatarPath: text('avatar_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 学习风格画像
export const learningProfile = sqliteTable('learning_profile', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),

  vark: text('vark', { mode: 'json' }),       // {visual,aural,read,kinesthetic}
  felder: text('felder', { mode: 'json' }),   // 4 维度分数
  grit: real('grit'),

  preferredStyles: text('preferred_styles', { mode: 'json' }), // 派生策略

  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 学习目标
export const goal = sqliteTable('goal', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),

  title: text('title').notNull(),
  description: text('description'),
  deadline: integer('deadline', { mode: 'timestamp' }),
  status: text('status').notNull(), // active / paused / done
  progress: real('progress').default(0),
  coverGradient: text('cover_gradient'), // 卡片封面渐变
});

export const milestone = sqliteTable('milestone', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  title: text('title').notNull(),
  weekIndex: integer('week_index'),
  done: integer('done', { mode: 'boolean' }).default(false),
});

export const task = sqliteTable('task', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  milestoneId: text('milestone_id'),

  title: text('title').notNull(),
  estimateMin: integer('estimate_min'),
  difficulty: text('difficulty'), // easy / medium / hard
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// 学习会话（用于学习空间）
export const studySession = sqliteTable('study_session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  topicNodeId: text('topic_node_id'), // 关联到知识图谱节点

  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  durationMin: integer('duration_min'),

  pomodoroCount: integer('pomodoro_count').default(0),
  messageCount: integer('message_count').default(0),
  switchStyleCount: integer('switch_style_count').default(0), // "换种讲法"次数

  summary: text('summary'),                    // AI 生成的会话总结
  feedback: text('feedback', { mode: 'json' }),// 难度/节奏/满意度
});

// 对话消息（学习空间核心）
export const message = sqliteTable('message', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  role: text('role').notNull(), // user / assistant
  content: text('content').notNull(),
  style: text('style'), // 教学风格：story / logic / analogy / steps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 上传资料
export const document = sqliteTable('document', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),

  filename: text('filename').notNull(),
  mimetype: text('mimetype'),
  localPath: text('local_path').notNull(),  // 本地文件路径
  status: text('status'), // processing / ready / failed

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const documentChunk = sqliteTable('document_chunk', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'), // sqlite-vec 向量
  metadata: text('metadata', { mode: 'json' }),
});

// 知识图谱节点
export const knowledgeNode = sqliteTable('knowledge_node', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),

  name: text('name').notNull(),
  subject: text('subject'),
  mastery: real('mastery').default(0),    // 0-1
  status: text('status'),                 // mastered / learning / weak
  importance: real('importance').default(0.5), // 节点大小

  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  nextReviewAt: integer('next_review_at', { mode: 'timestamp' }),
});

export const knowledgeEdge = sqliteTable('knowledge_edge', {
  id: text('id').primaryKey(),
  fromNodeId: text('from_node_id').notNull(),
  toNodeId: text('to_node_id').notNull(),
  relation: text('relation'), // prerequisite / related / contrast
});

// 笔记
export const note = sqliteTable('note', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  topicNodeId: text('topic_node_id'),

  title: text('title'),
  contentMd: text('content_md'),
  aiKeyPoints: text('ai_key_points'),    // AI 提取的重点
  aiConfusing: text('ai_confusing'),     // AI 标的易混淆点

  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 连续天数
export const streak = sqliteTable('streak', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastStudyDate: integer('last_study_date', { mode: 'timestamp' }),
});
```

---

## 六、关键依赖清单（package.json 预览）

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",

    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-sql": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",

    "drizzle-orm": "^0.30.0",
    "better-sqlite3": "^11.0.0",

    "ai": "^3.1.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.40.0",

    "@tanstack/react-query": "^5.40.0",
    "zustand": "^4.5.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.51.0",

    "tailwindcss": "^3.4.0",
    "framer-motion": "^11.2.0",
    "lucide-react": "^0.378.0",
    "recharts": "^2.12.0",
    "d3": "^7.9.0",

    "pdf-parse": "^1.1.1",
    "mammoth": "^1.7.0",
    "tesseract.js": "^5.1.0",
    "remark": "^15.0.0",
    "katex": "^0.16.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "vite": "^5.2.0",
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "drizzle-kit": "^0.21.0"
  }
}
```

---

## 七、环境变量

```bash
# .env.example（前端 - 通过 VITE_ 暴露）
VITE_OPENAI_API_KEY=...
VITE_ANTHROPIC_API_KEY=...

# 注意：API key 在桌面应用里可以用更安全的方案
# 比如让用户在设置里输入，存到 tauri-plugin-store（系统 keychain）
```

---

## 八、本地开发

### 前置依赖
- **Node.js** 20+
- **pnpm** 9+
- **Rust** 1.75+（Tauri 必需）
- **macOS / Windows / Linux**

### 一次性安装
```bash
# 安装 Rust（如果还没有）
# macOS / Linux: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Windows: 下载 https://www.rust-lang.org/tools/install

# 安装 Tauri 前置
# macOS: xcode-select --install
# Windows: 安装 WebView2 Runtime（Win11 自带）

# 项目依赖
pnpm install
```

### 开发
```bash
pnpm tauri dev   # 启动桌面应用（带热更新）
```

### 构建
```bash
pnpm tauri build  # 出 .dmg / .msi / .deb
```

### 数据库
```bash
pnpm drizzle-kit generate  # 生成 migration
pnpm drizzle-kit migrate   # 执行 migration
```

---

## 九、CI / CD

- **GitHub Actions**：PR 跑 lint + typecheck + test
- **Tauri 自动构建**：tag 触发，三平台同时打包
- **Tauri Updater**：客户端自动检查更新

---

## 十、Phase 路线

### Phase 1（当前）- MVP 桌面应用
- macOS 优先
- 8 个核心页面（onboarding + 7 个主页面）
- 本地优先，不需要登录

### Phase 2 - 跨平台 + 增强
- Windows / Linux 适配
- 知识图谱完整版
- 遗忘曲线复习引擎
- 情绪感知

### Phase 3 - 移动端
- React Native + Expo
- 与桌面端共享业务逻辑（共享 lib）
- 端到端加密同步

---

## 十一、关键风险点

| 风险 | 应对 |
|---|---|
| Tauri 学习曲线 | 前期 Rust 代码极少（只用 commands 暴露文件 IO），主要写 React |
| sqlite-vec 在 Tauri 里集成 | Day 1 优先验证，跑不通就用纯 JS embedding 检索（性能勉强够 MVP） |
| AI API key 安全 | 用 tauri-plugin-store 存系统 keychain，不写代码 |
| 跨平台字体渲染差异 | Cormorant + Noto Serif SC 用 Google Fonts CDN 或打包字体文件 |
