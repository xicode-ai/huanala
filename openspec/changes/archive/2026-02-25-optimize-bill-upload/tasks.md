## 1. Client-Side Image Compression

- [x] 1.1 Identify the file upload handlers (likely in `pages/` or `components/` where bills are uploaded).
- [x] 1.2 Implement or integrate an image compression utility (using Canvas API or a lightweight library) to compress images to 0.65-0.8 quality before uploading to Supabase Storage.
- [ ] 1.3 Verify that the user experience (loading states) is smooth during compression.

## 2. Edge Function: `process-bill`

- [x] 2.1 Update `process-bill` to accept a storage path instead of a public URL (or parse the path from the URL if backward compatibility is needed temporarily).
- [x] 2.2 Implement logic in `process-bill` to download the image directly from the `bills` storage bucket using the Supabase client.
- [x] 2.3 Convert the downloaded image buffer/blob to a base64 encoded string (`data:image/jpeg;base64,...`).
- [x] 2.4 Update the payload sent to the LLM to use the base64 string instead of the image URL.

## 3. Integration & Testing

- [x] 3.1 Test the end-to-end flow: upload a bill from the client -> verify it is compressed -> verify `process-bill` reads it from storage -> verify LLM receives base64 and returns correct transaction data.
- [x] 3.2 Ensure error handling is robust (e.g., if storage read fails, or if compression fails).
