# Qizen SQLite Migration Plan

> 状态：**Shadow migration / cutover verification 已建立，repository switch 尚未执行。**
>
> 当前 Electron 产品读写真源仍是 localStorage；SQLite 已经在真实启动链中作为可丢弃 shadow copy 使用。

## 当前结论

Qizen 已经不再处于“只设计 SQLite schema”的阶段。

当前已完成：

- SQLite v1 schema；
- Electron 主进程 `node:sqlite` runtime；
- migration bundle；
- transaction import；
- API Key import rejection；
- foreign-key rollback smoke；
- Electron 启动时一次性 shadow import；
- SQLite snapshot readback；
- import → readback round-trip smoke；
- legacy ↔ SQLite shadow domain comparator；
- fresh import → snapshot → verify cutover gate。

尚未完成：

- renderer persistence repository 真正接管所有读写；
- SQLite 成为 Electron 唯一真源；
- localStorage rollback 备份生命周期；
- schema v2 migration runner；
- packaged installer 下的数据库升级/恢复验证。

---

## 当前真源

| 数据 | 当前真源 | SQLite 状态 |
| --- | --- | --- |
| AppData | `qizen:mvp:v2` localStorage | shadow copy + readback |
| Study conversations | `qizen:study:conversations:v1` localStorage | shadow copy + readback |
| API Key | Electron `safeStorage` / 浏览器 secret fallback | **禁止进入 SQLite** |

重要：**SQLite 目前不是产品真源。**

用户在 shadow import 之后继续学习时，localStorage 会继续变化，而 SQLite shadow 可能变旧。这是当前阶段的预期行为，不应把日常 divergence 自动当作数据损坏。

---

## SQLite runtime

核心文件：

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

数据库位置：

```text
<app.getPath("userData")>/qizen.sqlite3
```

当前 driver：Electron 内置 Node 的 `node:sqlite` / `DatabaseSync`。

数据库只由 Electron 主进程打开。Renderer 通过受限 preload IPC 使用：

```text
window.qizenDatabase.status()
window.qizenDatabase.importBundle(...)
window.qizenDatabase.snapshot()
```

Renderer 不获得 SQLite 文件路径、SQL statement 或 DB handle。

---

## SQLite v1 数据设计

Schema 唯一真源：

```text
app/electron/db/schema-v1.sql
```

### 关系化结构

```text
goals
└─ milestones
   └─ goal_tasks

practice_sets
└─ practice_questions

knowledge_nodes
└─ knowledge_edges

study_conversations
└─ study_messages
```

### 保留 JSON 的字段

MVP 阶段没有独立查询价值、结构变化频繁的字段仍保存 JSON：

- Settings（API Key 强制为空）；
- Learning Profile；
- Library tags / highlights / linkedNodeIds；
- Knowledge node related；
- Practice evidence；
- Study event LLM metadata / weak prompts / hit resource titles；
- Conversation context；
- Message thinking / plan / resource / RAG / trigger metadata；
- 30 天 `dailyMinutes`。

不要为了“更像关系型数据库”而过度拆表。只有出现真实查询、索引或约束需求时再升级 schema。

---

## Migration bundle

`app/src/lib/persistence/sqlite-migration.ts`

`buildSqliteMigrationBundle()` 是纯转换层：

```text
normalized AppData
+ normalized Study conversations
+ active/sidebar state
        ↓
deterministic SQLite rows
```

它不：

- 直接读 localStorage；
- 打开 SQLite；
- 写文件；
- 调 Electron API；
- 修改输入对象。

### Secret 边界

即使旧 AppData 仍残留 `settings.llm.apiKey`，bundle 也必须把它清空。

主进程 importer 会再做一次 defensive validation：只要 bundle settings 仍含非空 API Key，就拒绝整个 import。

因此 secret 有两层守门：

```text
Renderer migration bundle scrub
→ Electron main-process import rejection
```

---

## Transaction import

`app/electron/database.cjs`

当前 import 行为：

1. validate bundle schema / required tables；
2. 检查 settings 不含 API Key；
3. `BEGIN IMMEDIATE`；
4. 按 FK 安全顺序清空 shadow rows；
5. 插入完整 bundle；
6. 写 `local_storage_imported_at`；
7. `COMMIT`；
8. 任何异常执行 rollback。

Electron SQLite smoke 已验证：

- 正常 import；
- API Key rejection；
- FK 故障；
- rollback 后旧已提交数据仍存在。

---

## Startup shadow import

`app/src/lib/persistence/sqlite-shadow-import.ts`

`app/src/main.tsx` 在 renderer 启动时 fire-and-forget 调用：

```text
runSqliteShadowImportAtStartup()
```

语义：

- Electron DB bridge 不存在 → `unavailable`；
- DB 已有 `importedAt` → `already-imported`，不重复读取 legacy；
- 新用户完全空数据 → `empty`，不写 imported marker；
- 有真实学习数据 → transaction import；
- import 出错 → warning + `failed`，**不阻塞 React render**。

失败后 localStorage 保持原样，下一次启动仍可重试。

这一步只是 shadow copy，不切换读写真源。

---

## Snapshot readback

`app/electron/database-read.cjs`

`readQizenDatabaseSnapshot()` 会从关系表重新组装 renderer domain shape：

