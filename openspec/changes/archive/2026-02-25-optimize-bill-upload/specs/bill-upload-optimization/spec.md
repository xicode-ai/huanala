## ADDED Requirements

### Requirement: Client-Side Image Compression

The system SHALL compress bill images on the client side before uploading them to Supabase Storage. The compression quality MUST be set within the range of 0.65 to 0.8.

#### Scenario: User selects an image for upload

- **WHEN** a user selects a bill image from their device
- **THEN** the client application compresses the image to a quality of 0.65-0.8 before initiating the upload to Supabase Storage.
