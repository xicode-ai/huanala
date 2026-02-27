## MODIFIED Requirements

### Requirement: Qwen vision analysis

The shared AI module SHALL provide a `generateVisionJson(prompt, imageUrl)` function that sends a text prompt and an image URL to the DashScope API using model `qwen3.5-plus` and returns the parsed JSON object from the model's response. Additionally, the module SHALL provide a `generateVisionJsonStream(prompt, imageUrl, onChunk)` function that performs the same vision analysis using DashScope's streaming SSE mode, invoking `onChunk(textDelta)` for each content delta received.

#### Scenario: Successful image analysis with URL

- **WHEN** `generateVisionJson` is called with a prompt string and an image URL
- **THEN** the module SHALL send a POST request to the DashScope API with model `qwen3.5-plus`, a user message containing `[{type: "image_url", image_url: {url: imageUrl}}, {type: "text", text: prompt}]`, and return the parsed JSON object from the response text

#### Scenario: JSON extraction from response

- **WHEN** the model returns text containing a JSON object (possibly wrapped in markdown or extra text)
- **THEN** the module SHALL extract and parse the JSON object, searching for the first `{` to last `}` if direct parsing fails

#### Scenario: Unparseable response

- **WHEN** the model response contains no valid JSON object
- **THEN** the module SHALL throw an error with code `AI_JSON_PARSE_FAILED`

#### Scenario: Streaming vision analysis

- **WHEN** `generateVisionJsonStream` is called with a prompt string, an image URL, and an `onChunk` callback
- **THEN** the module SHALL send a POST request to the DashScope API with `stream: true` in the request body, parse the SSE response line by line, and invoke `onChunk(delta)` with each `choices[0].delta.content` string as it arrives

#### Scenario: Streaming SSE parsing

- **WHEN** the DashScope API returns SSE-formatted lines prefixed with `data: `
- **THEN** the module SHALL parse each line by stripping the `data: ` prefix, JSON-parsing the remainder, and extracting `choices[0].delta.content`. Lines containing `data: [DONE]` SHALL signal the end of the stream.

#### Scenario: Streaming error handling

- **WHEN** the DashScope API returns a non-2xx HTTP status during a streaming request
- **THEN** the module SHALL throw an error with code `AI_REQUEST_FAILED` including the HTTP status and response body, without invoking any `onChunk` callbacks

#### Scenario: Streaming returns accumulated text

- **WHEN** the stream completes (receives `[DONE]`)
- **THEN** `generateVisionJsonStream` SHALL return the full accumulated text from all deltas, allowing the caller to perform final JSON parsing
