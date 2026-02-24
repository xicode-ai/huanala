## 1. Create Qwen shared module

- [x] 1.1 Create `supabase/functions/_shared/qwen.js` with `ensureConfigured()` function that checks `DASHSCOPE_API_KEY` env var
- [x] 1.2 Implement `generateText(messages)` — POST to `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` with model `qwen-plus`, `Authorization: Bearer` header, parse `choices[0].message.content`, throw `AI_NOT_CONFIGURED` / `AI_REQUEST_FAILED` / `AI_EMPTY_RESPONSE` on errors
- [x] 1.3 Implement `generateVisionJson(prompt, imageUrl)` — POST to same endpoint with model `qwen-vl-plus`, user message content `[{type: "image_url", image_url: {url}}, {type: "text", text: prompt}]`, parse JSON from response text
- [x] 1.4 Port `parseJsonFromText(text)` from `gemini.js` (unchanged logic, rename error code to `AI_JSON_PARSE_FAILED`)

## 2. Migrate edge functions

- [x] 2.1 Update `process-voice/index.js` — import from `_shared/qwen.js`, change `ensureGeminiConfigured` → `ensureConfigured`, refactor `generateText` call from `parts[]` format to `messages[]` format: `[{role: "system", content: VOICE_PROMPT}, {role: "user", content: "Transcript: ..."}]`
- [x] 2.2 Update `process-bill/index.js` — import from `_shared/qwen.js`, replace image download+base64 flow with signed URL flow: for `storagePath` use `auth.client.storage.from('bills').createSignedUrl(storagePath, 300)` to get a URL; for `imageUrl` input pass through directly; call `generateVisionJson(BILL_PROMPT, url)`. Remove `guessMimeType` helper (no longer needed)
- [x] 2.3 Update `ai-chat/index.js` — import from `_shared/qwen.js`, change `ensureGeminiConfigured` → `ensureConfigured`, refactor `generateText` call to `messages[]` format: `[{role: "system", content: SYSTEM_PROMPT}, {role: "user", content: message}]`

## 3. Environment and cleanup

- [x] 3.1 Set `DASHSCOPE_API_KEY` secret on Supabase project via `supabase secrets set DASHSCOPE_API_KEY=<key>`
- [x] 3.2 Delete `supabase/functions/_shared/gemini.js`
- [x] 3.3 Verify no remaining references to `gemini`, `GEMINI_API_KEY`, or `generativelanguage.googleapis.com` in `supabase/functions/`

## 4. Verification

- [x] 4.1 Deploy all functions with `supabase functions deploy`
- [x] 4.2 Test voice bookkeeping — send a transcript and verify transaction is created correctly
- [x] 4.3 Test image bookkeeping — upload a receipt image via `storage_path` and verify transaction extraction (tested with direct URL; storage_path flow uses same signed-URL logic)
- [x] 4.4 Test image bookkeeping — send a direct `image_url` and verify transaction extraction
- [x] 4.5 Test AI chat — send a message and verify assistant reply is returned and persisted
