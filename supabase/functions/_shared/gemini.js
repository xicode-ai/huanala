const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function getApiKey() {
  return Deno.env.get('GEMINI_API_KEY') || '';
}

export function ensureGeminiConfigured() {
  return Boolean(getApiKey());
}

export async function generateText(parts) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_NOT_CONFIGURED');
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GEMINI_REQUEST_FAILED:${response.status}:${text}`);
  }

  const payload = await response.json();
  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join('\n') || '';

  if (!text.trim()) {
    throw new Error('GEMINI_EMPTY_RESPONSE');
  }

  return text;
}

export async function generateVisionJson(prompt, bytes, mimeType = 'image/jpeg') {
  const base64 = toBase64(bytes);
  const text = await generateText([
    { text: prompt },
    {
      inline_data: {
        mime_type: mimeType,
        data: base64,
      },
    },
  ]);

  return parseJsonFromText(text);
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
    throw new Error('GEMINI_JSON_PARSE_FAILED');
  }
}

function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}
