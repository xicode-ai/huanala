## Tasks

### 1. 类型扩展

- [x] 1.1 `types.ts`: `Transaction` 接口新增 `sessionId?: string`

### 2. 数据层改造

- [x] 2.1 `transactionService.ts`: `mapRow()` 新增 `session_id` → `sessionId` 映射
- [x] 2.2 `transactionService.ts`: `fetchAll()` 改为 `fetchPage(userId, page, pageSize)` 返回 `{ transactions, hasMore }`
- [x] 2.3 `transactionService.ts`: 新增 `fetchMonthlySummary(userId)` 返回 `{ expenses, income }`
- [x] 2.4 `transactionService.ts`: 新增 `fetchBySessionId(sessionId)` 返回 `Transaction[]`

### 3. 状态管理改造

- [x] 3.1 `useTransactionStore.ts`: 新增状态字段 `page`, `hasMore`, `isFetchingMore`
- [x] 3.2 `useTransactionStore.ts`: `fetchTransactions()` 改为加载首页 + 月度汇总
- [x] 3.3 `useTransactionStore.ts`: 新增 `fetchMoreTransactions()` 加载下一页并 append

### 4. 会话分组 UI

- [x] 4.1 `pages/Home.tsx`: 实现 `groupBySession()` 将 transactions 分组
- [x] 4.2 `pages/Home.tsx`: 渲染会话分组卡片（来源图标、总金额、N 条记录、点击跳转）
- [x] 4.3 `pages/Home.tsx`: 无 session 的记录保持独立卡片渲染

### 5. 无限滚动

- [x] 5.1 `pages/Home.tsx`: 添加 IntersectionObserver sentinel 元素
- [x] 5.2 `pages/Home.tsx`: 触底时调用 `fetchMoreTransactions()`
- [x] 5.3 `pages/Home.tsx`: 加载中 / 无更多数据 状态提示

### 6. 会话详情页

- [x] 6.1 新增 `pages/SessionDetail.tsx`: 展示会话信息和所有交易明细
- [x] 6.2 `App.tsx`: 新增 `/session/:id` 路由（ProtectedRoute）

### 7. 验证

- [x] 7.1 LSP diagnostics 无错误
- [x] 7.2 `npm run build` 通过
