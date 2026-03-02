import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureConfigured, generateJsonFromText } from '../_shared/qwen.js';
import { createSessionWithTransactions } from '../_shared/db.js';

const TEXT_PROMPT = [
  'Extract ALL transactions from the user input text. Return JSON only.',
  'Schema: {"transactions": [{"title": string, "amount": number, "currency": string, "category": string, "type": "expense"|"income"}, ...]}.',
  'If only one item mentioned, still return array with one element.',
  'If data is ambiguous, infer best effort values and keep amount numeric.',
  'No markdown, no explanation, JSON only.',
].join(' ');

const FAST_MODEL = 'qwen3.5-flash';

interface RawItem {
  title?: string;
  amount?: number | string;
  currency?: string;
  category?: string;
  type?: string;
}

interface NormalizedItem {
  title: string;
  amount: number;
  currency: string;
  category: string;
  type: string;
}

function normalizeTransaction(item: RawItem): NormalizedItem {
  const amount = Number(item?.amount);
  return {
    title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'Text Transaction',
    amount: Number.isFinite(amount) ? amount : 0,
    currency: typeof item?.currency === 'string' && item.currency.trim() ? item.currency.trim() : '¥',
    category: typeof item?.category === 'string' && item.category.trim() ? item.category.trim() : 'Other',
    type: item?.type === 'income' ? 'income' : 'expense',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedUser(req.headers.get('Authorization'));
  if (!auth) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  if (!ensureConfigured()) {
    return jsonResponse(500, { error: 'AI service not configured' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const text = String(body?.text || '').trim();
  if (!text) {
    return jsonResponse(400, { error: 'Text is required' });
  }

  try {
    const parsed = await generateJsonFromText(
      [
        { role: 'system', content: TEXT_PROMPT },
        { role: 'user', content: `User input: ${text}` },
      ],
      FAST_MODEL
    );

    const items = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
    if (items.length === 0) {
      return jsonResponse(422, { error: 'Could not extract transaction data' });
    }

    const normalizedItems = items.map((item: RawItem) => normalizeTransaction(item));

    const result = await createSessionWithTransactions(auth.client, {
      userId: auth.user.id,
      source: 'text',
      rawInput: text,
      aiRawOutput: parsed,
      normalizedItems,
    });

    return jsonResponse(200, result);
  } catch (err) {
    console.error('Text processing failed', err);
    return jsonResponse(502, { error: 'AI service unavailable' });
  }
});
