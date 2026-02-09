import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureGeminiConfigured, generateVisionJson } from '../_shared/gemini.js';

const BILL_PROMPT = [
  'Extract one transaction from this receipt image and return JSON only.',
  'Schema: {"title": string, "amount": number, "currency": string, "category": string, "merchant": string}.',
  'No markdown, no explanation, JSON only.',
].join(' ');

function guessMimeType(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
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

  if (!ensureGeminiConfigured()) {
    return jsonResponse(500, { error: 'AI service not configured' });
  }

  let body;
  try {
    body = await req.json();
  } catch (_err) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const imageUrl = String(body?.image_url || '').trim();
  const storagePath = String(body?.storage_path || '').trim();
  if (!imageUrl && !storagePath) {
    return jsonResponse(400, { error: 'image_url is required' });
  }

  try {
    let bytes;
    let mimeType = 'image/jpeg';

    if (storagePath) {
      const { data, error } = await auth.client.storage.from('bills').download(storagePath);
      if (error || !data) {
        console.error('Failed to download image from storage', error);
        return jsonResponse(422, { error: 'Could not extract transaction data from image' });
      }
      bytes = await data.arrayBuffer();
      mimeType = guessMimeType(storagePath);
    } else {
      const imageResp = await fetch(imageUrl);
      if (!imageResp.ok) {
        return jsonResponse(422, { error: 'Could not extract transaction data from image' });
      }
      bytes = await imageResp.arrayBuffer();
      mimeType = imageResp.headers.get('content-type') || guessMimeType(imageUrl);
    }

    const parsed = await generateVisionJson(BILL_PROMPT, bytes, mimeType);
    const amount = Number(parsed?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse(422, { error: 'Could not extract transaction data from image' });
    }

    const payload = {
      user_id: auth.user.id,
      title: typeof parsed?.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Bill Purchase',
      amount,
      currency: typeof parsed?.currency === 'string' && parsed.currency.trim() ? parsed.currency.trim() : '¥',
      category: typeof parsed?.category === 'string' && parsed.category.trim() ? parsed.category.trim() : 'Other',
      type: 'expense',
      source: 'bill_scan',
      merchant: typeof parsed?.merchant === 'string' && parsed.merchant.trim() ? parsed.merchant.trim() : null,
      note: 'Scanned Receipt',
      description: 'Auto-extracted from uploaded bill image',
    };

    const { data: transaction, error } = await auth.client.from('transactions').insert(payload).select('*').single();

    if (error) {
      console.error('Failed to insert bill transaction', error);
      return jsonResponse(500, { error: 'Failed to create transaction' });
    }

    return jsonResponse(200, { transaction });
  } catch (err) {
    console.error('Bill processing failed', err);
    return jsonResponse(502, { error: 'AI service unavailable' });
  }
});
