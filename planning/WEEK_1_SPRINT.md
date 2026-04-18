# 栖知 第一周冲刺计划

> 版本 v0.2 · Tauri 桌面应用路线
> 更新：从 Next.js Web 改为 Tauri，调整每日任务

---

## 一、本周总目标

**周末时，能在桌面打开一个真正能用的「栖知 Demo」桌面应用，包含：**
- ✅ Tauri + React + SQLite 工程跑起来
- ✅ macOS 窗口框架 + 毛玻璃侧栏 + 完整布局
- ✅ Onboarding 学习风格测试可完成 + 画像存本地
- ✅ 看板首页能展示
- ✅ 学习空间（三栏布局）骨架完成
- ✅ AI 对话能流式聊起来
- ✅ 暗黑模式跟随系统

**不追求**：完整功能、所有边界情况、出题/RAG 等高级功能
**追求**：核心闭环跑通 + 桌面应用真正"活起来"

---

## 二、Day 0（开干前一晚）· 环境准备 ⚠️ 必做

如果环境没准备好，Day 1 一天就废了。

**任务清单**：
- [ ] 装 Rust（rustup）
- [ ] 装 pnpm（如果还没装）
- [ ] 装 Tauri 前置（macOS: xcode-select；Windows: WebView2）
- [ ] 验证：`cargo --version` 和 `pnpm --version` 都能跑
- [ ] 注册 Anthropic API key（或确认已有）
- [ ] 本地装一个 SQLite 客户端（DB Browser for SQLite）便于查表

**预估时间**：1-2 小时

---

## 三、每日计划

### 📅 Day 1（周一）· Tauri 工程奠基

**目标**：能 `pnpm tauri dev` 启动一个空白的栖知桌面 App

**任务清单**：
- [ ] `pnpm create tauri-app` 创建项目（React + TS + Vite 模板）
- [ ] 集成 Tailwind CSS + shadcn/ui 初始化
- [ ] 装 Lucide React + Framer Motion + 基础依赖
- [ ] 装 Google Fonts（Cormorant Garamond + Noto Serif SC）
- [ ] 配置 React Router 6
- [ ] 实现 macOS 窗口框架组件 `<QzWindow>`：
  - 自定义标题栏（红黄绿三圆点 - macOS 用 `decorations: false`）
  - 标题文字
  - 主题切换按钮
- [ ] 实现毛玻璃侧栏组件 `<QzSidebar>`（Tauri 的 vibrancy 效果，macOS 专属）
- [ ] 7 个空路由页面（dashboard / study / goals / library / graph / notes / settings）
- [ ] 侧栏菜单可跳转
- [ ] 暗黑模式（Tailwind dark: + 跟随系统 prefers-color-scheme）
- [ ] Git 仓库 + 初始 commit

**产出物**：
```
pnpm tauri dev → 一个空壳的栖知桌面应用，能切换 7 个空白页
```

**预估时间**：6-8 小时

**关键风险**：
- ⚠️ 如果 macOS 毛玻璃效果搞不定，先用 `bg-white/60 backdrop-blur` 凑合，后期再优化
- ⚠️ `decorations: false` 后窗口不能拖动，需要给标题栏加 `data-tauri-drag-region`

---

### 📅 Day 2（周二）· SQLite + 数据层

**目标**：本地数据库通了，能存能读

**任务清单**：
- [ ] 装 `@tauri-apps/plugin-sql` + Drizzle
- [ ] Drizzle schema 初版（按 TECH_STACK.md 中的数据模型）
- [ ] 应用启动时初始化 SQLite 数据库（在用户 app data 目录）
- [ ] 写 migration，创建所有表
- [ ] 写一个 seed 脚本，插入测试数据（一个 user + 几个 goal）
- [ ] 写 `lib/db/queries.ts`，封装常用查询
- [ ] 在 dashboard 页面读取并显示一个测试数据，验证链路通

**产出物**：
```
打开应用 → dashboard 显示从 SQLite 读出的测试数据
```

