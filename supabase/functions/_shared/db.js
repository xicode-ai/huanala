/**
 * Shared database operations for Edge Functions that create
 * input_sessions + transactions in a single flow.
 *
 * Used by: process-text, process-voice
 * NOT used by: process-bill (streaming inserts), ai-chat (messages table)
 *
 * DB writes are fire-and-forget: the function returns immediately with
 * locally-constructed data while inserts happen in the background.
 */

/**
 * Create an input_session and batch-insert its transactions.
 * Returns immediately with locally-generated IDs and default values.
 * DB persistence happens asynchronously in the background.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} client - Authenticated Supabase client
 * @param {object} params
 * @param {string} params.userId - auth user id
 * @param {string} params.source - input source ('text' | 'voice')
 * @param {string} params.rawInput - original user input text
 * @param {object} params.aiRawOutput - parsed AI JSON response
 * @param {Array<{title: string, amount: number, currency: string, category: string, type: string}>} params.normalizedItems
 * @returns {{session_id: string, transactions: object[]}}
 */
export function createSessionWithTransactions(client, { userId, source, rawInput, aiRawOutput, normalizedItems }) {
  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  const totalAmount = normalizedItems.reduce((sum, n) => sum + n.amount, 0);
  const currency = normalizedItems[0]?.currency || '¥';
  const noteLabel = source.charAt(0).toUpperCase() + source.slice(1) + ' input';

  // Build full transaction objects locally (matching DB schema defaults)
  const transactions = normalizedItems.map((n) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    session_id: sessionId,
    title: n.title,
    amount: n.amount,
    currency: n.currency,
    category: n.category,
    icon: 'receipt',
    icon_bg: 'bg-slate-50',
    icon_color: 'text-slate-500',
    type: n.type,
    note: noteLabel,
    merchant: null,
    description: rawInput,
    source,
    created_at: now,
    updated_at: now,
  }));

  // Fire-and-forget: persist to DB in background
  _persistInBackground(client, {
    sessionId,
    userId,
    source,
    rawInput,
    aiRawOutput,
    recordCount: normalizedItems.length,
    totalAmount,
    currency,
    transactions,
  });

  return { session_id: sessionId, transactions };
}

/**
 * Background DB persistence. Session must be inserted before transactions
 * due to foreign key constraint (transactions.session_id → input_sessions.id).
 */
async function _persistInBackground(
  client,
  { sessionId, userId, source, rawInput, aiRawOutput, recordCount, totalAmount, currency, transactions }
) {
  try {
    // 1. Insert session first (FK dependency)
    const { error: sessionError } = await client.from('input_sessions').insert({
      id: sessionId,
      user_id: userId,
      source,
      raw_input: rawInput,
      ai_raw_output: aiRawOutput,
      record_count: recordCount,
      total_amount: totalAmount,
      currency,
    });

    if (sessionError) {
      console.error('Background: failed to create session', sessionError);
      return;
    }

    // 2. Batch-insert transactions
    const { error: txError } = await client.from('transactions').insert(transactions);

    if (txError) {
      console.error('Background: failed to insert transactions', txError);
    }
  } catch (err) {
    console.error('Background: DB persist failed', err);
  }
}
