import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureConfigured, generateVisionJson } from '../_shared/qwen.js';

const BILL_PROMPT = [
  'Extract ALL line items from this receipt/purchase order image. Return JSON only.',
  'Schema: {"transactions": [{"title": string, "amount": number, "currency": string, "category": string, "merchant": string}, ...]}.',
  'Each line item is a separate transaction. Do not combine items.',
  'If only one item, still return array with one element.',
  'No markdown, no explanation, JSON only.',
].join(' ');

function normalizeTransaction(item: any) {
  const amount = Number(item?.amount);
  return {
    title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'Bill Purchase',
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    currency: typeof item?.currency === 'string' && item.currency.trim() ? item.currency.trim() : '¥',
    category: typeof item?.category === 'string' && item.category.trim() ? item.category.trim() : 'Other',
    merchant: typeof item?.merchant === 'string' && item.merchant.trim() ? item.merchant.trim() : null,
  };
}

/**
 * Download an image from a URL and return a base64 data URL.
 * DashScope (China) cannot download external URLs, so we must
 * fetch the image bytes on the edge function and inline them.
 */
async function toBase64DataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // Deno-native base64 encode
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);

  return `data:${contentType};base64,${b64}`;
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

  const imageUrl = String(body?.image_url || '').trim();
  const storagePath = String(body?.storage_path || '').trim();
  if (!imageUrl && !storagePath) {
    return jsonResponse(400, { error: 'image_url is required' });
  }

  try {
    // Resolve a downloadable URL for the image
    let downloadUrl: string;

    if (storagePath) {
      const { data: signedData, error: signedError } = await auth.client.storage
        .from('bills')
        .createSignedUrl(storagePath, 300);
      if (signedError || !signedData?.signedUrl) {
        console.error('Failed to create signed URL for image', signedError);
        return jsonResponse(422, { error: 'Could not access uploaded image' });
      }
      downloadUrl = signedData.signedUrl;
    } else {
      downloadUrl = imageUrl;
    }

    // Download image and convert to base64 data URL so DashScope can read it
    const dataUrl = await toBase64DataUrl(downloadUrl);

    const parsed = await generateVisionJson(BILL_PROMPT, dataUrl);

    const items = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
    const validItems = items.filter((item: any) => {
      const amount = Number(item?.amount);
      return Number.isFinite(amount) && amount > 0;
    });

    if (validItems.length === 0) {
      return jsonResponse(422, { error: 'Could not extract transaction data from image' });
    }

    const rawInput = storagePath || imageUrl;

    const { data: session, error: sessionError } = await auth.client
      .from('input_sessions')
      .insert({
        user_id: auth.user.id,
        source: 'bill_scan',
        raw_input: rawInput,
        ai_raw_output: parsed,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Failed to create input session', sessionError);
      return jsonResponse(500, { error: 'Failed to create session' });
    }

    const rows = validItems.map((item: any) => {
      const normalized = normalizeTransaction(item);
      return {
        user_id: auth.user.id,
        session_id: session.id,
        title: normalized.title,
        amount: normalized.amount,
        currency: normalized.currency,
        category: normalized.category,
        type: 'expense',
        source: 'bill_scan',
        merchant: normalized.merchant,
        note: 'Scanned Receipt',
        description: 'Auto-extracted from uploaded bill image',
      };
    });

    const { data: transactions, error: insertError } = await auth.client.from('transactions').insert(rows).select('*');

    if (insertError) {
      console.error('Failed to insert bill transactions', insertError);
      return jsonResponse(500, { error: 'Failed to create transactions' });
    }

    await auth.client.from('input_sessions').update({ record_count: transactions.length }).eq('id', session.id);

    return jsonResponse(200, { session_id: session.id, transactions });
  } catch (err) {
    console.error('Bill processing failed', err);
    return jsonResponse(502, { error: 'AI service unavailable' });
  }
});
