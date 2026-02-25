import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureConfigured, generateText, parseJsonFromText } from '../_shared/qwen.js';

const VOICE_PROMPT = [
  'Extract ALL transactions from the transcript. Return JSON only.',
  'Schema: {"transactions": [{"title": string, "amount": number, "currency": string, "category": string, "type": "expense"|"income"}, ...]}.',
  'If only one item mentioned, still return array with one element.',
  'If data is ambiguous, infer best effort values and keep amount numeric.',
  'No markdown, no explanation, JSON only.',
].join(' ');

function normalizeTransaction(item: any) {
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
  } catch (_err) {
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

    const { data: session, error: sessionError } = await auth.client
      .from('input_sessions')
      .insert({
        user_id: auth.user.id,
        source: 'voice',
        raw_input: transcript,
        ai_raw_output: parsed,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Failed to create input session', sessionError);
      return jsonResponse(500, { error: 'Failed to create session' });
    }

    const rows = items.map((item: any) => {
      const normalized = normalizeTransaction(item);
      return {
        user_id: auth.user.id,
        session_id: session.id,
        title: normalized.title,
        amount: normalized.amount,
        currency: normalized.currency,
        category: normalized.category,
        type: normalized.type,
        source: 'voice',
        note: 'Voice input',
        description: transcript,
      };
    });

    const { data: transactions, error: insertError } = await auth.client.from('transactions').insert(rows).select('*');

    if (insertError) {
      console.error('Failed to insert voice transactions', insertError);
      return jsonResponse(500, { error: 'Failed to create transactions' });
    }

    await auth.client.from('input_sessions').update({ record_count: transactions.length }).eq('id', session.id);

    return jsonResponse(200, { session_id: session.id, transactions });
  } catch (err) {
    console.error('Voice processing failed', err);
    return jsonResponse(502, { error: 'AI service unavailable' });
  }
});
