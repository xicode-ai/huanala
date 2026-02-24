import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureConfigured, generateVisionJson } from '../_shared/qwen.js';

const BILL_PROMPT = [
  'Extract one transaction from this receipt image and return JSON only.',
  'Schema: {"title": string, "amount": number, "currency": string, "category": string, "merchant": string}.',
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

  if (!ensureConfigured()) {
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
    let url;

    if (storagePath) {
      const { data: signedData, error: signedError } = await auth.client.storage
        .from('bills')
        .createSignedUrl(storagePath, 300);
      if (signedError || !signedData?.signedUrl) {
        console.error('Failed to create signed URL for image', signedError);
        return jsonResponse(422, { error: 'Could not extract transaction data from image' });
      }
      url = signedData.signedUrl;
    } else {
      url = imageUrl;
    }

    const parsed = await generateVisionJson(BILL_PROMPT, url);
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
