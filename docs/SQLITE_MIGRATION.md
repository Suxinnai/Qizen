# Qizen SQLite Migration Plan

> 状态：Phase 1 foundation。当前生产读写仍使用 localStorage；本文件定义后续切换边界。

## 目标

把主学习数据与 Study conversations 从浏览器 localStorage 迁移到 Electron 用户目录中的 SQLite 数据库，同时保持：

- 现有用户数据可一次性导入；
- API Key 永远不进入主学习数据库；
- 导入失败时不破坏旧数据；
- 迁移后 SQLite 成为唯一真源，避免长期双写产生分叉；
- 浏览器单独运行模式仍可保留 localStorage fallback，但不能与 Electron SQLite 冒充同一持久层。

## 当前数据源

| 数据 | 当前真源 |
| --- | --- |
| AppData | `qizen:mvp:v2` localStorage |
| Study conversations | `qizen:study:conversations:v1` localStorage |
| API Key | Electron `safeStorage` / 浏览器 secret fallback |

## SQLite v1 设计

Schema：`app/electron/db/schema-v1.sql`

### 正常化关系

- `goals → milestones → goal_tasks`
- `practice_sets → practice_questions`
- `knowledge_nodes ← knowledge_edges → knowledge_nodes`
- `study_conversations → study_messages`

### 保持 JSON 的字段

为了避免 MVP 阶段过度拆表，下列小型/可变结构先保存为 JSON：

- Settings 整体配置（API Key 强制清空）
- Learning Profile
- tags / highlights / linkedNodeIds / related
- Practice evidence
- Study event LLM metadata / weak prompts / hit resource titles
- Conversation context
- Message plan / agent / RAG / trigger 等 metadata
- 30 天 dailyMinutes

这些字段后续只有在出现明确查询需求时再正常化。

## Migration bundle

`app/src/lib/persistence/sqlite-migration.ts`

`buildSqliteMigrationBundle()` 是纯函数：

```text
AppData + conversations + conversation UI state
                    ↓
          deterministic SQLite rows
```

它不：

- 读取 localStorage；
- 打开 SQLite；
- 写文件；
- 访问 Electron；
- 修改输入数据。

因此可以在 Node `node:test` 中稳定验证。

### 安全约束

即使旧 AppData 中残留 `settings.llm.apiKey`，migration bundle 也必须写成空字符串。API Key 继续只走 `secretStore` / Electron `safeStorage`。

## 分阶段切换

### Phase 1 — Foundation（当前）

- [x] SQLite v1 schema
- [x] localStorage → SQLite row bundle
- [x] hierarchy / JSON / conversation ordering tests
- [x] API Key exclusion test
- [ ] Electron SQLite runtime

### Phase 2 — Electron database runtime

在主进程增加数据库模块：

1. 打开 `app.getPath('userData')/qizen.sqlite3`；
2. 开启 foreign keys；
3. 执行 schema migrations；
4. 提供 transaction API；
5. Electron smoke 使用临时数据库验证 create/import/read/delete。

数据库操作只发生在主进程，renderer 不直接获得文件路径或原始 DB handle。

### Phase 3 — One-time import

启动 Electron 时：

1. renderer 读取并 sanitize 当前 localStorage；
2. 构造 migration bundle；
3. 通过受限 IPC 发送主进程；
4. 主进程在一个 transaction 中导入；
5. 校验核心 row count / active conversation；
6. 写 `local_storage_imported_at` metadata；
7. import 成功后才允许切换 SQLite reader。

失败时 rollback，旧 localStorage 原样保留。

### Phase 4 — Repository switch

建立 renderer persistence adapter：

```text
App UI / Study hooks
        ↓
Persistence Repository
   ↙             ↘
Electron SQLite   Browser localStorage fallback
```

Electron 模式切换后：

- SQLite 为唯一真源；
- 不做长期 localStorage + SQLite 双写；
- localStorage 只保留迁移前备份/标记，等待后续版本清理。

### Phase 5 — Cleanup

经过至少一个稳定版本周期后：

- 删除 Electron 模式下旧 AppData localStorage 写入；
- 保留显式 JSON export/import；
- 为数据库备份/恢复建立 UI；
- 再评估 schema v2。

## 回滚策略

迁移版本必须可回滚到 localStorage：

- import 前不删除旧 key；
- import metadata 记录数据库 schema 与时间；
- SQLite 初始化/校验失败时自动退回旧 persistence adapter；
- 不允许“部分表成功、部分表失败”的提交，所有首次导入必须单 transaction。

## 不在 SQLite 中保存

- API Key / secret；
- 临时 SSE token；
- DOM/UI 瞬时状态；
- 纯派生的 Learner Memory 结果（继续从事件按需计算）；
- 可重新计算的 Reports 汇总值。
