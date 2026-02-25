## Context

Currently, the bill upload and processing pipeline works by:

1. Client uploads an image to a Supabase Storage bucket.
2. Client gets the public URL of the uploaded image.
3. Client calls the `process-bill` Edge Function with the public URL.
4. The Edge Function downloads the image from the URL and sends it to the LLM for processing.

This approach is inefficient because:

- Uploading uncompressed images from the client consumes extra bandwidth and storage.
- The Edge Function must make a separate HTTP request to download the image it already has access to via Supabase Storage.
- The LLM has to download the image from the URL, which adds another round trip.

## Goals / Non-Goals

**Goals:**

- Compress images on the client side before uploading to Supabase Storage (target quality: 0.65-0.8).
- Modify the `process-bill` Edge Function to read the image directly from Supabase Storage instead of downloading it via a public URL.
- Change the LLM invocation in `process-bill` to use base64 encoded image data (`data:image/jpg;base64,...`) instead of a URL.

**Non-Goals:**

- Changing the underlying LLM provider or prompt logic.
- Adding support for non-image bill formats (e.g., PDF).

## Decisions

1. **Client-Side Compression**:
   - We will implement image compression in the browser before the Supabase storage upload.
   - We'll use a lightweight approach: drawing the image to a canvas and exporting it as a JPEG/WebP with reduced quality (0.65 - 0.8), or leverage a small library if one is already present or easy to add (like `browser-image-compression`).
   - Rationale: Reduces upload time, bandwidth, and storage costs.

2. **Direct Storage Access in Edge Function**:
   - Instead of passing the public URL, the client will pass the `filePath` (or `bucketName` and `filePath`) to the `process-bill` Edge Function.
   - The Edge Function will use the Supabase Admin client (or standard client with correct auth) to download the file directly from the storage bucket: `supabase.storage.from('bills').download(filePath)`.
   - Rationale: Avoids a public HTTP request, leveraging internal Supabase networking, and sets up for the next step.

3. **Base64 Encoding for LLM**:
   - Once the Edge Function downloads the file blob/buffer from Storage, it will convert it to a base64 string.
   - The payload sent to the LLM will be updated to use the base64 format: `{"image_url": {"url": "data:image/jpeg;base64,<base64_data>"}}`.
   - Rationale: Eliminates the need for the LLM provider to fetch the image over the open internet, reducing latency and potential timeout/access issues.

## Risks / Trade-offs

- **Risk: Increased Edge Function Memory/Execution Time**: Loading the image into memory and base64 encoding it within the Edge Function might increase its memory footprint and execution time compared to just passing a URL.
  - _Mitigation_: The client-side compression heavily mitigates this. A compressed image (e.g., < 500KB) will easily fit in the Edge Function's memory limit and encode very quickly.
- **Risk: Client-Side Compression Overhead**: Compressing large images on older mobile devices might cause UI lag.
  - _Mitigation_: Perform compression asynchronously and ensure a loading state is shown to the user.
