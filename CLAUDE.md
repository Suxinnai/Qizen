# CLAUDE.md — 栖知 Qizen 工作约定

桌面端本地优先 AI 学习工作台。

技术栈：Electron + React 19 + TypeScript + Vite + Tailwind。应用代码在 `app/`，包管理使用 `pnpm`。

## 构建 / 验证命令

在 `app/` 下执行。

- 单元测试：`pnpm test:unit`
  - Node 22 内置 `node:test` + `--experimental-strip-types`。
  - 当前测试文件显式列在 `package.json`；不要用 shell glob，避免 Windows 差异。
- 类型检查：`pnpm exec tsc --noEmit`
  - **不要用 `npx tsc`**。历史环境曾误装无关 `tsc@2.0.3` 并返回假的 exit 0。
- 生产构建：`pnpm build`
- contract：`node scripts/check-delivery.mjs`
  - 只做关键链路存在性检查，不等于行为正确。
- 完整验证：`pnpm verify:delivery`
  - contract
  - unit tests
  - TypeScript
  - Vite production build
  - Electron smoke
  - Electron SQLite smoke
- 开发：`pnpm electron:dev`
  - Vite dev server 固定 1420。

CI：Windows + Node 22 + pnpm 9.15.9。

pnpm 10+ 会默认阻止部分 dependency build scripts；升级前必须明确处理 Electron/esbuild 安装脚本，不要直接放开所有依赖。

---

## UI 视觉验证

Electron 无头渲染在部分环境不稳定。需要视觉验证时优先：

1. `vite build`
2. `node scripts/visual-smoke.cjs --server-only`
3. Edge headless 截图 hash route，例如 `#/study`、`#/reports`
4. 检查截图
5. 清理 `.visual-smoke/`

不要提交视觉 smoke 产物。

---

## 当前数据架构

### 生产真源仍是 localStorage

主 AppData：

```text
qizen:mvp:v2
```

Study conversations：

```text
qizen:study:conversations:v1
```

现有 route / hook 大量依赖同步 `loadAppData()`，因此**不要机械把 localStorage 调用替换成 async IPC**。

### SQLite 已进入 shadow migration 阶段

核心：

```text
app/electron/db/schema-v1.sql
app/electron/database.cjs
app/electron/database-ipc.cjs
app/electron/database-read.cjs
app/electron/database-smoke.cjs

app/src/lib/persistence/sqlite-migration.ts
app/src/lib/persistence/sqlite-shadow-import.ts
app/src/lib/persistence/sqlite-shadow-verify.ts
app/src/lib/persistence/sqlite-cutover-verify.ts
```

当前已实现：

- Electron 主进程 `node:sqlite` / `DatabaseSync`；
- foreign keys + WAL；
- transaction bundle import；
- API Key defensive rejection；
- FK failure rollback；
- startup best-effort shadow import；
- SQLite domain snapshot readback；
- import → readback Electron smoke；
- legacy ↔ SQLite domain comparator；
- fresh import → snapshot → verify cutover gate。

**SQLite 还不是当前产品真源。**

Shadow import 后 localStorage 继续变化、SQLite 变旧是正常的。不能把日常 divergence 自动当作 corruption。

真正切换前必须 fresh import + snapshot + verify。

### API Key

Secret 独立于主学习数据库：

```text
secretStore.ts
→ preload IPC
→ Electron safeStorage
→ userData/secrets/
```

API Key 不允许进入 SQLite migration bundle / settings snapshot。

---

## SQLite 开发纪律

### 1. `schema-v1.sql` 已经是已发布形态

启动 shadow import 已经可能在真实用户机器创建 v1 DB。

因此：**不能再随意修改 v1 schema 并假设旧 DB 会跟着变化。**

如果需要结构变化：

- 升 schema version；
- 写显式 v1 → v2 migration；
- transaction 升级；
- 更新 schema meta；
- clean DB + existing v1 DB 都验证；
- Windows packaged app 再验证。

`CREATE TABLE IF NOT EXISTS` 不是 migration runner。

### 2. DB 只在主进程打开

Renderer 只能使用 domain IPC：

```text
qizenDatabase.status()
qizenDatabase.importBundle()
qizenDatabase.snapshot()
```

不要向 Renderer 暴露：

- sqlite 文件路径；
- raw SQL；
- statement；
- DB handle。

### 3. 不做长期双写

迁移期间允许 shadow copy。

Repository switch 后目标是：

```text
Electron → SQLite single source of truth
Browser  → localStorage fallback adapter
```

不要形成永久 localStorage + SQLite dual write。

### 4. Cutover 必须 gated

未来切换前必须满足：

```text
fresh localStorage bundle
→ transaction import
→ SQLite snapshot
→ verifySqliteShadowSnapshot
→ matches === true
```

Mismatch / import error 都必须阻止切换。

