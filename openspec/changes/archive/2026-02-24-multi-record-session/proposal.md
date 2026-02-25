## Why

当前语音记账、图片记账和 AI 聊天均假设"一次输入 = 一条交易记录"。但现实场景中，用户说"今天午饭花了35，打车花了20，买咖啡花了18"或拍一张含多个条目的采购单，系统应一次性创建多条记录。缺少"会话"概念导致无法将同一次输入产生的多条记录关联起来，也无法在 UI 上以组的形式展示和管理。

## What Changes

- 新增 `input_sessions` 数据表，作为"一次输入"的容器，记录来源（voice / bill_scan / manual）、原始输入内容、AI 原始输出和状态
- **BREAKING**: `transactions` 表新增可空外键 `session_id`，指向 `input_sessions.id`，用于关联同一次输入产生的多条记录（已有记录不受影响，`session_id` 为 NULL）
- 修改 `process-voice` Edge Function：AI Prompt 从"Extract one transaction"改为"Extract all transactions"，返回 `{ transactions: [...] }` 数组，批量插入后返回前端
- 修改 `process-bill` Edge Function：同上，AI Prompt 改为提取所有行项目，支持采购单/收据中包含多个条目
- 修改前端 `transactionService`：`uploadBill()` 和 `processVoice()` 返回 `Transaction[]` 而非单个 `Transaction`
- 修改前端 `useTransactionStore`：`addTransaction()` 升级为支持数组的 `addTransactions()`，批量追加到列表
- Home.tsx 在记账完成后展示本次输入创建的所有记录摘要（而非静默追加单条）

## Capabilities

### New Capabilities

- `input-session`: 输入会话数据模型 —— `input_sessions` 表结构、RLS 策略、`transactions.session_id` 外键，以及通过 Supabase RPC 实现的原子批量创建
- `multi-record-parsing`: 多记录 AI 解析 —— 修改 process-voice / process-bill 的 Prompt 和响应解析逻辑，支持从单次输入中提取并批量创建多条交易记录

### Modified Capabilities

- `qwen-ai-provider`: `generateText` 和 `generateVisionJson` 的调用方不再假设单条 JSON 返回；`parseJsonFromText` 需要支持解析 JSON 数组或包含数组的 JSON 对象

## Impact

- **数据库**: 新增 `input_sessions` 表及迁移；`transactions` 表新增 `session_id` 列（可空，向后兼容）；新增 RPC 函数用于原子批量插入
- **Edge Functions**: `process-voice/index.js`、`process-bill/index.js` 的 Prompt 和插入逻辑重写；`_shared/qwen.js` 的 `parseJsonFromText` 需支持数组
- **前端服务层**: `transactionService.ts` 的 `uploadBill()` 和 `processVoice()` 返回类型从 `Transaction` 改为 `Transaction[]`
- **前端状态**: `useTransactionStore.ts` 的 `addTransaction` → `addTransactions`（批量）
- **前端 UI**: `Home.tsx` 需要展示批量创建结果的反馈 UI
- **类型定义**: `types.ts` 无需改动（`Transaction` 接口不变，只是从单个变为数组）
- **向后兼容**: 已有交易记录的 `session_id` 为 NULL，不受影响；前端对无 session 的旧记录正常展示
