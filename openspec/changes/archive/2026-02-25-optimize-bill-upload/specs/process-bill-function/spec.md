## MODIFIED Requirements

### Requirement: Process Uploaded Bill Image

The system SHALL process uploaded bill images to extract transaction data using an LLM.

#### Scenario: Edge Function Processing

- **WHEN** the client invokes `process-bill` with the image `filePath` (or relative path in bucket)
- **THEN** the edge function directly reads the image from Supabase Storage instead of downloading it via a public URL.

#### Scenario: LLM Invocation Payload

- **WHEN** the edge function prepares the payload for the LLM
- **THEN** the image MUST be passed as a base64 encoded string (`data:image/jpeg;base64,...`) instead of a URL.
