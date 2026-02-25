## ADDED Requirements

### Requirement: Input session table

The database SHALL have an `input_sessions` table that groups multiple transactions created from a single user input (voice, image, or manual).

#### Scenario: Table structure

- **WHEN** the migration is applied
- **THEN** the `input_sessions` table SHALL exist with columns: `id` (UUID PK, auto-generated), `user_id` (UUID FK → auth.users, NOT NULL, CASCADE DELETE), `source` (TEXT NOT NULL, CHECK IN 'voice'/'bill_scan'/'manual'), `raw_input` (TEXT, nullable), `ai_raw_output` (JSONB, nullable), `record_count` (INTEGER DEFAULT 0), `created_at` (TIMESTAMPTZ DEFAULT now())

#### Scenario: RLS policies

- **WHEN** a user queries `input_sessions`
- **THEN** RLS SHALL enforce that users can only SELECT, INSERT, and DELETE their own sessions (WHERE `auth.uid() = user_id`)

### Requirement: Transaction session foreign key

The `transactions` table SHALL have a nullable `session_id` column referencing `input_sessions.id`.

#### Scenario: Adding session_id column

- **WHEN** the migration is applied
- **THEN** `transactions` SHALL have a new column `session_id` (UUID, nullable, FK → input_sessions.id ON DELETE SET NULL) with an index on `session_id`

#### Scenario: Backward compatibility

- **WHEN** existing transactions have no session association
- **THEN** their `session_id` SHALL be NULL and they SHALL continue to function normally in all queries and UI rendering

### Requirement: Batch transaction creation flow

Edge Functions SHALL create an `input_sessions` record before inserting transactions, and link all transactions to that session.

#### Scenario: Session creation before transactions

- **WHEN** an Edge Function (process-voice or process-bill) successfully parses AI output into N transaction items
- **THEN** it SHALL first insert one `input_sessions` record with the user's `user_id`, the appropriate `source`, and `raw_input` (transcript text or storage path), then insert all N transactions with `session_id` set to the new session's `id`

#### Scenario: Session record_count update

- **WHEN** all transactions for a session are successfully inserted
- **THEN** the Edge Function SHALL update the session's `record_count` to the number of inserted transactions

#### Scenario: Response format

- **WHEN** batch creation succeeds
- **THEN** the Edge Function SHALL return `{ session_id: string, transactions: Transaction[] }` where `transactions` is the array of all inserted records with their generated IDs
