# supabase/ — Backend (Edge Functions, Migrations, Config)

## Runtime

Edge Functions run on **Deno**. Files are plain **JavaScript** (`.js`) — not TypeScript for most functions.
Import npm packages via `npm:` specifier (e.g., `import { createClient } from 'npm:@supabase/supabase-js@2'`).
Environment variables via `Deno.env.get('KEY')`.

## Structure

```
supabase/
├── config.toml              # Function config (JWT verification disabled for all)
├── DATABASE_SCHEMA.md       # Full schema documentation
├── functions/
│   ├── _shared/             # Shared utilities (imported by all functions)
│   │   ├── cors.js          # CORS headers + jsonResponse() helper
│   │   ├── auth.js          # createUserClient() + getAuthenticatedUser()
│   │   └── qwen.js          # Qwen AI: generateText(), generateVisionJson()
│   ├── ai-chat/index.js     # AI chat — text completion via Qwen
│   ├── process-bill/index.ts # Bill scan — vision AI extracts transactions from image
│   └── process-voice/index.ts # Voice — AI parses spoken text into transactions
├── migrations/              # 6 SQL migrations (chronological)
└── scripts/                 # Schema export/pull helpers
```

## Edge Function Pattern

Every function follows this structure:

```js
Deno.serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 2. Auth verification
  const auth = await getAuthenticatedUser(req.headers.get('Authorization'));
  if (!auth) return jsonResponse(401, { error: 'Unauthorized' });

  // 3. Process request
  // ...

  // 4. Return JSON
  return jsonResponse(200, { result });
});
```

**Auth in Edge Functions**: JWT verification is **disabled** in `config.toml`. Functions verify auth manually via `getAuthenticatedUser()` which calls `supabase.auth.getUser()` with the Bearer token.

## Shared Utilities (`_shared/`)

| File      | Exports                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| `cors.js` | `corsHeaders` object, `jsonResponse(status, body)`                                                                |
| `auth.js` | `createUserClient(authHeader)`, `getAuthenticatedUser(authHeader)`                                                |
| `qwen.js` | `ensureConfigured()`, `generateText(messages)`, `generateVisionJson(prompt, imageUrl)`, `parseJsonFromText(text)` |

`getAuthenticatedUser()` returns `{ user, client }` or `null`. Qwen uses DashScope API (`DASHSCOPE_API_KEY`), models: `qwen-plus` (text), `qwen-vl-plus` (vision).

## Database

4 tables, all with RLS (user-scoped policies):

| Table            | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `profiles`       | User profiles (auto-created via trigger on auth.users insert) |
| `transactions`   | Expense/income records                                        |
| `messages`       | AI chat history (user + ai messages)                          |
| `input_sessions` | Groups transactions by input method (voice, bill_scan)        |

## Migrations

6 SQL migrations in `migrations/`, named `YYYYMMDDHHMMSS_description.sql`. Manage via `pnpm supabase:schema:pull` or `pnpm supabase:schema:export`.

## Environment Variables (Edge Functions)

| Variable            | Purpose                     |
| ------------------- | --------------------------- |
| `SUPABASE_URL`      | Auto-injected by Supabase   |
| `SUPABASE_ANON_KEY` | Auto-injected by Supabase   |
| `DASHSCOPE_API_KEY` | Qwen AI (Alibaba DashScope) |
