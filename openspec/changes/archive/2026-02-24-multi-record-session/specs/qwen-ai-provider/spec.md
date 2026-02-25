## MODIFIED Requirements

### Requirement: Edge function import migration

All three edge functions (`process-voice`, `process-bill`, `ai-chat`) SHALL import from `_shared/qwen.js` instead of `_shared/gemini.js` and adapt their prompt construction to the OpenAI-compatible message format.

#### Scenario: Voice processing uses Qwen text

- **WHEN** `process-voice` receives a transcript
- **THEN** it SHALL call `generateText` with messages `[{role: "system", content: VOICE_PROMPT}, {role: "user", content: "Transcript: ..."}]` where VOICE_PROMPT requests extraction of ALL transactions (not just one) into `{ "transactions": [...] }` format

#### Scenario: Bill processing uses Qwen vision with signed URL

- **WHEN** `process-bill` receives a `storage_path`
- **THEN** it SHALL generate a signed URL (300s expiry) from the `bills` storage bucket and pass it to `generateVisionJson(prompt, signedUrl)` where the prompt requests extraction of ALL line items into `{ "transactions": [...] }` format

#### Scenario: Bill processing uses Qwen vision with direct URL

- **WHEN** `process-bill` receives an `image_url`
- **THEN** it SHALL pass the URL directly to `generateVisionJson(prompt, imageUrl)` where the prompt requests extraction of ALL line items into `{ "transactions": [...] }` format

#### Scenario: AI chat uses Qwen text

- **WHEN** `ai-chat` receives a user message
- **THEN** it SHALL call `generateText` with messages `[{role: "system", content: SYSTEM_PROMPT}, {role: "user", content: message}]` and the response/insert contract SHALL remain unchanged
