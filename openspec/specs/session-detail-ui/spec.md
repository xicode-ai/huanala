# session-detail-ui Specification

## Purpose

TBD - created by archiving change session-aggregation-and-pagination. Update Purpose after archive.

## Requirements

### Requirement: Session detail page at /session/:id

The system SHALL provide a dedicated page at route `/session/:id` that displays the full detail of a single bookkeeping session, including a summary header and a list of all transactions belonging to that session.

#### Scenario: User navigates to session detail

- **WHEN** the user navigates to `/session/:id` with a valid session UUID
- **THEN** the system queries `transactions WHERE session_id = :id`
- **AND** renders the summary header and transaction list

#### Scenario: Session has no transactions

- **WHEN** the user navigates to `/session/:id` and the query returns zero transactions
- **THEN** the system displays the header with ¥0.00 and an empty transaction list

### Requirement: Session detail summary header

The detail page SHALL display a summary card at the top showing total expense amount, total income amount (if any), record count, date, and time. These values are computed from the fetched transactions.

#### Scenario: Expense-only session

- **WHEN** all transactions in the session have `type = 'expense'`
- **THEN** the summary card shows the total expense amount prominently and the record count
- **AND** income section is not displayed

#### Scenario: Mixed expense and income session

- **WHEN** the session contains both expense and income transactions
- **THEN** the summary card shows the total expense amount prominently
- **AND** displays total income separately with a green "+¥" prefix

### Requirement: Transaction timeline list

The detail page SHALL render each transaction in a vertical timeline layout. Each entry shows the time, category icon with colored badge, amount, title, optional note, optional merchant, and optional AI description.

#### Scenario: Transaction with all fields populated

- **WHEN** a transaction has title, amount, category, merchant, note, and AI description
- **THEN** all fields are displayed: category icon badge, amount in a pill, title in bold, note text, merchant with store icon, and AI description in a chat-bubble style block

#### Scenario: Transaction with minimal fields

- **WHEN** a transaction has only title and amount (no merchant, note, or description)
- **THEN** only the category icon badge, amount pill, and title are rendered

#### Scenario: Timeline connector between items

- **WHEN** multiple transactions are displayed
- **THEN** a vertical line connects consecutive entries except after the last item

### Requirement: Back navigation from detail page

The detail page header SHALL include a back button that navigates the user to the previous page in browser history.

#### Scenario: User taps back button

- **WHEN** the user taps the back arrow in the session detail header
- **THEN** the app calls `navigate(-1)` to return to the previous page

### Requirement: Loading skeleton on detail page

The detail page SHALL display a skeleton loading state while transactions are being fetched.

#### Scenario: Data is loading

- **WHEN** the session detail page is mounted and data has not yet arrived
- **THEN** skeleton placeholders are shown for both the summary card and the transaction list

#### Scenario: Data finishes loading

- **WHEN** the transaction data fetch completes
- **THEN** skeleton placeholders are replaced with actual content with slide-in animation

### Requirement: Route protection for session detail

The `/session/:id` route SHALL be wrapped in `ProtectedRoute` to ensure only authenticated users can access it.

#### Scenario: Unauthenticated user accesses detail page

- **WHEN** an unauthenticated user navigates to `/session/:id`
- **THEN** the app redirects to the login page

#### Scenario: Authenticated user accesses detail page

- **WHEN** an authenticated user navigates to `/session/:id`
- **THEN** the session detail page renders normally
