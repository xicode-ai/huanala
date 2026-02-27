const QWEN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen3.5-plus';

/** SSE line delimiter */
const LF = '\n';

function getApiKey() {
  return Deno.env.get('DASHSCOPE_API_KEY') || '';
}

export function ensureConfigured() {
  return Boolean(getApiKey());
}

export async function generateText(messages) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const response = await fetch(QWEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI_REQUEST_FAILED:${response.status}:${text}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || '';

  if (!text.trim()) {
    throw new Error('AI_EMPTY_RESPONSE');
  }

  return text;
}

export async function generateVisionJson(prompt, imageUrl) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const response = await fetch(QWEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI_REQUEST_FAILED:${response.status}:${text}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || '';

  if (!text.trim()) {
    throw new Error('AI_EMPTY_RESPONSE');
  }

  return parseJsonFromText(text);
}

/**
 * Streaming variant of generateVisionJson.
 * Calls DashScope with stream: true, parses SSE chunks,
 * and invokes onChunk(delta) for each content delta.
 * Returns the full accumulated text when the stream ends.
 */
export async function generateVisionJsonStream(prompt, imageUrl, onChunk) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const response = await fetch(QWEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI_REQUEST_FAILED:${response.status}:${text}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines from the buffer
    const lines = buffer.split(LF);
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (!trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);

      if (payload === '[DONE]') {
        // Stream finished
        return fullText;
      }

      try {
        const chunk = JSON.parse(payload);
        const delta = chunk?.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          await onChunk(delta);
        }
      } catch (_err) {
        // Skip malformed SSE data lines
      }
    }
  }

  // Stream ended without [DONE] — return what we have
  return fullText;
}

export function parseJsonFromText(text) {
  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned);
  } catch (_err) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = cleaned.slice(start, end + 1);
      return JSON.parse(slice);
    }
    throw new Error('AI_JSON_PARSE_FAILED');
  }
}
