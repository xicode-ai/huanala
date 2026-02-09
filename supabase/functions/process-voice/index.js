import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureGeminiConfigured, generateText, parseJsonFromText } from '../_shared/gemini.js';

const VOICE_PROMPT = [
  'Extract one transaction from the transcript and return JSON only.',
  'Schema: {"title": string, "amount": number, "currency": string, "category": string, "type": "expense"|"income"}.',
  'If data is ambiguous, infer best effort values and keep amount numeric.',
  'No markdown, no explanation, JSON only.',
].join(' ');

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

  if (!ensureGeminiConfigured()) {
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
    const modelText = await generateText([{ text: VOICE_PROMPT }, { text: `Transcript: ${transcript}` }]);
    const parsed = parseJsonFromText(modelText);

    const amount = Number(parsed?.amount);
    const normalized = {
      title: typeof parsed?.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Voice Transaction',
      amount: Number.isFinite(amount) ? amount : 0,
      currency: typeof parsed?.currency === 'string' && parsed.currency.trim() ? parsed.currency.trim() : '¥',
      category: typeof parsed?.category === 'string' && parsed.category.trim() ? parsed.category.trim() : 'Other',
      type: parsed?.type === 'income' ? 'income' : 'expense',
    };

    const { data: transaction, error } = await auth.client
      .from('transactions')
      .insert({
        user_id: auth.user.id,
        title: normalized.title,
        amount: normalized.amount,
        currency: normalized.currency,
        category: normalized.category,
        type: normalized.type,
        source: 'voice',
        note: 'Voice input',
        description: transcript,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to insert voice transaction', error);
      return jsonResponse(500, { error: 'Failed to create transaction' });
    }

    const warning = normalized.amount === 0 ? 'incomplete_extraction' : undefined;
    return jsonResponse(200, { transaction, warning });
  } catch (err) {
    console.error('Voice processing failed', err);
    return jsonResponse(502, { error: 'AI service unavailable' });
  }
});