**预估时间**：5-6 小时

**关键风险**：
- ⚠️ Tauri SQL plugin 在 Win/Mac 表现可能有差异，先在主开发机跑通

---

### 📅 Day 3（周三）· Onboarding 学习风格测试

**目标**：用户能完成测试，画像存进 SQLite

**任务清单**：
- [ ] Onboarding 流程组件（欢迎 → 测试 → 结果 3 步）
- [ ] **不要侧栏，全屏沉浸**（用一个独立的窗口风格）
- [ ] 进度条组件
- [ ] VARK 16 题题库 + 计分
- [ ] Felder-Silverman 12 题简版
- [ ] Grit 8 题
- [ ] 题目卡片组件（点击选项有反馈动画）
- [ ] 结果页：
  - SVG 雷达图（VARK 4 维度）
  - 调用 Claude 生成个性化解读（流式）
  - 4 张推荐策略小卡
- [ ] 写入 `learning_profile` 表
- [ ] 完成后跳转 dashboard
- [ ] 路由守卫：检测画像是否存在，没有就强制走 onboarding

**产出物**：
```
首次启动应用 → 5-8 分钟测试 → 看到自己的「学习风格画像」 → 进入主界面
```

**预估时间**：7-8 小时

---

### 📅 Day 4（周四）· 看板首页（重头戏 1）

**目标**：把视觉规范里的看板做出来，体现 macOS 桌面感 + 栖知 DNA

**任务清单**：
- [ ] 顶部问候卡（按时间切换问候语 + streak + 格言）
- [ ] 今日任务卡（先 mock 3 条任务）
- [ ] 学习节奏曲线（Recharts，30 天 mock 数据）
- [ ] 知识图谱缩略图（D3 力导向 mini 版，10 节点）
- [ ] 本周成就卡（3 个渐变徽章）
- [ ] 复习提醒卡（mock 2 条）
- [ ] 浮动「灵」入口（仅 UI，不接逻辑）
- [ ] 手绘叶子 SVG 装饰散落
- [ ] 字体混搭（Cormorant + Noto Serif SC）
- [ ] 微动效（卡片进入 fade + slide）
- [ ] 暗黑模式适配

**产出物**：
```
/dashboard → 打开就让人 wow 的桌面应用首屏
```

**预估时间**：8-10 小时（这天可能加班）

---

### 📅 Day 5（周五）· 学习空间 + AI 对话（重头戏 2）⭐

**目标**：核心王牌页跑起来，能流式聊天，支持"换种讲法"

**任务清单**：
- [ ] 学习空间三栏布局
  - 左栏：当前学习计划树（可展开/收起）
  - 中栏：AI 对话区
  - 右栏：番茄钟 + 当前位置 + 临时笔记 + AI 资源（4 个面板垂直堆叠）
- [ ] 对话气泡组件（用户 / 灵）
- [ ] 「灵」头像 SVG 符号
- [ ] 集成 Vercel AI SDK + Claude 3.5 Sonnet
- [ ] 流式响应（streaming）
- [ ] 系统提示词 v1（包含用户学习风格画像）
- [ ] 4 个快捷按钮（换种讲法 / 更深入 / 我懂了 / 跳过）
- [ ] 教学风格切换下拉
- [ ] Markdown 渲染（react-markdown + KaTeX）
- [ ] 番茄钟（圆形 SVG 进度环 + 暂停/跳过）
- [ ] 临时笔记（自动保存到 `note` 表）
- [ ] 对话历史保存到 `study_session` + `message` 表

**产出物**：
```
学习空间 → 能完整流式聊一个知识点
点"换种讲法" → 用不同方式重讲
番茄钟能跑
```

**预估时间**：8-10 小时

---

### 📅 Day 6（周六）· 其他页面骨架

**目标**：goals / library / graph / notes / settings 都至少有可看的骨架

