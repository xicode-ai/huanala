import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
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

interface RawItem {
  title?: string;
  amount?: number | string;
  currency?: string;
  category?: string;
  merchant?: string;
}

interface NormalizedItem {
  title: string;
  amount: number;
  currency: string;
  category: string;
  merchant: string | null;
}

function normalizeTransaction(item: RawItem): NormalizedItem {
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
 * Download a file from Supabase Storage and return a base64 data URL.
 * DashScope (China) cannot download external URLs reliably or quickly,
 * so we fetch the image bytes on the edge function and inline them.
 */
async function getBase64DataUrlFromStorage(supabaseClient: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await supabaseClient.storage.from('bills').download(path);
  if (error || !data) {
    throw new Error(`Failed to download image from storage: ${error?.message}`);
  }

  const contentType = data.type || 'image/jpeg';
  const buf = await data.arrayBuffer();
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
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const storagePath = String(body?.storage_path || '').trim();
  if (!storagePath) {
    return jsonResponse(400, { error: 'storage_path is required' });
  }

  try {
    // Download image directly from storage and convert to base64 data URL
    const dataUrl = await getBase64DataUrlFromStorage(auth.client, storagePath);
    const parsed = await generateVisionJson(BILL_PROMPT, dataUrl);

    const items = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
    const validItems = items.filter((item: RawItem) => {
      const amount = Number(item?.amount);
      return Number.isFinite(amount) && amount > 0;
    });

    if (validItems.length === 0) {
      return jsonResponse(422, { error: 'Could not extract transaction data from image' });
    }

    const rawInput = storagePath;

    // Compute totals before creating session
    const normalizedItems = validItems.map((item: RawItem) => normalizeTransaction(item));
    const totalAmount = normalizedItems.reduce((sum, n) => sum + n.amount, 0);
    const sessionCurrency = normalizedItems[0]?.currency || '¥';

    const { data: session, error: sessionError } = await auth.client
      .from('input_sessions')
      .insert({
        user_id: auth.user.id,
        source: 'bill_scan',
        raw_input: rawInput,
        ai_raw_output: parsed,
        record_count: normalizedItems.length,
        total_amount: totalAmount,
        currency: sessionCurrency,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Failed to create input session', sessionError);
      return jsonResponse(500, { error: 'Failed to create session' });
    }

    const rows = normalizedItems.map((normalized) => {
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

    // record_count already set at insert time, no separate update needed

    return jsonResponse(200, { session_id: session.id, transactions });
  } catch (err) {
    console.error('Bill processing failed', err);
    return jsonResponse(502, { error: 'AI service unavailable' });
  }
});
