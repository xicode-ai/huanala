## ADDED Requirements

### Requirement: Qwen text generation

The shared AI module SHALL provide a `generateText(messages)` function that sends an array of `{role, content}` message objects to the DashScope API endpoint (`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`) using model `qwen-plus` and returns the assistant's text response.

#### Scenario: Successful text generation

- **WHEN** `generateText` is called with valid messages `[{role: "system", content: "..."}, {role: "user", content: "..."}]`
- **THEN** the module SHALL send a POST request to the DashScope API with `Authorization: Bearer $DASHSCOPE_API_KEY` header, model `qwen-plus`, and the messages array, and return the text content from `choices[0].message.content`

#### Scenario: Empty response from model

- **WHEN** the API returns a response where `choices[0].message.content` is empty or whitespace-only
- **THEN** the module SHALL throw an error with code `AI_EMPTY_RESPONSE`

#### Scenario: API request failure

- **WHEN** the DashScope API returns a non-2xx HTTP status
- **THEN** the module SHALL throw an error with code `AI_REQUEST_FAILED` including the HTTP status and response body

### Requirement: Qwen vision analysis

The shared AI module SHALL provide a `generateVisionJson(prompt, imageUrl)` function that sends a text prompt and an image URL to the DashScope API using model `qwen-vl-plus` and returns the parsed JSON object from the model's response.

#### Scenario: Successful image analysis with URL

- **WHEN** `generateVisionJson` is called with a prompt string and an image URL
- **THEN** the module SHALL send a POST request to the DashScope API with model `qwen-vl-plus`, a user message containing `[{type: "image_url", image_url: {url: imageUrl}}, {type: "text", text: prompt}]`, and return the parsed JSON object from the response text

#### Scenario: JSON extraction from response

- **WHEN** the model returns text containing a JSON object (possibly wrapped in markdown or extra text)
- **THEN** the module SHALL extract and parse the JSON object, searching for the first `{` to last `}` if direct parsing fails

#### Scenario: Unparseable response

- **WHEN** the model response contains no valid JSON object
- **THEN** the module SHALL throw an error with code `AI_JSON_PARSE_FAILED`

### Requirement: API key configuration check

The shared AI module SHALL provide an `ensureConfigured()` function that verifies the `DASHSCOPE_API_KEY` environment variable is set and non-empty.

#### Scenario: API key is configured

- **WHEN** `ensureConfigured()` is called and `DASHSCOPE_API_KEY` env var is set
- **THEN** the function SHALL return `true`

#### Scenario: API key is missing

- **WHEN** `ensureConfigured()` is called and `DASHSCOPE_API_KEY` env var is not set or empty
- **THEN** the function SHALL return `false`

### Requirement: Edge function import migration

All three edge functions (`process-voice`, `process-bill`, `ai-chat`) SHALL import from `_shared/qwen.js` instead of `_shared/gemini.js` and adapt their prompt construction to the OpenAI-compatible message format.

#### Scenario: Voice processing uses Qwen text

- **WHEN** `process-voice` receives a transcript
- **THEN** it SHALL call `generateText` with messages `[{role: "system", content: VOICE_PROMPT}, {role: "user", content: "Transcript: ..."}]` and the response/insert contract SHALL remain unchanged

#### Scenario: Bill processing uses Qwen vision with signed URL

- **WHEN** `process-bill` receives a `storage_path`
- **THEN** it SHALL generate a signed URL (300s expiry) from the `bills` storage bucket and pass it to `generateVisionJson(prompt, signedUrl)` instead of downloading the image bytes

#### Scenario: Bill processing uses Qwen vision with direct URL

- **WHEN** `process-bill` receives an `image_url`
- **THEN** it SHALL pass the URL directly to `generateVisionJson(prompt, imageUrl)` without downloading the image

#### Scenario: AI chat uses Qwen text

- **WHEN** `ai-chat` receives a user message
- **THEN** it SHALL call `generateText` with messages `[{role: "system", content: SYSTEM_PROMPT}, {role: "user", content: message}]` and the response/insert contract SHALL remain unchanged

### Requirement: Gemini module removal

After migration, `_shared/gemini.js` SHALL be deleted and no references to Gemini API, `GEMINI_API_KEY`, or `generativelanguage.googleapis.com` SHALL remain in the edge functions codebase.

#### Scenario: Clean removal

- **WHEN** all edge functions have been migrated to `qwen.js`
- **THEN** `_shared/gemini.js` SHALL be deleted and no file in `supabase/functions/` SHALL contain imports from or references to `gemini.js`