**任务清单**：
- [ ] goals.tsx：3 张目标卡 + 树状里程碑展开（mock 数据）
- [ ] library.tsx：上传按钮 + 资料卡片网格（先不接真实上传）
- [ ] graph.tsx：D3 力导向图（25-30 节点 mock）+ 选中详情面板
- [ ] notes.tsx：左中右三栏（笔记列表 + 内容 + AI 提取）
- [ ] settings.tsx：学习画像可视化（从 SQLite 读真实数据）+ 偏好设置
- [ ] 所有页面顶栏 + 侧栏一致
- [ ] 所有页面暗黑模式适配

**产出物**：
```
所有 7 个核心页都能打开看
真实可用：dashboard / study（部分）/ settings 学习画像
mock 状态：goals / library / graph / notes
```

**预估时间**：7-8 小时

---

### 📅 Day 7（周日）· 联调 / 打磨 / 打包

**目标**：把所有东西串起来，跑一遍完整流程，打出可安装的 .dmg / .msi

**任务清单**：
- [ ] 完整流程走查：首启 → 测试 → 看板 → 学习空间 → 聊天 → 设置看画像
- [ ] Bug 修复
- [ ] 视觉细节打磨（间距、字号、阴影）
- [ ] 加载状态、空状态、错误状态
- [ ] 系统通知集成（番茄钟结束）
- [ ] 全局快捷键（Cmd+Space 唤起灵）
- [ ] `pnpm tauri build` 打包
- [ ] 在另一台机器测试安装
- [ ] README 更新
- [ ] 录一个 3-5 分钟 Demo 视频

**产出物**：
```
一个能完整体验的 .dmg / .msi 安装包 + Demo 视频
```

**预估时间**：6-8 小时

---

## 四、本周不做的事（重要）

❌ 资料上传 + RAG（Day 6 只做骨架，下周做真实）
❌ 出题功能
❌ 知识图谱真实数据（用 mock）
❌ 遗忘曲线算法
❌ 情绪感知
❌ 多模型路由（先用 Claude 一个）
❌ 用户多账号
❌ 云同步
❌ Windows / Linux 适配（先 macOS）

---

## 五、风险预案

| 风险 | 概率 | 应对 |
|---|---|---|
| Tauri 环境配置卡住 | 高 | Day 0 必须搞定，不行就先用 Tauri 模板跑 hello world |
| macOS 毛玻璃效果做不出 | 中 | 用 `bg-white/60 backdrop-blur-xl` 凑合 |
| sqlite-vec 集成失败 | 高 | 本周不做 RAG，所以不影响 |
| AI 流式响应踩坑 | 中 | 直接用 Vercel AI SDK 官方示例改 |
| 看板视觉做不出预期 | 高 | Day 4 提前对照原型 HTML 实现 |
| 时间不够 | 高 | 砍 Day 6（其他页面骨架），优先保 1-5 |

---

## 六、每日仪式

### 每天开工前
- 看一眼当天目标
- 列三件最重要的事

### 每天收工前
- 勾选完成的任务
- 写一句话总结今天进展
- 标记明天第一件事
- **必须 commit 一次**（哪怕只改了一行）

---

## 七、下周预告（Week 2）

- 资料上传完整链路（PDF 解析 + 向量化 + RAG）
- 基于资料 AI 出题
- 学习目标聊天式拆解（生成计划）
- 进度追踪真实化（streak 算法）
- 复习提醒（艾宾浩斯曲线）
- 知识图谱真实数据接入

---

## 八、给主人的话

主人，这一周计划安排得**不算轻松**，但也**没逼到死**。每天 6-10 小时，对你来说重点是：

1. **每天必须 commit 一次**，哪怕只是改个标点。这是对抗摆烂最有效的武器。
2. **遇到卡住超过 1 小时**，立刻喊我，别自己死磕。Tauri 环境问题尤其要早问。
3. **Day 4 的看板 + Day 5 的学习空间** 是这周最关键的两天，做好了项目就立起来了。
4. **Day 7 录 Demo** 是给自己的奖励，看到成品的瞬间会觉得这周值。

不用追求完美，追求**做完**。完美是下周的事。

走起。
