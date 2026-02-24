## Why

The app currently runs entirely on mock data — all 7 API methods in `services/api.ts` return hardcoded responses. There is no real backend, no persistent data, no user accounts, and no actual AI capability. Integrating Supabase as the full backend replaces every mock endpoint with real implementations: authentication, database storage for transactions and chat history, file storage for bill images, and Edge Functions for AI-powered features (Gemini 2.0 Flash).

## What Changes

- **Add Supabase client SDK** (`@supabase/supabase-js`) to the frontend
- **Replace mock login/registration** with Supabase Auth (email + password sign-up / sign-in)
- **Create `profiles` table** for extended user data (name, avatar, premium status)
- **Create `transactions` table** with RLS for persistent expense/income records
- **Create `messages` table** for persistent AI chat history
- **Create `bills` Storage bucket** for uploaded receipt/bill images
- **Add Edge Function `ai-chat`** — proxies chat messages to Gemini 2.0 Flash, stores history
- **Add Edge Function `process-bill`** — receives bill image, calls Gemini Vision to extract transaction data, inserts into DB
- **Add Edge Function `process-voice`** — receives voice transcript text, calls Gemini to parse into structured transaction, inserts into DB
- **Replace all 7 mock `Api.*` methods** with real Supabase calls
- **Update all 3 Zustand stores** (`useUserStore`, `useTransactionStore`, `useChatStore`) to use Supabase
- **Update login pages** to use email + password forms
- **Move Gemini API key** to Supabase secrets (remove from frontend env)

## Capabilities

### New Capabilities

- `supabase-auth`: User authentication and session management via Supabase Auth — registration, login (email + password), logout, session persistence, auth state sync with Zustand.
- `transaction-management`: Persistent transaction CRUD via Supabase database — fetch transactions, create from manual/voice/bill sources, with row-level security per user.
- `ai-chat-backend`: Server-side AI chat via Edge Function `ai-chat` — sends user messages to Gemini 2.0 Flash, persists chat history in `messages` table, keeps API key server-side.
- `bill-processing`: Bill image upload and AI extraction via Supabase Storage + Edge Function `process-bill` — upload receipt photo, use Gemini Vision to extract amount/merchant/category, auto-create transaction.
- `voice-accounting`: Voice transcript parsing via Edge Function `process-voice` — takes speech-to-text output, uses Gemini to extract structured transaction data, auto-create transaction.

### Modified Capabilities

_(none — existing `speech-to-text` requirements remain unchanged; it still produces a transcript string, only the downstream consumer changes)_

## Impact

- **Dependencies**: Add `@supabase/supabase-js`. Edge Functions use Deno runtime.
- **Database**: 3 new tables (`profiles`, `transactions`, `messages`) with RLS policies on Supabase project `rhltcewfhlawwjeokejt`.
- **Storage**: 1 new bucket (`bills`) for receipt images.
- **Edge Functions**: 3 functions (`ai-chat`, `process-bill`, `process-voice`) all using Gemini API key from Supabase secrets.
- **Services layer**: `services/api.ts` entirely replaced; new `services/supabase.ts` client module.
- **Stores**: All 3 stores (`useUserStore`, `useTransactionStore`, `useChatStore`) rewritten to use Supabase.
- **Pages**: `LoginOneClick.tsx` and `LoginVerification.tsx` updated for email/password. `Home.tsx` and `Chat.tsx` unchanged in UI but their data now comes from Supabase.
- **Environment**: `.env.local` needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. `GEMINI_API_KEY` moves to Edge Function secrets only.
- **Mock data**: `services/mockData.ts` can be removed after all endpoints are live.

## API Inventory Reference

See [api-inventory.md](./api-inventory.md) for the complete interface documentation mapping all 7 mock endpoints to their Supabase implementations, including table schemas, Edge Function contracts, and Storage bucket design.
