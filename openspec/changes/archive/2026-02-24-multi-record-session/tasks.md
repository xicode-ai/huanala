## 1. Database Migration

- [x] 1.1 Create migration file that adds `input_sessions` table with columns: `id` (UUID PK), `user_id` (UUID FK → auth.users CASCADE), `source` (TEXT NOT NULL CHECK IN voice/bill_scan/manual), `raw_input` (TEXT nullable), `ai_raw_output` (JSONB nullable), `record_count` (INTEGER DEFAULT 0), `created_at` (TIMESTAMPTZ DEFAULT now())
- [x] 1.2 In the same migration, add nullable `session_id` (UUID FK → input_sessions.id ON DELETE SET NULL) column to `transactions` table with an index on `session_id`
- [x] 1.3 In the same migration, add RLS policies on `input_sessions`: enable RLS, allow SELECT/INSERT/DELETE where `auth.uid() = user_id`
- [x] 1.4 Apply migration to Supabase project and verify tables exist via `supabase_execute_sql`
- [x] 1.5 Update `supabase/DATABASE_SCHEMA.md` with the new `input_sessions` table and `transactions.session_id` column

## 2. Edge Function: process-voice

- [x] 2.1 Rewrite the AI prompt in `process-voice/index.js` to request extraction of ALL transactions into `{ "transactions": [...] }` format (per design.md Decision 3)
- [x] 2.2 After AI response, extract `.transactions` array from parsed JSON; if not an array or empty, return HTTP 422 with `{ error: "Could not extract transaction data" }`
- [x] 2.3 Insert one `input_sessions` record with `user_id`, `source: 'voice'`, `raw_input: transcript`, `ai_raw_output: parsed AI JSON`; capture the returned `session_id`
- [x] 2.4 Map each transaction item to a full row (adding `user_id`, `session_id`, defaults for missing fields), then batch insert via `.insert([...]).select('*')`
- [x] 2.5 Update the session's `record_count` to the number of inserted transactions
- [x] 2.6 Change the response body to `{ session_id, transactions: [...] }` (array of inserted records with IDs)

## 3. Edge Function: process-bill

- [x] 3.1 Rewrite the AI prompt in `process-bill/index.js` to request extraction of ALL line items into `{ "transactions": [...] }` format (per design.md Decision 3)
- [x] 3.2 After AI response, extract `.transactions` array from parsed JSON; if not an array or empty, return HTTP 422 with `{ error: "Could not extract transaction data from image" }`
- [x] 3.3 Insert one `input_sessions` record with `user_id`, `source: 'bill_scan'`, `raw_input: storage_path or image_url`, `ai_raw_output: parsed AI JSON`; capture the returned `session_id`
- [x] 3.4 Map each transaction item to a full row (adding `user_id`, `session_id`, `type: 'expense'`, defaults), then batch insert via `.insert([...]).select('*')`
- [x] 3.5 Update the session's `record_count` to the number of inserted transactions
- [x] 3.6 Change the response body to `{ session_id, transactions: [...] }` (array of inserted records with IDs)

## 4. Frontend Service Layer

- [x] 4.1 In `services/transactionService.ts`, change `processVoice()` return type from `Transaction` to `Transaction[]` and parse the new `{ session_id, transactions }` response shape
- [x] 4.2 In `services/transactionService.ts`, change `uploadBill()` return type from `Transaction` to `Transaction[]` and parse the new `{ session_id, transactions }` response shape

## 5. Frontend Store

- [x] 5.1 In `stores/useTransactionStore.ts`, add `addTransactions(txs: Transaction[])` method that prepends all transactions to the list at once
- [x] 5.2 Update call sites in `useTransactionStore` that invoke `addTransaction` after `processVoice`/`uploadBill` to use `addTransactions` with the returned array

## 6. Frontend UI Feedback

- [x] 6.1 In `pages/Home.tsx`, after voice or bill processing completes, show a Toast notification "已创建 N 条记录" where N is the length of the returned transactions array
- [x] 6.2 Ensure single-record creation (N=1) also shows the Toast with "已创建 1 条记录" for consistent UX

## 7. Deploy & Verify

- [x] 7.1 Deploy updated `process-voice` and `process-bill` Edge Functions to Supabase
- [x] 7.2 Test voice input with multiple items (e.g., "午饭35，打车20") and verify multiple `transactions` rows are created with the same `session_id`
- [x] 7.3 Test bill image upload with a multi-item receipt and verify multiple transactions are created
- [x] 7.4 Test single-item voice/bill input and verify it returns a single-element array (not a bare object)
- [x] 7.5 Verify existing transactions (no `session_id`) still display correctly in the UI