- App state；
- Settings；
- Learning Profile；
- Goals / milestones / tasks；
- Notes；
- Library；
- Practice；
- Knowledge Graph；
- Study stats/events；
- Conversations/messages；
- active conversation / sidebar mode。

所有 JSON 字段集中在主进程 readback 层解码，SQL row shape 不暴露到 UI。

### 顺序保持

有显式 `position` 的集合按 `position` 还原。

v1 schema 中没有 position 的 legacy arrays（例如 Notes 等）按 SQLite insertion `rowid` 保留 import 时的原数组顺序。

Electron smoke 使用“时间戳顺序故意与数组顺序相反”的 Notes 锁定该行为，避免未来切换真源后 UI 顺序悄悄变化。

---

## Shadow consistency verification

`app/src/lib/persistence/sqlite-shadow-verify.ts`

`verifySqliteShadowSnapshot()` 比较 legacy 与 SQLite readback 的领域一致性：

- appState
- learningProfile
- settings
- goals
- notes
- libraryItems
- practiceSets
- knowledgeGraph
- studyStats
- studyRecord
- conversations
- active/sidebar state

允许的已知迁移差异：

- API Key 被清除；
- event `taskId: undefined` ↔ SQLite `null`；
- SQLite-only metadata（例如 legacy schema version）不参与 domain 一致性。

数组顺序仍严格比较。

结果：

```ts
{
  matches: boolean,
  mismatches: string[]
}
```

它只做诊断，不修改任何真源。

---

## Fresh cutover gate

`app/src/lib/persistence/sqlite-cutover-verify.ts`

真正考虑切换前，**不能直接拿几天前的 shadow DB 比较**。

必须执行：

```text
当前 localStorage 真源
→ fresh migration bundle
→ transaction 覆盖 shadow SQLite
→ SQLite snapshot readback
→ domain compare
→ matches === true
```

`verifyFreshSqliteShadowForCutover()` 已把这个顺序固化。

只有 `kind === "verified"` 才代表当前这一刻的 SQLite snapshot 与 legacy 真源一致。

`mismatch` 必须阻止切换；import failure 会直接 reject，不会继续 snapshot、不会伪装 verified。

当前该函数是安全基础设施，**还没有被启动流程用于自动切换真源**。

---

## 下一阶段：Repository switch

下一阶段不要直接把所有 `localStorage.getItem()` 改成 SQL。

现有大量 React 初始化仍依赖同步 `loadAppData()`，而 Electron IPC 是 async。推荐路径：

```text
Electron launch
→ persistence bootstrap
→ fresh cutover verification
→ load SQLite snapshot
→ hydrate renderer in-memory store
→ render routes
```

然后逐步把写操作改为 domain repository：

```text
UI / hooks
   ↓
Persistence Repository
   ├─ Electron SQLite adapter
   └─ Browser localStorage adapter
```

目标是“一套 domain API，两种运行环境 adapter”，而不是让业务层知道 SQL。

### Electron 模式切换原则

切换完成后：

- SQLite 成为唯一持续写入真源；
- 不做长期 localStorage + SQLite 双写；
- legacy localStorage 保留一个稳定版本周期作为 rollback backup；
- 明确完成迁移后再删除 Electron 模式旧写路径。

---

## Schema 版本纪律

**从现在开始，不能再把修改直接塞进 `schema-v1.sql` 并认为现有用户会自动升级。**

原因：启动 shadow import 已经可能在用户机器上创建 v1 `qizen.sqlite3`。

因此任何结构变化必须：

1. 增加新的 schema version；
2. 提供显式 v1 → v2 migration；
3. 在 transaction 中升级；
4. 更新 `schema_meta.schema_version`；
5. clean DB 与 existing v1 DB 都跑 smoke；
6. packaged Windows app 再验证一次。

`CREATE TABLE IF NOT EXISTS` 不是 migration runner。

如果只是修复 v1 的查询/readback 逻辑而不改变表结构，可以不升 schema；一旦列、约束、索引语义需要迁移已有数据，就必须版本化。

---

## 回滚策略

Repository switch 前：

- legacy key 不删除；
- SQLite 失败 → 产品继续使用 localStorage；
- shadow import 全 transaction；
- cutover verification mismatch → 禁止提升 SQLite 真源。

Repository switch 后至少一个稳定版本：

- legacy localStorage 只做 rollback backup，不继续双写；
- 提供显式回滚/恢复策略；
- JSON export 继续保留为用户可见备份格式。

---

## 不进入 SQLite 的内容

- API Key / secret；
- 临时 SSE token；
- DOM/UI 瞬时状态；
- 纯派生 Learner Memory；
- 可重新计算的 Reports 汇总；
- Resource Agent 临时请求状态。

---

## 当前完成度

```text
[✓] schema v1
[✓] migration bundle
[✓] Electron node:sqlite runtime
[✓] transaction importer
[✓] secret rejection
[✓] rollback smoke
[✓] startup shadow import
[✓] snapshot readback
[✓] import → readback round-trip smoke
[✓] legacy ↔ shadow comparator
[✓] fresh cutover verification gate
[ ] persistence repository
[ ] bootstrap from SQLite
[ ] SQLite authoritative reads
[ ] SQLite authoritative writes
[ ] one-release rollback cycle
[ ] schema v2 migration runner
```

**下一步应实现 persistence repository / bootstrap，而不是继续扩 shadow 机制。**
