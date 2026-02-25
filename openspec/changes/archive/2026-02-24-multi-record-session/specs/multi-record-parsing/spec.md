## ADDED Requirements

### Requirement: Multi-transaction voice extraction

The `process-voice` Edge Function SHALL extract ALL transactions mentioned in a transcript, not just one.

#### Scenario: Multiple items in transcript

- **WHEN** `process-voice` receives a transcript containing multiple expense/income items (e.g., "午饭35，打车20，咖啡18")
- **THEN** it SHALL send a prompt requesting extraction of ALL transactions and return a `{ transactions: [...] }` array containing one entry per item

#### Scenario: Single item in transcript

- **WHEN** `process-voice` receives a transcript containing only one item
- **THEN** it SHALL still return `{ transactions: [...] }` with a single-element array (never a bare object)

#### Scenario: Voice prompt format

- **WHEN** the AI is called for voice processing
- **THEN** the system prompt SHALL instruct: "Extract ALL transactions from the transcript. Return JSON only. Schema: {\"transactions\": [{\"title\": string, \"amount\": number, \"currency\": string, \"category\": string, \"type\": \"expense\"|\"income\"}, ...]}. If only one item mentioned, still return array with one element."

#### Scenario: Empty or unparseable extraction

- **WHEN** the AI returns a response where `transactions` is not an array or is empty
- **THEN** the Edge Function SHALL return HTTP 422 with `{ error: "Could not extract transaction data" }`

### Requirement: Multi-transaction bill extraction

The `process-bill` Edge Function SHALL extract ALL line items from a receipt or purchase order image, not just one.

#### Scenario: Multi-item receipt

- **WHEN** `process-bill` receives an image of a receipt or purchase order containing multiple line items
- **THEN** it SHALL send a prompt requesting extraction of ALL line items and return a `{ transactions: [...] }` array containing one entry per line item

#### Scenario: Single-item receipt

- **WHEN** `process-bill` receives an image with only one item
- **THEN** it SHALL still return `{ transactions: [...] }` with a single-element array

#### Scenario: Bill prompt format

- **WHEN** the AI is called for bill processing
- **THEN** the system prompt SHALL instruct: "Extract ALL line items from this receipt/purchase order image. Return JSON only. Schema: {\"transactions\": [{\"title\": string, \"amount\": number, \"currency\": string, \"category\": string, \"merchant\": string}, ...]}. Each line item is a separate transaction. Do not combine items."

#### Scenario: Invalid extraction result

- **WHEN** the AI returns a response where `transactions` is not an array, is empty, or every item has an invalid amount (not a positive finite number)
- **THEN** the Edge Function SHALL return HTTP 422 with `{ error: "Could not extract transaction data from image" }`

### Requirement: Frontend multi-record handling

The frontend service and store layers SHALL handle arrays of transactions from voice and bill processing.

#### Scenario: transactionService returns array

- **WHEN** `transactionService.uploadBill()` or `transactionService.processVoice()` completes successfully
- **THEN** it SHALL return `Transaction[]` (array) instead of a single `Transaction`

#### Scenario: Store batch addition

- **WHEN** the transaction store receives multiple transactions from a single input
- **THEN** it SHALL prepend all transactions to the list at once via an `addTransactions(txs: Transaction[])` method

#### Scenario: UI feedback for batch creation

- **WHEN** a batch of N transactions is created from a single input (where N ≥ 1)
- **THEN** the Home page SHALL display a Toast notification indicating "已创建 N 条记录" (N records created)
