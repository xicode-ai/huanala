## ADDED Requirements

### Requirement: WebP-first image compression with JPEG fallback

The image compression module SHALL output WebP format by default, falling back to JPEG only when the runtime environment does not support WebP encoding via `OffscreenCanvas.convertToBlob()`.

#### Scenario: WebP supported (default path)

- **WHEN** `compressImage` is called and `OffscreenCanvas.convertToBlob({ type: 'image/webp' })` produces a blob with MIME type `image/webp`
- **THEN** the module SHALL return a WebP-encoded blob

#### Scenario: WebP not supported (fallback path)

- **WHEN** `compressImage` is called and the resulting blob's `type` is NOT `image/webp` (indicating the browser fell back to a default format)
- **THEN** the module SHALL re-encode the image as JPEG with quality 0.6 and return that blob

### Requirement: Reduced maximum dimension for OCR optimization

The image compression module SHALL scale images to fit within 1600px on the longest side (down from 2048px), maintaining aspect ratio.

#### Scenario: Image exceeds 1600px on longest side

- **WHEN** `compressImage` is called with an image where either width or height exceeds 1600px
- **THEN** the module SHALL scale the image proportionally so the longest side equals 1600px

#### Scenario: Image already within 1600px

- **WHEN** `compressImage` is called with an image where both width and height are ≤ 1600px
- **THEN** the module SHALL NOT resize the image (dimensions remain unchanged)

### Requirement: Compression quality targeting 50%+ size reduction

The image compression module SHALL use quality parameter 0.55 for WebP output and 0.6 for JPEG fallback, targeting at least 50% file size reduction from the original.

#### Scenario: Compression with WebP

- **WHEN** an image is compressed to WebP format
- **THEN** the module SHALL use quality parameter 0.55

#### Scenario: Compression with JPEG fallback

- **WHEN** an image is compressed to JPEG format (WebP fallback)
- **THEN** the module SHALL use quality parameter 0.6

### Requirement: High-quality image smoothing during resize

The image compression module SHALL enable high-quality image smoothing on the canvas context before drawing, to prevent text aliasing artifacts that degrade OCR accuracy.

#### Scenario: Canvas context configuration

- **WHEN** the OffscreenCanvas 2D context is obtained for image compression
- **THEN** the module SHALL set `imageSmoothingEnabled` to `true` and `imageSmoothingQuality` to `'high'` before drawing the image

### Requirement: Content type alignment with compression output

The upload flow SHALL set the `contentType` header to match the actual compressed blob format — `image/webp` for WebP output or `image/jpeg` for JPEG fallback — and use the corresponding file extension (`.webp` or `.jpg`).

#### Scenario: Upload WebP compressed image

- **WHEN** `compressImage` returns a blob with type `image/webp`
- **THEN** the upload SHALL use `contentType: 'image/webp'` and file extension `.webp`

#### Scenario: Upload JPEG fallback image

- **WHEN** `compressImage` returns a blob with type `image/jpeg`
- **THEN** the upload SHALL use `contentType: 'image/jpeg'` and file extension `.jpg`
