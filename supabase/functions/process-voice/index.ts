import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureConfigured, generateText, parseJsonFromText } from '../_shared/qwen.js';
import { createSessionWithTransactions } from '../_shared/db.js';

const VOICE_PROMPT = [
  'Extract ALL transactions from the transcript. Return JSON only.',
  'Schema: {"transactions": [{"title": string, "amount": number, "currency": string, "category": string, "type": "expense"|"income"}, ...]}.',
  'If only one item mentioned, still return array with one element.',
  'If data is ambiguous, infer best effort values and keep amount numeric.',
  'No markdown, no explanation, JSON only.',
].join(' ');

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
    title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'Voice Transaction',
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

  const transcript = String(body?.transcript || '').trim();
  if (!transcript) {
    return jsonResponse(400, { error: 'Transcript is required' });
  }

  try {
    const modelText = await generateText([
      { role: 'system', content: VOICE_PROMPT },
      { role: 'user', content: `Transcript: ${transcript}` },
    ]);
    const parsed = parseJsonFromText(modelText);

    const items = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
    if (items.length === 0) {
      return jsonResponse(422, { error: 'Could not extract transaction data' });
    }

    const normalizedItems = items.map((item: RawItem) => normalizeTransaction(item));

    const result = await createSessionWithTransactions(auth.client, {
      userId: auth.user.id,
      source: 'voice',
      rawInput: transcript,
      aiRawOutput: parsed,
      normalizedItems,
    });

    return jsonResponse(200, result);
  } catch (err) {
    console.error('Voice processing failed', err);
    return jsonResponse(502, { error: 'AI service unavailable' });
  }
});
