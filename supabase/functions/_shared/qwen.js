const QWEN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

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
      model: 'qwen3.5-flash',
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
      model: 'qwen3.5-plus',
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
