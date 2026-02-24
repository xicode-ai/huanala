## ADDED Requirements

### Requirement: AI chat Edge Function

The system SHALL provide a Supabase Edge Function named `ai-chat` that accepts a user message, forwards it to the Google Gemini 2.0 Flash API, and returns the AI-generated response. The function MUST verify the caller's JWT before processing.

#### Scenario: Successful AI response

- **WHEN** an authenticated user sends a POST request to `/functions/v1/ai-chat` with body `{ "message": "<user text>" }`
- **THEN** the function SHALL call the Gemini `generateContent` endpoint, extract the text response, and return `{ "reply": "<ai text>" }` with HTTP 200

#### Scenario: Empty message

- **WHEN** the request body contains an empty or missing `message` field
- **THEN** the function SHALL return HTTP 400 with `{ "error": "Message is required" }`

#### Scenario: Unauthenticated request

- **WHEN** a request is made without a valid JWT in the Authorization header
- **THEN** the function SHALL return HTTP 401 with `{ "error": "Unauthorized" }`

#### Scenario: Gemini API failure

- **WHEN** the Gemini API returns an error or is unreachable
- **THEN** the function SHALL return HTTP 502 with `{ "error": "AI service unavailable" }` and log the underlying error for debugging

#### Scenario: Gemini API key not configured

- **WHEN** the `GEMINI_API_KEY` secret is not set in the Edge Function environment
- **THEN** the function SHALL return HTTP 500 with `{ "error": "AI service not configured" }`

### Requirement: Gemini API key stored as server secret

The Gemini API key SHALL be stored as a Supabase Edge Function secret (`GEMINI_API_KEY`) and MUST NOT be exposed to the frontend client under any circumstance.

#### Scenario: Key access in Edge Function

- **WHEN** the `ai-chat` Edge Function executes
- **THEN** it SHALL read the Gemini API key from `Deno.env.get('GEMINI_API_KEY')` and use it in the `X-goog-api-key` header when calling the Gemini API

#### Scenario: Key not in client bundle

- **WHEN** the frontend application is built
- **THEN** the Gemini API key SHALL NOT appear in any client-side JavaScript bundle, environment variable, or network request originating from the browser

### Requirement: Chat history persistence

The system SHALL persist all chat messages (both user and AI) in the Supabase `messages` table. Chat history SHALL be loaded from the database when the Chat page opens.

#### Scenario: User message stored

- **WHEN** a user sends a chat message
- **THEN** the `ai-chat` Edge Function SHALL insert a row into `messages` with `sender: 'user'`, `text: <user message>`, and the authenticated user's `user_id`

#### Scenario: AI reply stored

- **WHEN** the Gemini API returns a response
- **THEN** the `ai-chat` Edge Function SHALL insert a row into `messages` with `sender: 'ai'`, `text: <ai reply>`, and the user's `user_id`

#### Scenario: Chat history loaded on page open

- **WHEN** the user navigates to the Chat page
- **THEN** the system SHALL fetch all messages for the current user from the `messages` table ordered by `created_at` ascending and display them in the chat UI

#### Scenario: Messages table RLS

- **WHEN** an authenticated user queries the `messages` table
- **THEN** they SHALL only see messages where `user_id` matches `auth.uid()`

### Requirement: Frontend AI chat integration

The system SHALL replace the mock `Api.sendMessage` with a real call to the `ai-chat` Edge Function via `supabase.functions.invoke`. The `useChatStore` interface SHALL remain unchanged.

#### Scenario: Sending a chat message

- **WHEN** the user sends a message via the Chat page
- **THEN** the system SHALL call `supabase.functions.invoke('ai-chat', { body: { message: text } })`, receive the AI reply, and append it to the messages list in the store

#### Scenario: AI response displayed as message

- **WHEN** the Edge Function returns a successful response
- **THEN** the system SHALL create a `Message` object with `sender: 'ai'`, `text` set to the reply content, and `type: 'text'`, and add it to the chat messages array

#### Scenario: Error during AI chat

- **WHEN** the Edge Function call fails (network error, 4xx, 5xx)
- **THEN** the system SHALL display an error message in the chat UI (e.g., "Failed to get AI response, please try again") without crashing the application

#### Scenario: Chat while unauthenticated

- **WHEN** a user attempts to send a chat message without being authenticated
- **THEN** the system SHALL prevent the API call and redirect the user to the login page