### 5. 顺序是数据语义

已有 `position` 的集合按 position。

v1 没有 position 的 legacy array 当前 readback 通过 insertion rowid 保留导入顺序。不要随意改成按 title/date/id 排序，否则切换真源后 UI/业务顺序可能改变。

---

## Study 当前架构

`app/src/hooks/useStudySession.ts` 是学习流程总编排，但第一阶段职责拆分已经完成。

独立 Hooks：

- `useStudyPomodoro.ts`
  - timer / seconds / running / progress
- `useStudyConversationPersistence.ts`
  - active conversation / snapshot / hydration / persistence
- `useStudyPractice.ts`
  - adaptive practice / answers / LLM grading / self-assessment / weak points

主 Hook 继续负责：

- Study context
- input/messages
- RAG
- real LLM streaming
- conversation history injection
- fallback
- plan
- Resource Agent
- Learning Agent
- Notes
- progress
- panel orchestration

不要为了 Hook 数量机械继续拆。先建立测试边界，再按真实耦合拆。

---

## 多轮上下文

`app/src/lib/study/conversation-context.ts`

当前语义：

- 1 轮 = user + 下一个 user 前的 assistant 消息；
- Settings 6–20，默认 10；
- 12,000 字符总预算；
- 单历史消息约 3,000 字符上限；
- 从最新向旧裁剪；
- 不保留 orphan assistant；
- 历史与当前问题明确分区。

必须保持以下边界：

- RAG 只检索当前问题；
- event / Reports / Memory 只记录当前问题；
- fallback 用当前问题；
- history 只增强真实模型连续性；
- Learning Agent 内部 task prompts 不默认混普通聊天 history。

Provider-native multi-message history 属于后续优化，不是当前缺失功能。

---

## 策略 / 测试边界

`app/src/lib/study/` 当前包括：

- conversation-context
- intent
- rag-policy
- reply-policy
- session-policy
- message-builders
- adaptive
- memory
- study-helpers

测试目录目前同时覆盖 Study 与 SQLite persistence：

```text
app/tests/study-policies.test.mjs
app/tests/study-memory-rag-builders.test.mjs
app/tests/study-conversation-context.test.mjs
app/tests/sqlite-migration.test.mjs
app/tests/sqlite-shadow-import.test.mjs
app/tests/sqlite-shadow-verify.test.mjs
app/tests/sqlite-cutover-verify.test.mjs
```

原则：

- contract 检查关键链路是否仍存在；
- `node:test` 检查输入/输出行为；
- Electron smoke 检查真实 Electron / SQLite runtime；
- 不要为了让 grep 绿而把职责塞回旧文件。

---

## 通用编码约定

- **禁止单学科硬编码。** 学科召回应来自用户资料/上下文。
- **Reports / Memory 优先按需派生。** 不轻易增加可重新计算的持久字段。
- **流式核心谨慎改。** `sendMessage` SSE 路径已有验证；Agent/工具优先独立路径。
- **重构守住外部 API。** 先不破坏 route/component handler，再迁职责。
- **Settings UI ≠ 功能实现。** 未消费字段必须在 README 标注。
- **Secret 与学习数据分层。** API Key 不进 AppData DB。
- **数据迁移必须可回滚。** 不删除旧源，直到至少一个稳定版本周期验证完成。

---

## 当前已知技术债

### 数据层

- Persistence Repository / async bootstrap 尚未建立；
- Electron 读写真源仍未切到 SQLite；
- v1 → v2 migration runner 尚未实现；
- legacy rollback 生命周期/用户级恢复 UI 尚未实现。

### 测试

仍需补：

- `rag.ts` ranking / boost；
- LLM grading JSON defensive parser；
- Study conversation migration；
- useStudyPractice integration；
- Study hydration/switch integration；
- Library parser regression；
- React interaction；
- 最小 E2E。

### 产品 / 发布

- installer / signing / updater / GitHub Release；
- `requireTerminalConfirmation`、`autoSummarizeSessionNote`、`autoUpdateLearningProfile`、`remindersEnabled` 尚未完整消费；
- Library 等少量“AI 智能”文案仍需与真实规则能力对齐。

---

## 当前开发优先级

1. **建立 Persistence Repository + Electron bootstrap。**
2. 在不删除 legacy backup 的前提下完成 SQLite read source cutover。
3. 再迁移 domain writes 到 SQLite，结束 shadow-only 阶段。
4. 扩大核心行为 / integration / E2E 测试。
5. 建立 v2 migration runner 纪律和 rollback 恢复路径。
6. Windows installer / signing / Release。
7. 再考虑 hybrid RAG、provider-native history、Agent 能力扩展。

当前不建议继续堆页面或大规模新 Agent 功能。优先把现有产品变成**稳定、可迁移、可回滚、可发布**的软件。
