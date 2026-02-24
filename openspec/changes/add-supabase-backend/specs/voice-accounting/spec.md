## ADDED Requirements

### Requirement: Voice transcript parsing via Edge Function

The system SHALL provide a Supabase Edge Function named `process-voice` that receives a voice transcript text, uses Gemini to parse it into structured transaction data, and inserts a new transaction record.

#### Scenario: Successful voice parsing

- **WHEN** the `process-voice` Edge Function is called with `{ "transcript": "今天打车花了45块" }` and a valid JWT
- **THEN** the function SHALL send the transcript to Gemini 2.0 Flash with a prompt requesting JSON extraction of `{title, amount, currency, category, type}`, insert a transaction with `source: 'voice'`, and return the created transaction

#### Scenario: Ambiguous transcript

- **WHEN** Gemini cannot confidently extract all fields (e.g., transcript is "买了点东西" without amount)
- **THEN** the function SHALL return the best-effort extraction with missing fields set to reasonable defaults (e.g., amount: 0, category: "Other") and include a `"warning": "incomplete_extraction"` flag

#### Scenario: Empty transcript

- **WHEN** the request body contains an empty or missing `transcript` field
- **THEN** the function SHALL return HTTP 400 with `{ "error": "Transcript is required" }`

#### Scenario: Unauthenticated request

- **WHEN** the function is called without a valid JWT
- **THEN** it SHALL return HTTP 401 with `{ "error": "Unauthorized" }`

#### Scenario: Gemini API failure

- **WHEN** the Gemini API is unreachable or returns an error
- **THEN** the function SHALL return HTTP 502 with `{ "error": "AI service unavailable" }`

### Requirement: Frontend voice accounting flow

The system SHALL replace the mock `Api.uploadVoice` with a call to the `process-voice` Edge Function. The `useTransactionStore` interface SHALL remain unchanged.

#### Scenario: Voice transcript submitted

- **WHEN** the user completes a voice recording on the Home page and the transcript is available
- **THEN** the system SHALL call `supabase.functions.invoke('process-voice', { body: { transcript } })`, receive the created transaction, and add it to the store

#### Scenario: Multi-language support

- **WHEN** the user speaks in Chinese, English, or a mix of both
- **THEN** the Gemini prompt SHALL handle code-switching and extract transaction data regardless of input language

#### Scenario: Processing error

- **WHEN** the Edge Function call fails
- **THEN** the system SHALL display an error message without crashing, and the `isUploading` flag SHALL be set to false
