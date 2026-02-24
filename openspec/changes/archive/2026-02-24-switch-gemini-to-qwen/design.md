## Context

The Supabase edge functions currently use Google Gemini (`gemini-2.0-flash`) via direct REST API calls through a shared `_shared/gemini.js` module. Three edge functions depend on it:

- **`process-voice`** — text-only: extracts transaction JSON from speech transcripts
- **`process-bill`** — vision: extracts transaction JSON from receipt images
- **`ai-chat`** — text-only: financial assistant chat

The shared module exposes: `ensureGeminiConfigured()`, `generateText(parts)`, `generateVisionJson(prompt, bytes, mimeType)`, `parseJsonFromText(text)`.

Gemini uses a proprietary request format (`contents[].parts[]`). Qwen's DashScope API uses OpenAI-compatible format (`messages[]` with `role`/`content`). This is the core format difference driving the migration.

For images, Gemini accepts base64 `inline_data` embedded in the request body. Qwen vision (`qwen-vl-plus`) accepts `image_url` references — URLs pointing to the image, not the raw bytes.

## Goals / Non-Goals

**Goals:**

- Replace all Gemini API calls with Qwen DashScope API equivalents
- Maintain identical edge function request/response contracts (zero frontend changes)
- Keep the same shared-module export interface so edge function changes are minimal
- Handle the image format difference (base64 → URL) transparently within the shared module

**Non-Goals:**

- Streaming responses — current functions return complete JSON, no change needed
- Adding new AI capabilities or changing prompt logic
- Frontend modifications
- Multi-provider abstraction or provider-switching mechanism — this is a straight swap

## Decisions

### 1. Replace `gemini.js` with `qwen.js`, keep the same export interface

**Decision**: Create `_shared/qwen.js` exporting the same function signatures: `ensureConfigured()`, `generateText(messages)`, `generateVisionJson(prompt, imageUrl, mimeType)`, `parseJsonFromText(text)`. Delete `gemini.js`.

**Why not rename to `ai.js` or abstract further?** YAGNI. There's no requirement for multi-provider support. A clean Qwen module is simpler and avoids premature abstraction. If a future provider switch is needed, the same pattern applies.

**Key interface change**: `generateText` will accept an array of `{role, content}` message objects (OpenAI format) instead of Gemini's `parts[]`. Each calling edge function will adapt its prompt construction — this is a small, localized change per function.

### 2. Image handling: signed URL passthrough instead of base64

**Decision**: Change `generateVisionJson` signature from `(prompt, bytes, mimeType)` to `(prompt, imageUrl)`. The caller is responsible for providing a URL.

**Current flow** (Gemini):

1. `process-bill` downloads image from Storage → gets `ArrayBuffer`
2. `generateVisionJson` converts bytes to base64
3. Sends as `inline_data` in Gemini request

**New flow** (Qwen):

1. `process-bill` generates a signed URL from Supabase Storage (for `storagePath` input) or uses the direct URL (for `imageUrl` input)
2. `generateVisionJson` passes the URL in `image_url.url` field
3. Qwen fetches the image server-side

**Why signed URLs?** The `bills` bucket is private. Qwen's servers need HTTP access to fetch the image. Supabase's `createSignedUrl()` provides time-limited access (5 minutes is sufficient for the API call round-trip). This avoids making the bucket public.

**Why not keep base64?** Qwen's vision API documentation shows URL-based input as the primary interface. While some OpenAI-compatible APIs support base64 data URIs, URL-based input is the documented and recommended approach for DashScope.

### 3. Model selection

| Use case           | Model          | Rationale                                                       |
| ------------------ | -------------- | --------------------------------------------------------------- |
| Text (voice, chat) | `qwen-plus`    | General-purpose, good at structured extraction and conversation |
| Vision (bill scan) | `qwen-vl-plus` | Multimodal model with image understanding capability            |

### 4. Environment variable: `DASHSCOPE_API_KEY`

**Decision**: Use `DASHSCOPE_API_KEY` as the env var name (matching Alibaba's convention). The API key is passed via `Authorization: Bearer $KEY` header.

### 5. Error code prefix: keep provider-agnostic

**Decision**: Rename error codes from `GEMINI_*` to `AI_*` (e.g., `AI_NOT_CONFIGURED`, `AI_REQUEST_FAILED`, `AI_EMPTY_RESPONSE`, `AI_JSON_PARSE_FAILED`). This avoids coupling error handling to a specific provider name.

## Risks / Trade-offs

**[Image URL accessibility]** → Qwen servers must be able to fetch signed URLs from Supabase Storage. Mitigation: Supabase Storage URLs are publicly routable; signed URLs grant temporary access. Set expiry to 300s (5 min) to limit exposure window.

**[Response format differences]** → Qwen's response JSON structure differs from Gemini's. Mitigation: Parse response in `qwen.js` using `choices[0].message.content` (OpenAI format) instead of `candidates[0].content.parts[].text`. Same `parseJsonFromText` utility handles JSON extraction from the text response.

**[Rate limits / quotas]** → DashScope may have different rate limits than Gemini. Mitigation: Current usage is low-volume (individual user transactions). Monitor 429 responses and add retry logic if needed in a follow-up.

**[API key in proposal]** → The user provided the actual API key in the change request. Mitigation: Store as Supabase secret (`supabase secrets set DASHSCOPE_API_KEY=...`), never hardcode in source.

## Migration Plan

1. Create `_shared/qwen.js` with the new provider implementation
2. Update all 3 edge functions to import from `qwen.js` and adapt message format
3. Set `DASHSCOPE_API_KEY` secret on Supabase project
4. Deploy all functions together (`supabase functions deploy`)
5. Remove `_shared/gemini.js`
6. Remove `GEMINI_API_KEY` from Supabase secrets

**Rollback**: If issues arise, revert the function code and re-deploy. `GEMINI_API_KEY` should be retained temporarily until the migration is verified.

## Open Questions

_(none — the scope is well-defined and the API contracts are documented)_
