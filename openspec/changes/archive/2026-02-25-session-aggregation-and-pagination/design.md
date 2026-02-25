## Design Decisions

### 1. 查询维度: 查 transactions 再分组 vs 直接查 input_sessions

**选择: 直接查 input_sessions**

- 首页只需展示会话卡片（来源、总金额、条数、时间），不需要每条交易的明细
- `input_sessions` 表加 `total_amount`/`currency` 列后，首页零 JOIN，查询极快
- 无需前端 groupBy 逻辑，代码更简单
- 点击卡片再查 `transactions WHERE session_id = ?`，按需加载

### 2. 分页策略: Offset-based (.range())

- 对 `input_sessions` 按 `created_at DESC` 分页
- 每页 20 条会话，IntersectionObserver 触底加载下一页
- `fetchSessionsPage(userId, page, 20)` → `.range(from, to)`

### 3. 会话详情: 新页面 `/session/:id`

- 用户要求"点击可以跳转到详情查看具体消费情况"
- 新页面查询 `transactions WHERE session_id = :id`

### 4. 月度汇总

- 查 `input_sessions` 表 `.gte('created_at', monthStart)` 取 `total_amount` 求和
- 无需查 transactions 表

### 5. 历史数据处理

- **删除** `session_id IS NULL` 的孤儿 transactions
- 今后所有入口（语音/图片/手动）统一先创建 input_session

### 6. input_sessions 表扩展

新增两列，边缘函数在创建会话时回写：

- `total_amount NUMERIC DEFAULT 0` — 该会话所有交易合计
- `currency TEXT DEFAULT '¥'` — 货币符号

## Data Flow

```
Home mount
  ├─ fetchSessions()              → 加载第 1 页 input_sessions（20 条）
  │   └─ transactionService.fetchSessionsPage(userId, 0, 20)
  ├─ fetchMonthlySummary()        → 查 input_sessions 当月汇总
  └─ 渲染 session 卡片列表

Scroll to bottom (IntersectionObserver)
  └─ fetchMoreSessions()          → 加载下一页，append
      └─ transactionService.fetchSessionsPage(userId, nextPage, 20)

Click session card
  └─ navigate(`/session/${sessionId}`)
      └─ SessionDetail: transactionService.fetchBySessionId(sessionId)
```

## File Changes

| File                                        | Change                                                            |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `supabase/migrations/...`                   | input_sessions 加 total_amount/currency；删孤儿 transactions      |
| `supabase/functions/process-voice/index.ts` | session update 写 total_amount/currency                           |
| `supabase/functions/process-bill/index.ts`  | session update 写 total_amount/currency                           |
| `types.ts`                                  | 新增 `InputSession` 接口                                          |
| `services/transactionService.ts`            | 新增 `fetchSessionsPage()`、`fetchMonthlySummary()` 基于 sessions |
| `stores/useTransactionStore.ts`             | 管理 sessions 列表 + 分页状态                                     |
| `pages/Home.tsx`                            | 渲染 InputSession 卡片 + 无限滚动                                 |
| `pages/SessionDetail.tsx`                   | 通过 session_id 查交易明细                                        |
