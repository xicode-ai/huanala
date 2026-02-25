## ADDED Requirements

### Requirement: Bill image storage

The system SHALL upload bill/receipt images to a Supabase Storage bucket named `bills`. Files MUST be stored under a path prefixed with the user's ID to enforce ownership.

#### Scenario: Successful upload

- **WHEN** the user selects a photo from album or camera on the Home page
- **THEN** the system SHALL upload the image to `bills/{user_id}/{timestamp}.{ext}` via `supabase.storage.from('bills').upload()` and receive a file path in return

#### Scenario: Upload failure

- **WHEN** the image upload fails (network error, file too large)
- **THEN** the system SHALL display an error message and allow the user to retry

#### Scenario: Storage access control

- **WHEN** an authenticated user accesses the `bills` bucket
- **THEN** the RLS policy SHALL only allow operations on files within their own `{user_id}/` folder

### Requirement: Bill OCR via Edge Function

The system SHALL provide a Supabase Edge Function named `process-bill` that receives a bill image URL, uses Gemini Vision to extract transaction data, and inserts a new transaction record.

#### Scenario: Successful bill processing

- **WHEN** the `process-bill` Edge Function is called with a valid `image_url` and JWT
- **THEN** the function SHALL download the image, send it to Gemini 2.0 Flash with a prompt requesting JSON extraction of `{title, amount, currency, category, merchant}`, insert a transaction with `source: 'bill_scan'`, and return the created transaction

#### Scenario: Unrecognizable bill

- **WHEN** Gemini cannot extract structured data from the image (blurry, not a receipt)
- **THEN** the function SHALL return HTTP 422 with `{ "error": "Could not extract transaction data from image" }`

#### Scenario: Unauthenticated request

- **WHEN** the function is called without a valid JWT
- **THEN** it SHALL return HTTP 401 with `{ "error": "Unauthorized" }`

#### Scenario: Missing image URL

- **WHEN** the request body does not contain `image_url`
- **THEN** the function SHALL return HTTP 400 with `{ "error": "image_url is required" }`

### Requirement: Frontend bill upload flow

The system SHALL orchestrate the bill upload flow: upload image to Storage, call `process-bill` Edge Function, and add the resulting transaction to the store.

#### Scenario: End-to-end bill flow

- **WHEN** the user uploads a bill photo on the Home page
- **THEN** the system SHALL show an "Analyzing..." loading state, upload the image, call `process-bill`, receive the transaction, add it to `useTransactionStore`, and dismiss the loading state

#### Scenario: Processing error

- **WHEN** any step in the bill flow fails
- **THEN** the system SHALL display an error message and the `isUploading` flag SHALL be set to false
