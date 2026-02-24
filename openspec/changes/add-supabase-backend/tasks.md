## 1. Project Setup & Supabase Client

- [x] 1.1 Install `@supabase/supabase-js` package
- [x] 1.2 Update `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (remove `GEMINI_API_KEY`)
- [x] 1.3 Create `.env.local` with real Supabase project URL (`https://rhltcewfhlawwjeokejt.supabase.co`) and publishable key
- [x] 1.4 Create `services/supabase.ts` — singleton client with env var validation

## 2. Database Schema (Supabase Migrations)

- [x] 2.1 Create `profiles` table with RLS (id, name, handle, avatar_url, is_premium, phone, created_at)
- [x] 2.2 Create `transactions` table with RLS (id, user_id, title, amount, currency, category, icon, icon_bg, icon_color, type, note, merchant, description, source, created_at)
- [x] 2.3 Create `messages` table with RLS (id, user_id, sender, text, type, chart_data, transaction_ids, created_at)
- [x] 2.4 Create trigger to auto-create `profiles` row on auth.users insert
- [x] 2.5 Create `bills` Storage bucket with RLS policy (users access own `{user_id}/` path only)

## 3. Auth Integration (useUserStore)

- [x] 3.1 Rewrite `useUserStore` to use Supabase Auth (`signUp`, `signInWithPassword`, `signOut`)
- [x] 3.2 Add `onAuthStateChange` listener that syncs auth events to Zustand state
- [x] 3.3 Add `initAuth` method that calls `getSession()` on app mount and registers the listener
- [x] 3.4 Map Supabase `User` + `profiles` row to the app's `User` type
- [x] 3.5 Call `initAuth` in `App.tsx` on mount (before rendering routes)

## 4. Login & Registration Pages

- [x] 4.1 Update `LoginOneClick.tsx` to show email + password form instead of one-click phone login
- [x] 4.2 Update `LoginVerification.tsx` to serve as the registration page (email + password + confirm)
- [x] 4.3 Add client-side validation (email format, password min 6 chars)
- [x] 4.4 Wire form submission to `useUserStore.login` and `useUserStore.signUp`
- [x] 4.5 Display auth error messages from Supabase in the UI

## 5. Transaction Management (useTransactionStore)

- [x] 5.1 Replace `Api.getTransactions()` with `supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })`
- [x] 5.2 Add client-side financial summary computation (monthlyExpenses, balance, dailyAvailable) from transactions
- [x] 5.3 Update `addTransaction` to insert into Supabase `transactions` table

## 6. Edge Function: ai-chat

- [x] 6.1 Set the Gemini API key as a Supabase secret (`GEMINI_API_KEY`)
- [x] 6.2 Create and deploy `ai-chat` Edge Function: validate JWT, read message, call Gemini 2.0 Flash `generateContent`, return reply
- [x] 6.3 Persist user message + AI reply to `messages` table within the Edge Function
- [x] 6.4 Handle error cases: empty message (400), Gemini failure (502), missing API key (500)

## 7. Edge Function: process-bill

- [x] 7.1 Create and deploy `process-bill` Edge Function: validate JWT, download image from Storage, send to Gemini Vision, extract {title, amount, currency, category, merchant} as JSON
- [x] 7.2 Insert extracted transaction into `transactions` table with `source: 'bill_scan'`
- [x] 7.3 Handle error cases: missing image_url (400), unrecognizable bill (422), Gemini failure (502)

## 8. Edge Function: process-voice

- [x] 8.1 Create and deploy `process-voice` Edge Function: validate JWT, send transcript to Gemini, extract {title, amount, currency, category, type} as JSON
- [x] 8.2 Insert extracted transaction into `transactions` table with `source: 'voice'`
- [x] 8.3 Handle error cases: empty transcript (400), ambiguous extraction (return with warning), Gemini failure (502)

## 9. Chat Integration (useChatStore)

- [x] 9.1 Replace `Api.getChatHistory()` with `supabase.from('messages').select('*').eq('user_id', userId).order('created_at', { ascending: true })`
- [x] 9.2 Replace `Api.sendMessage()` with `supabase.functions.invoke('ai-chat', { body: { message } })`
- [x] 9.3 Parse Edge Function response, create `Message` object, add to store
- [x] 9.4 Add error handling: display user-friendly error in chat on failure
- [x] 9.5 Guard chat behind auth check — redirect to login if unauthenticated

## 10. Bill & Voice Upload Integration (useTransactionStore)

- [x] 10.1 Replace `Api.uploadBill()`: upload file to `bills/{user_id}/` Storage, then call `supabase.functions.invoke('process-bill')` with the image URL
- [x] 10.2 Replace `Api.uploadVoice()`: call `supabase.functions.invoke('process-voice', { body: { transcript } })`
- [x] 10.3 Add created transactions to store from Edge Function responses

## 11. Cleanup & Verification

- [x] 11.1 Remove all mock implementations from `services/api.ts` (or delete file entirely)
- [x] 11.2 Remove `services/mockData.ts`
- [x] 11.3 Update route guards in `App.tsx` to check real auth state before allowing access to protected pages
- [ ] 11.4 Verify: register → login → view transactions → upload bill → voice record → chat with AI → logout → session restore on reload
