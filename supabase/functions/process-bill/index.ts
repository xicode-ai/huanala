import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureConfigured, generateVisionJsonStream, parseJsonFromText } from '../_shared/qwen.js';

/** SSE double-newline delimiter */
const SSE_DELIM = '\n\n';

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

/** Structured performance log helper */
function perfLog(step: string, durationMs: number, meta: Record<string, unknown>) {
  console.log(JSON.stringify({ event: 'perf', step, durationMs: Math.round(durationMs), meta }));
}

/**
 * Download a file from Supabase Storage and return a base64 data URL.
 * DashScope (China) cannot download external URLs reliably or quickly,
 * so we fetch the image bytes on the edge function and inline them.
 */
async function getBase64DataUrlFromStorage(
  supabaseClient: SupabaseClient,
  path: string
): Promise<{ dataUrl: string; imageSizeBytes: number }> {
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

  return { dataUrl: `data:${contentType};base64,${b64}`, imageSizeBytes: bytes.length };
}

/**
 * Try to extract complete JSON objects from a partial JSON string being streamed.
 * Looks for complete {...} blocks inside the transactions array.
 * Returns an array of newly found complete objects and the count processed so far.
 */
function extractCompleteObjects(text: string, alreadyProcessed: number): RawItem[] {
  const newItems: RawItem[] = [];

  // Try to find the transactions array content
  const arrStart = text.indexOf('[');
  if (arrStart < 0) return newItems;

  const content = text.slice(arrStart + 1);

  // Find all complete {...} objects by tracking brace depth
  let depth = 0;
  let objStart = -1;
  let objCount = 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) {
        objCount++;
        if (objCount > alreadyProcessed) {
          // Check if this object is truly complete (followed by , or ] or whitespace+, or whitespace+])
          const rest = content.slice(i + 1).trimStart();
          if (rest.length === 0) {
            // Object might still be the last one being streamed — skip for safety
            break;
          }
          try {
            const obj = JSON.parse(content.slice(objStart, i + 1));
            newItems.push(obj);
          } catch {
            // Malformed — skip
          }
        }
        objStart = -1;
      }
    }
  }

  return newItems;
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

  // Set up SSE streaming response
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendSSE = (data: Record<string, unknown>) => {
    return writer.write(encoder.encode('data: ' + JSON.stringify(data) + SSE_DELIM));
  };

  /** SSE comment to keep connection alive (not parsed as event by clients) */
  const sendKeepAlive = () => {
    return writer.write(encoder.encode(': keepalive' + SSE_DELIM));
  };

  // Run the processing pipeline in background
  (async () => {
    const totalStart = Date.now();
    let transactionCount = 0;
    let success = false;
    let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

    try {
      // --- Step 1: Download image ---
      const dlStart = Date.now();
      const { dataUrl, imageSizeBytes } = await getBase64DataUrlFromStorage(auth.client, storagePath);
      perfLog('image_download', Date.now() - dlStart, { storagePath, imageSizeBytes });

      // --- Step 2: Create session (before streaming) ---
      const dbSessionStart = Date.now();
      const { data: session, error: sessionError } = await auth.client
        .from('input_sessions')
        .insert({
          user_id: auth.user.id,
          source: 'bill_scan',
          raw_input: storagePath,
          record_count: 0,
          total_amount: 0,
          currency: '¥',
        })
        .select('id')
        .single();

      if (sessionError || !session) {
        console.error('Failed to create input session', sessionError);
        await sendSSE({ type: 'error', message: 'Failed to create session' });
        return;
      }
      perfLog('db_session_create', Date.now() - dbSessionStart, { sessionCreated: true });

      // Send initial event immediately to prevent gateway idle timeout
      await sendSSE({ type: 'session_created', session_id: session.id });

      // Start keepalive interval (every 15s) to prevent gateway idle timeout during AI processing
      keepAliveInterval = setInterval(() => {
        sendKeepAlive().catch(() => {
          /* writer closed */
        });
      }, 15_000);

      // --- Step 3: AI streaming request ---
      const aiStart = Date.now();
      let processedCount = 0;
      let accumulatedText = '';
      let totalAmount = 0;
      const insertedTransactions: Record<string, unknown>[] = [];
      const dbInsertStart = Date.now();

      const fullText = await generateVisionJsonStream(BILL_PROMPT, dataUrl, async (delta: string) => {
        accumulatedText += delta;

        // Try incremental extraction
        const newItems = extractCompleteObjects(accumulatedText, processedCount);

        for (const rawItem of newItems) {
          const amount = Number(rawItem?.amount);
          if (!Number.isFinite(amount) || amount <= 0) {
            processedCount++;
            continue;
          }

          const normalized = normalizeTransaction(rawItem);
          const row = {
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

          try {
            const { data: tx, error: insertError } = await auth.client
              .from('transactions')
              .insert(row)
              .select('*')
              .single();

            if (insertError) {
              console.error('Failed to insert transaction', insertError);
            } else if (tx) {
              insertedTransactions.push(tx);
              totalAmount += normalized.amount;
              transactionCount++;
              await sendSSE({
                type: 'transaction_inserted',
                data: tx,
                progress: { completed: transactionCount },
              });
            }
          } catch (insertErr) {
            console.error('Transaction insert exception', insertErr);
          }

          processedCount++;
        }
      });

      perfLog('ai_request', Date.now() - aiStart, {
        model: 'qwen3.5-plus',
        streamMode: true,
        totalTokens: null,
      });

      // --- Step 4: Final reconciliation ---
      // Parse the complete response and insert any objects missed during streaming
      try {
        const parsed = parseJsonFromText(fullText);
        const allItems = Array.isArray(parsed?.transactions) ? parsed.transactions : [];

        for (let i = processedCount; i < allItems.length; i++) {
          const rawItem = allItems[i] as RawItem;
          const amount = Number(rawItem?.amount);
          if (!Number.isFinite(amount) || amount <= 0) continue;

          const normalized = normalizeTransaction(rawItem);
          const row = {
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

          try {
            const { data: tx, error: insertError } = await auth.client
              .from('transactions')
              .insert(row)
              .select('*')
              .single();

            if (insertError) {
              console.error('Failed to insert remaining transaction', insertError);
            } else if (tx) {
              insertedTransactions.push(tx);
              totalAmount += normalized.amount;
              transactionCount++;
              await sendSSE({
                type: 'transaction_inserted',
                data: tx,
                progress: { completed: transactionCount },
              });
            }
          } catch (insertErr) {
            console.error('Remaining transaction insert exception', insertErr);
          }
        }

        // Store AI raw output in session
        await auth.client.from('input_sessions').update({ ai_raw_output: parsed }).eq('id', session.id);
      } catch (parseErr) {
        console.error('Final JSON parse failed', parseErr);
      }

      // --- Step 5: Update session with final totals ---
      const sessionCurrency =
        insertedTransactions.length > 0
          ? ((insertedTransactions[0] as Record<string, unknown>).currency as string) || '¥'
          : '¥';

      await auth.client
        .from('input_sessions')
        .update({
          record_count: transactionCount,
          total_amount: totalAmount,
          currency: sessionCurrency,
        })
        .eq('id', session.id);

      perfLog('db_operations', Date.now() - dbInsertStart, {
        sessionCreated: true,
        transactionsInserted: transactionCount,
      });

      success = true;

      // Send completion event
      await sendSSE({
        type: 'completed',
        session_id: session.id,
        total_count: transactionCount,
        total_amount: totalAmount,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Bill processing failed', errMsg, err);
      try {
        await sendSSE({ type: 'error', message: errMsg || 'AI service unavailable' });
      } catch {
        // Writer may already be closed
      }
    } finally {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      perfLog('total', Date.now() - totalStart, { success, transactionCount });
      try {
        await writer.close();
      } catch {
        // Already closed
      }
    }
  })();

  // Return streaming response immediately
  return new Response(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
