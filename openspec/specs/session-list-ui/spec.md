# session-list-ui Specification

## Purpose

TBD - created by archiving change session-aggregation-and-pagination. Update Purpose after archive.

## Requirements

### Requirement: Home page queries input_sessions table directly

The system SHALL query the `input_sessions` table directly for the home page listing, using `created_at DESC` ordering with offset-based pagination. The system SHALL NOT query the `transactions` table or perform client-side groupBy aggregation for the home listing.

#### Scenario: Initial page load

- **WHEN** the user opens the home page
- **THEN** the system fetches the first page (20 records) from `input_sessions` ordered by `created_at DESC`
- **AND** renders each session as a card showing source icon, total amount, record count, and timestamp

#### Scenario: No sessions exist

- **WHEN** the user opens the home page and has no `input_sessions` records
- **THEN** the system displays an empty state indicating no records found

### Requirement: Session card displays denormalized summary

Each session card SHALL display the session's `source` (with a corresponding icon and label), `total_amount` (formatted with `currency`), `record_count`, and `created_at` date/time. These fields are read directly from `input_sessions` — no JOIN or sub-query required.

#### Scenario: Voice session card

- **WHEN** an `input_session` with `source = 'voice'` is rendered
- **THEN** the card displays a microphone icon, label "语音记账", total amount, record count, and creation time

#### Scenario: Bill scan session card

- **WHEN** an `input_session` with `source = 'bill_scan'` is rendered
- **THEN** the card displays a receipt icon, label "图片记账", total amount, record count, and creation time

#### Scenario: Manual session card

- **WHEN** an `input_session` with `source = 'manual'` is rendered
- **THEN** the card displays a keyboard icon, label "手动记账", total amount, record count, and creation time

### Requirement: Infinite scroll pagination for sessions

The system SHALL implement infinite scroll on the session list using IntersectionObserver. When the user scrolls to the bottom sentinel element, the next page of sessions is fetched and appended.

#### Scenario: Scroll triggers next page load

- **WHEN** the user scrolls to the bottom of the session list and more pages exist (`hasMore = true`)
- **THEN** the system fetches the next page of `input_sessions` and appends them to the list
- **AND** a loading indicator is shown during the fetch

#### Scenario: All sessions loaded

- **WHEN** the user scrolls to the bottom and no more pages exist (`hasMore = false`)
- **THEN** the system displays a "没有更多了" message and does not issue further queries

#### Scenario: Concurrent scroll events

- **WHEN** the user scrolls rapidly and the sentinel is observed multiple times while a fetch is in progress (`isFetchingMore = true`)
- **THEN** the system SHALL NOT issue duplicate fetch requests

### Requirement: Session card navigates to detail page

Each session card SHALL be tappable/clickable. Tapping navigates to `/session/:id` where `:id` is the session's UUID.

#### Scenario: User taps a session card

- **WHEN** the user taps a session card
- **THEN** the app navigates to `/session/{session.id}`

### Requirement: InputSession type definition

The system SHALL define an `InputSession` TypeScript interface with fields: `id` (string), `source` ('voice' | 'bill_scan' | 'manual'), `recordCount` (number), `totalAmount` (number), `currency` (string), `date` (string), `time` (string), `createdAt` (string).

#### Scenario: Type is used throughout frontend

- **WHEN** session data is fetched from Supabase
- **THEN** it is mapped to the `InputSession` interface with snake_case → camelCase conversion
- **AND** the store, service, and UI layers all reference `InputSession` consistently

### Requirement: Store manages sessions instead of transactions

The `useTransactionStore` SHALL manage an `InputSession[]` array as its primary list state. It SHALL expose `fetchSessions()` for initial load, `fetchMoreSessions()` for pagination, and upload methods that prepend the newly created session to the list.

#### Scenario: Upload creates and prepends session

- **WHEN** the user completes a voice or bill scan upload
- **THEN** the edge function returns `{ session, transactions }`
- **AND** the store prepends the new `InputSession` to the `sessions` array so it appears at the top of the list immediately

### Requirement: Database schema adds total_amount and currency to input_sessions

A migration SHALL add `total_amount NUMERIC DEFAULT 0` and `currency TEXT DEFAULT '¥'` columns to `input_sessions`. It SHALL delete all `transactions` rows where `session_id IS NULL`. It SHALL backfill existing sessions by summing their linked transactions.

#### Scenario: Migration runs on production

- **WHEN** `supabase db push` is executed
- **THEN** `input_sessions` gains `total_amount` and `currency` columns
- **AND** all transactions without a `session_id` are deleted
- **AND** existing sessions have `total_amount` computed from `SUM(transactions.amount)` and `currency` from the first linked transaction

### Requirement: Edge functions write denormalized fields at session creation

Both `process-voice` and `process-bill` edge functions SHALL compute `total_amount`, `currency`, and `record_count` from the parsed AI output and write them into `input_sessions` at INSERT time, in a single INSERT statement (no separate UPDATE).

#### Scenario: Voice function creates session with totals

- **WHEN** the voice edge function processes a transcript with 3 transactions totaling ¥150
- **THEN** it inserts an `input_session` with `total_amount = 150`, `currency = '¥'`, `record_count = 3`

#### Scenario: Bill function creates session with totals

- **WHEN** the bill edge function processes an image with 5 line items totaling ¥320
- **THEN** it inserts an `input_session` with `total_amount = 320`, `currency = '¥'`, `record_count = 5`
