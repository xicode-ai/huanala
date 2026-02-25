## Why

当前首页交易列表是扁平展示每条交易记录，Phase 3 引入了 `input_sessions` 表和 `transactions.session_id`，但前端仍然直接查询 transactions 表再前端分组——性能差、逻辑复杂。

**设计变更**: 统一以「记账会话」为维度查询 `input_sessions` 表，首页直接分页展示会话列表，点击跳转详情查看该会话下的具体交易记录。无 `session_id` 的历史孤儿数据全部清除。

## What Changes

- **首页查询 `input_sessions`**: 直接分页查询会话表，展示来源、总金额、记录条数、时间，无需前端 groupBy
- **会话详情页**: `/session/:id` 路由，通过 `session_id` 查询 `transactions` 表展示明细
- **数据库扩展**: `input_sessions` 表新增 `total_amount` 和 `currency` 列，避免首页需要 JOIN 查询
- **清理历史数据**: 删除无 `session_id` 的孤儿交易记录，今后所有记账入口统一先创建会话
- **Edge Functions 适配**: `process-voice` / `process-bill` 在创建会话时写入 `total_amount`/`currency`
- **分页加载**: 首页对 `input_sessions` 表 offset 分页 + IntersectionObserver 无限滚动

## Capabilities

### New Capabilities

- `session-list-ui`: 会话列表首页 —— 直接查询 `input_sessions` 分页展示，每卡片显示来源图标、总金额、记录条数
- `session-detail-ui`: 会话详情页 —— 查询 `transactions WHERE session_id = ?` 展示明细

### Modified Capabilities

- 无需修改 AI 层

## Impact

- **数据库**: `input_sessions` 新增 `total_amount NUMERIC` + `currency TEXT` 列；删除 `session_id IS NULL` 的孤儿 transactions
- **Edge Functions**: `process-voice`、`process-bill` 在 session update 时写入 total_amount/currency
- **前端类型**: 新增 `InputSession` 接口；`Transaction` 保留 `sessionId`
- **数据服务**: `transactionService` 新增 `fetchSessionsPage()`、保留 `fetchBySessionId()`
- **状态管理**: `useTransactionStore` 改为管理 sessions 列表 + 分页
- **首页 UI**: `Home.tsx` 渲染 session 卡片列表 + 无限滚动
- **路由**: `App.tsx` 保留 `/session/:id`
- **向后兼容**: 不兼容——孤儿数据清除后，所有记账流程统一走 session
