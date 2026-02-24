## Context

The Hua Na Le app is a React 19 + TypeScript frontend (Vite, Tailwind, Zustand) with Capacitor for mobile. All data is currently mocked in `services/api.ts` with 7 mock methods — there is no backend, no database, no real auth. The Supabase project (`rhltcewfhlawwjeokejt`, region `us-east-2`) is freshly created with no tables or edge functions.

Key frontend files affected:

- `services/api.ts` — 7 mock methods, will be entirely replaced
- `stores/useUserStore.ts` — mock auth → Supabase Auth
- `stores/useTransactionStore.ts` — mock transactions → Supabase DB + Edge Functions
- `stores/useChatStore.ts` — mock chat → Supabase DB + Edge Function
- `pages/LoginOneClick.tsx`, `pages/LoginVerification.tsx` — login UI → email/password forms
- `types.ts` — `User`, `Transaction`, `Message` types may need minor adjustments

Full API interface inventory: see [api-inventory.md](./api-inventory.md).

## Goals / Non-Goals

**Goals:**

- Replace all 7 mock API methods with real Supabase implementations
- Real user registration and login via Supabase Auth (email + password)
- Persistent transactions in Supabase database with row-level security
- Persistent chat history in Supabase database
- Server-side AI chat via Edge Function → Gemini 2.0 Flash
- Server-side bill OCR via Edge Function → Gemini Vision
- Server-side voice transcript parsing via Edge Function → Gemini
- Gemini API key stored securely as Supabase secret
- Minimal disruption to existing UI — same pages, same component structure

**Non-Goals:**

- Phone-number OTP or social login (WeChat, Apple) — deferred
- Streaming/SSE responses from Gemini — first version uses request/response
- Rate limiting or usage quotas on Edge Functions
- Real-time subscriptions (Supabase Realtime) for transactions/messages
- User profile editing UI — deferred (current ProfileSettings page remains read-only)
- Financial aggregation views (monthly summaries, budgets) — use client-side calculation for now

## Decisions

### 1. Supabase client initialization

**Decision**: Create `services/supabase.ts` exporting a singleton Supabase client initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

**Rationale**: `@supabase/supabase-js` handles token storage, refresh, retry. `VITE_` prefix makes vars available via `import.meta.env`.

### 2. Auth method: Email + password

**Decision**: Use `signUp({ email, password })` and `signInWithPassword({ email, password })`. Adapt login pages to email/password forms.

**Rationale**: Simplest auth with zero external dependencies. Phone OTP needs Twilio/SMS provider — deferred.

### 3. Auth state management

**Decision**: Replace mock `useUserStore` with Supabase Auth calls. Add `onAuthStateChange` listener on app init. Map Supabase `User` + `profiles` row to app's `User` type.

**Flow**:

```
App mount → supabase.auth.getSession()
         → if session, fetch profile → set user + isAuthenticated
         → supabase.auth.onAuthStateChange() keeps store in sync
Login    → signInWithPassword → listener fires → store updated → navigate /home
Signup   → signUp → listener fires → create profile row → store updated
Logout   → signOut → listener fires → store cleared → navigate /login
```

### 4. Database schema — 3 tables with RLS

**Decision**: Create `profiles`, `transactions`, `messages` tables. Enable RLS on all.

```sql
-- profiles: extended user data
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, handle TEXT, avatar_url TEXT,
  is_premium BOOLEAN DEFAULT false, phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- transactions: expense/income records
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT '¥', category TEXT NOT NULL,
  icon TEXT, icon_bg TEXT, icon_color TEXT,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  note TEXT, merchant TEXT, description TEXT,
  source TEXT CHECK (source IN ('manual', 'voice', 'bill_scan')) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- messages: chat history
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender TEXT CHECK (sender IN ('user', 'ai')) NOT NULL,
  text TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'chart', 'transaction_list')) DEFAULT 'text',
  chart_data JSONB, transaction_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Rationale**: RLS ensures each user only accesses their own data. `profiles` uses auth.users `id` as PK for direct join. Financial fields like `balance` and `monthlyExpenses` are computed client-side from transactions rather than stored redundantly.

### 5. Storage: bills bucket

**Decision**: Create a private `bills` bucket. Files stored under `{user_id}/` path. RLS policy limits access to own files.

**Rationale**: Bill images are private data. Private bucket + RLS prevents cross-user access. Path convention enables simple policy.

### 6. Edge Functions — 3 functions

**Decision**: Deploy 3 Edge Functions, all with JWT verification enabled:

| Function        | Purpose                         | Gemini API                                  |
| --------------- | ------------------------------- | ------------------------------------------- |
| `ai-chat`       | Chat with AI, persist history   | `generateContent` (text)                    |
| `process-bill`  | OCR receipt image → transaction | `generateContent` (vision/multimodal)       |
| `process-voice` | Parse voice text → transaction  | `generateContent` (text, structured output) |

All three read `GEMINI_API_KEY` from `Deno.env.get()`.

**Rationale**: Keeps Gemini key server-side. Edge Functions run close to user with auto-scaling. JWT verification is built-in.

### 7. Gemini prompt design

**Decision**:

- `ai-chat`: System prompt includes user context ("you are Hua Na Le, a financial assistant"). User's recent transactions can be injected for context.
- `process-bill`: Prompt asks Gemini to extract `{title, amount, currency, category, merchant}` as JSON from the receipt image.
- `process-voice`: Prompt asks Gemini to extract `{title, amount, currency, category, type}` as JSON from natural language like "今天打车花了45块".

**Rationale**: Structured JSON output from Gemini enables reliable parsing. Gemini 2.0 Flash supports both text and vision modalities.

### 8. Frontend service layer rewrite

**Decision**: Replace `services/api.ts` mock implementations with real calls:

| Old Mock                | New Implementation                                           |
| ----------------------- | ------------------------------------------------------------ |
| `Api.login(phone)`      | `supabase.auth.signInWithPassword`                           |
| `Api.getUser()`         | `supabase.auth.getUser()` + `profiles` select                |
| `Api.getTransactions()` | `supabase.from('transactions').select()`                     |
| `Api.getChatHistory()`  | `supabase.from('messages').select()`                         |
| `Api.sendMessage(text)` | `supabase.functions.invoke('ai-chat')`                       |
| `Api.uploadBill(file)`  | Storage upload + `supabase.functions.invoke('process-bill')` |
| `Api.uploadVoice(text)` | `supabase.functions.invoke('process-voice')`                 |

**Rationale**: Keep the same `Api.*` interface initially to minimize store changes, then gradually move Supabase calls into stores directly.

### 9. Environment variable strategy

**Decision**:

- Frontend `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Edge Function secrets: `GEMINI_API_KEY`
- Remove `GEMINI_API_KEY` from frontend `.env.example`

## Risks / Trade-offs

- **[Auth UX change]** Phone-based login → email+password changes the UX. → Mitigation: Clean email/password forms. Phone OTP added later.
- **[Edge Function cold start]** ~200-500ms cold start on first request. → Mitigation: Acceptable for AI features where users expect thinking delay.
- **[Gemini Vision accuracy]** Bill OCR may not perfectly extract all fields. → Mitigation: Return best-effort extraction; user can edit transaction after creation.
- **[Voice parsing ambiguity]** Natural language like "吃饭100" could have multiple interpretations. → Mitigation: Gemini is good at Chinese NLP; edge cases are acceptable for v1.
- **[No offline support]** All features require network. → Mitigation: Already the case. Offline queue is a future concern.
- **[Cost]** Each AI call costs Gemini API credits. → Mitigation: Gemini 2.0 Flash is cost-efficient. Monitor usage.
