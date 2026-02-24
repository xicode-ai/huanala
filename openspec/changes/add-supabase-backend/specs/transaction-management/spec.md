## ADDED Requirements

### Requirement: Transactions database table

The system SHALL store all transaction records in a Supabase `transactions` table with row-level security. Each transaction MUST be associated with a `user_id` and only accessible by its owner.

#### Scenario: Table structure

- **WHEN** the database migration is applied
- **THEN** the `transactions` table SHALL contain columns: `id` (UUID PK), `user_id` (UUID FK to auth.users), `title` (TEXT), `amount` (DECIMAL), `currency` (TEXT), `category` (TEXT), `icon` (TEXT), `icon_bg` (TEXT), `icon_color` (TEXT), `type` (expense/income), `note` (TEXT), `merchant` (TEXT), `description` (TEXT), `source` (manual/voice/bill_scan), `created_at` (TIMESTAMPTZ)

#### Scenario: Row-level security enforcement

- **WHEN** an authenticated user queries the `transactions` table
- **THEN** the RLS policy SHALL ensure they can only SELECT, INSERT, UPDATE, and DELETE rows where `user_id` matches `auth.uid()`

#### Scenario: Unauthenticated access blocked

- **WHEN** an unauthenticated request attempts to access the `transactions` table
- **THEN** the request SHALL return zero rows and no error (RLS silently filters)

### Requirement: Fetch user transactions

The system SHALL retrieve all transactions for the authenticated user from the Supabase database, ordered by creation time descending (newest first).

#### Scenario: Successful fetch

- **WHEN** the Home page loads and the user is authenticated
- **THEN** the system SHALL call `supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })` and populate the transaction list

#### Scenario: No transactions

- **WHEN** a new user has no transaction records
- **THEN** the system SHALL return an empty array and the UI SHALL display an empty state

#### Scenario: Fetch error

- **WHEN** the database query fails (network error, etc.)
- **THEN** the system SHALL log the error and display a user-friendly message without crashing

### Requirement: Create transaction from manual input

The system SHALL allow creating a new transaction record by inserting a row into the `transactions` table with `source: 'manual'`.

#### Scenario: Successful creation

- **WHEN** a transaction is created (from any source: manual, voice, bill)
- **THEN** the system SHALL insert a row into `transactions` with the authenticated user's `user_id`, and the new transaction SHALL appear in the transaction list immediately

### Requirement: User financial summary computation

The system SHALL compute `monthlyExpenses`, `balance`, `dailyAvailable`, `budgetUsedPercent`, and `leftAmount` from the user's transaction records on the client side.

#### Scenario: Monthly expenses calculation

- **WHEN** transactions are loaded for the current month
- **THEN** the system SHALL sum all `type: 'expense'` amounts to compute `monthlyExpenses`, and display it on the Home page balance card

#### Scenario: No data available

- **WHEN** the user has no transactions for the current month
- **THEN** all financial summary values SHALL display as zero
