## Context

当前三个 Edge Function（`process-voice`、`process-bill`、`ai-chat`）均为"一次输入 → 一条交易"模式。数据库 `transactions` 表是扁平结构，没有分组概念。前端 `transactionService` 返回单个 `Transaction`，`useTransactionStore.addTransaction()` 接受单条记录。

现实使用场景要求支持：

- 语音："今天午饭35、打车20、咖啡18" → 3 条记录
- 采购单图片：多行条目 → N 条记录
- 文本输入（未来）：同上

需要在数据库层引入"输入会话"概念，在 AI 层改为多条提取，在前端层适配批量响应。

## Goals / Non-Goals

**Goals:**

- 一次语音/图片输入可创建 1~N 条交易记录，并通过 `session_id` 关联
- 数据库层原子性：同一会话的所有记录要么全部创建成功，要么全部失败
- 向后兼容：已有交易记录不受影响（`session_id` 为 NULL）
- 前端展示批量创建结果的反馈

**Non-Goals:**

- 用户手动编辑/确认 AI 提取结果再提交（后续迭代）
- 聊天页面（Chat.tsx）的图片上传功能（独立变更）
- 拆分已有单条记录为多条
- 对历史记录补填 `session_id`

## Decisions

### 1. 新增 `input_sessions` 表而非在 `transactions` 上加 `batch_id`

**选择**: 独立的 `input_sessions` 表 + `transactions.session_id` 外键

**备选方案**:

- A) `transactions` 表加 `batch_id UUID` 字段（无独立表）
- B) Parent-child 自引用（`transactions.parent_id`）
- C) 独立 `input_sessions` 表 + 外键

**理由**: 选 C。会话本身有独立属性（来源类型、原始输入、AI 原始输出、状态），这些不属于单条交易。`batch_id` 方案（A）无法存储会话级别的元数据。自引用方案（B）语义不清——这些不是父子交易，而是同一输入产生的平级记录。

**`input_sessions` 表结构**:

```sql
CREATE TABLE public.input_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('voice', 'bill_scan', 'manual')),
    raw_input TEXT,           -- 语音转文字结果 / 图片 storage_path
    ai_raw_output JSONB,      -- AI 返回的原始 JSON（调试用）
    record_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Edge Function 内直接批量插入，不用 RPC

**选择**: 在 Edge Function 中使用 Supabase client 的 `.insert([...])` 批量插入

**备选方案**:

- A) PostgreSQL RPC 函数（`create_transaction_batch`）
- B) Edge Function 内 `.insert([...])`

**理由**: 选 B。Supabase 的 `.insert([...])` 对单表已经是原子操作（一个 SQL INSERT）。我们的流程是：先创建 session → 再批量插入 transactions。这两步虽不在同一 SQL 事务中，但 session 只是元数据容器，即使 transactions 插入失败，孤立的 session 记录无害（可后续清理）。RPC 增加了维护复杂度和调试难度，在当前规模下不值得。

**流程**:

1. Edge Function 调用 AI，获取交易数组
2. 创建 `input_sessions` 记录，获取 `session_id`
3. 为每条交易附加 `session_id` 和 `user_id`，调用 `.insert([...]).select('*')`
4. 更新 session 的 `record_count`
5. 返回 `{ session_id, transactions: [...] }`

### 3. AI Prompt 返回 JSON 数组

**选择**: Prompt 要求返回 `{ "transactions": [...] }` 对象（包裹数组），而非裸 JSON 数组

**理由**: 包裹在对象中比裸数组更健壮——方便后续扩展元字段（如 `currency`、`total`），也与现有 `parseJsonFromText` 的 `{...}` 提取逻辑兼容。单条输入同样返回长度为 1 的数组，消除前端的分支逻辑。

**Voice Prompt 改为**:

```
Extract ALL transactions from the transcript. Return JSON only.
Schema: {"transactions": [{"title": string, "amount": number, "currency": string, "category": string, "type": "expense"|"income"}, ...]}
If only one item mentioned, still return array with one element.
No markdown, no explanation, JSON only.
```

**Bill Prompt 改为**:

```
Extract ALL line items from this receipt/purchase order image. Return JSON only.
Schema: {"transactions": [{"title": string, "amount": number, "currency": string, "category": string, "merchant": string}, ...]}
Each line item is a separate transaction. Do not combine items.
No markdown, no explanation, JSON only.
```

### 4. 前端返回类型从 `Transaction` 改为 `Transaction[]`

**选择**: `uploadBill()` 和 `processVoice()` 返回 `Transaction[]`，store 新增 `addTransactions(txs: Transaction[])` 方法

**理由**: 最小改动。`addTransaction` 保留给手动录入（单条），新增 `addTransactions` 给批量场景。Home.tsx 在 `isUploading` 结束后展示"已创建 N 条记录"的 Toast 提示。

### 5. `qwen.js` 的 `parseJsonFromText` 保持不变

**选择**: 不修改 `parseJsonFromText`，它已经能解析 `{...}` 格式的 JSON

**理由**: 因为 AI 返回 `{ "transactions": [...] }` 而非裸数组，现有的"找第一个 `{` 到最后一个 `}`"逻辑完全适用。调用方（Edge Function）从解析结果中取 `.transactions` 数组即可。

## Risks / Trade-offs

- **AI 提取质量下降** → 多条提取比单条更容易出错（漏项、重复、金额分配错误）。缓解：保存 `ai_raw_output` 以便调试；前端未来可加确认步骤。
- **单条变数组的兼容风险** → 前端 `uploadBill`/`processVoice` 返回类型变化是 breaking change。缓解：只改这两个方法及其调用方，影响范围可控（仅 `useTransactionStore`）。
- **session 与 transactions 非原子** → 理论上 session 创建成功但 transactions 插入失败会产生空 session。缓解：空 session 无害，可定期清理；当前流量不需要 RPC 级别保证。
- **AI 返回格式不稳定** → 模型可能返回非标准 JSON。缓解：Edge Function 做 fallback——如果解析出的 `transactions` 不是数组或为空，返回 422 而非 500。
