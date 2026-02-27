# bill-processing-performance Specification

## Purpose

Defines performance observability and streaming architecture for the `process-bill` Edge Function — structured timing logs for each processing step, SSE streaming responses with incremental JSON extraction, and frontend real-time progress consumption.

## Requirements

### Requirement: Performance logging for key processing steps

The `process-bill` Edge Function SHALL log structured JSON timing data for each key processing step, enabling performance analysis via Supabase logs.

#### Scenario: Image download timing

- **WHEN** the Edge Function downloads an image from Supabase Storage and converts it to base64
- **THEN** it SHALL log a JSON object `{ event: "perf", step: "image_download", durationMs: <number>, meta: { storagePath: <string>, imageSizeBytes: <number> } }` to `console.log`

#### Scenario: AI request timing

- **WHEN** the Edge Function sends a request to the DashScope API and receives the complete response
- **THEN** it SHALL log a JSON object `{ event: "perf", step: "ai_request", durationMs: <number>, meta: { model: <string>, streamMode: <boolean>, totalTokens: <number|null> } }` to `console.log`

#### Scenario: Database operation timing

- **WHEN** the Edge Function completes all database operations (session creation + transaction inserts)
- **THEN** it SHALL log a JSON object `{ event: "perf", step: "db_operations", durationMs: <number>, meta: { sessionCreated: <boolean>, transactionsInserted: <number> } }` to `console.log`

#### Scenario: Total processing timing

- **WHEN** the Edge Function completes the entire bill processing flow (success or failure)
- **THEN** it SHALL log a JSON object `{ event: "perf", step: "total", durationMs: <number>, meta: { success: <boolean>, transactionCount: <number> } }` to `console.log`

### Requirement: Streaming response via Server-Sent Events

The `process-bill` Edge Function SHALL return a streaming SSE response to the client, sending progress events as transactions are recognized and stored.

#### Scenario: SSE response headers

- **WHEN** the Edge Function begins processing a valid bill request
- **THEN** it SHALL return an HTTP response with headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and CORS headers, with the body as a `ReadableStream`

#### Scenario: Transaction inserted event

- **WHEN** a single transaction is successfully extracted from the AI stream and inserted into the database
- **THEN** the Edge Function SHALL send an SSE event `data: {"type":"transaction_inserted","data":<transaction_object>,"progress":{"completed":<number>}}\n\n`

#### Scenario: Processing complete event

- **WHEN** all transactions have been extracted, inserted, and the session record updated
- **THEN** the Edge Function SHALL send a final SSE event `data: {"type":"completed","session_id":<string>,"total_count":<number>,"total_amount":<number>}\n\n` and close the stream

#### Scenario: Processing error event

- **WHEN** an unrecoverable error occurs during streaming (AI failure, auth error, etc.)
- **THEN** the Edge Function SHALL send an SSE event `data: {"type":"error","message":<string>}\n\n` and close the stream

### Requirement: Streaming AI response consumption with incremental JSON extraction

The `process-bill` Edge Function SHALL consume DashScope's streaming SSE response and incrementally extract complete transaction JSON objects as they arrive, inserting each into the database without waiting for the full response.

#### Scenario: Streaming request to DashScope

- **WHEN** the Edge Function calls the DashScope API for bill image recognition
- **THEN** it SHALL set `stream: true` in the request body to enable Server-Sent Events streaming

#### Scenario: Incremental object extraction

- **WHEN** SSE chunks from DashScope accumulate text containing a complete transaction object (a `{...}` block followed by `,` or `]`)
- **THEN** the Edge Function SHALL parse that object, normalize it via `normalizeTransaction()`, and insert it into the `transactions` table immediately

#### Scenario: Final reconciliation

- **WHEN** the DashScope stream ends (receives `data: [DONE]`)
- **THEN** the Edge Function SHALL perform a final full JSON parse of the accumulated text and insert any remaining transaction objects that were not captured during incremental extraction

### Requirement: Session lifecycle for streaming processing

The `process-bill` Edge Function SHALL create the `input_session` record before streaming begins and update it with final aggregates after streaming completes.

#### Scenario: Session creation before streaming

- **WHEN** the Edge Function begins processing a bill and before the first transaction is inserted
- **THEN** it SHALL create an `input_session` record with `record_count: 0`, `total_amount: 0`, and `source: 'bill_scan'`

#### Scenario: Session update after streaming completes

- **WHEN** all transactions have been inserted and the stream is closing
- **THEN** it SHALL update the `input_session` record with the final `record_count` (number of successfully inserted transactions) and `total_amount` (sum of all inserted transaction amounts)

### Requirement: Frontend SSE consumption for real-time progress

The `transactionService.uploadBill()` method SHALL consume the streaming SSE response from `process-bill` and provide real-time progress updates to the caller.

#### Scenario: Direct fetch instead of supabase.functions.invoke

- **WHEN** `uploadBill` calls the `process-bill` Edge Function
- **THEN** it SHALL use `fetch()` directly with manual `Authorization: Bearer <access_token>` header instead of `supabase.functions.invoke()`, to access the raw `ReadableStream`

#### Scenario: Progressive transaction collection

- **WHEN** `uploadBill` receives `transaction_inserted` SSE events
- **THEN** it SHALL accumulate the transaction objects and invoke a progress callback (if provided) with the current count and latest transaction data

#### Scenario: Final result assembly

- **WHEN** `uploadBill` receives the `completed` SSE event
- **THEN** it SHALL return the complete `{ session, transactions }` result object, consistent with the current return type contract
