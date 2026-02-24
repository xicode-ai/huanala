## Why

The current AI backend relies on Google Gemini (`gemini-2.0-flash`) for voice bookkeeping, image/receipt bookkeeping, and AI chat. We need to switch to Alibaba Qwen (DashScope API) to use `qwen-plus` for text and `qwen-vl-plus` for vision. This reduces dependency on Google services and aligns with the target deployment region.

## What Changes

- **BREAKING**: Replace `_shared/gemini.js` with a new Qwen-compatible shared module using the DashScope OpenAI-compatible API (`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`)
- **BREAKING**: Environment variable changes — `GEMINI_API_KEY` replaced by `DASHSCOPE_API_KEY`
- Modify `process-voice/index.js` to use the new Qwen text provider (model: `qwen-plus`)
- Modify `process-bill/index.js` to use the new Qwen vision provider (model: `qwen-vl-plus`) with URL-based image input instead of base64 inline data
- Modify `ai-chat/index.js` to use the new Qwen text provider (model: `qwen-plus`)
- Change image handling flow for `process-bill`: instead of downloading images and encoding to base64, upload to Supabase Storage and pass a signed public URL to Qwen's vision API

## Capabilities

### New Capabilities

- `qwen-ai-provider`: Shared AI provider module for DashScope/Qwen API integration, covering text generation (`qwen-plus`) and vision/image understanding (`qwen-vl-plus`) with OpenAI-compatible message format

### Modified Capabilities

_(none — existing specs `auth-interceptor`, `auth-provider`, `speech-to-text` are unaffected)_

## Impact

- **Code**: `supabase/functions/_shared/gemini.js` replaced; all 3 edge functions (`process-voice`, `process-bill`, `ai-chat`) updated to use new provider
- **API format change**: Gemini uses proprietary `parts[]` request format → Qwen uses OpenAI-compatible `messages[]` format with `role`/`content` structure
- **Image handling change**: Gemini accepts base64 `inline_data` → Qwen vision accepts `image_url` with a URL reference. Images already in Supabase Storage (`bills` bucket) will use signed URLs; direct URL inputs can be passed through
- **Environment**: New secret `DASHSCOPE_API_KEY` must be set on Supabase project; old `GEMINI_API_KEY` can be removed
- **No frontend changes**: Edge function request/response contracts remain identical — callers are unaffected
