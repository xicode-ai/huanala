import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { getAuthenticatedUser } from '../_shared/auth.js';
import { ensureConfigured, generateText } from '../_shared/qwen.js';

const SYSTEM_PROMPT =
  'You are Hua Na Le, a practical personal finance assistant. Keep replies concise, accurate, and actionable.';

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

  const message = String(body?.message || '').trim();
  if (!message) {
    return jsonResponse(400, { error: 'Message is required' });
  }

  try {
    const reply = await generateText([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ]);

    const { error: insertError } = await auth.client.from('messages').insert([
      {
        user_id: auth.user.id,
        sender: 'user',
        text: message,
        type: 'text',
      },
      {
        user_id: auth.user.id,
        sender: 'ai',
        text: reply,
        type: 'text',
      },
    ]);

    if (insertError) {
      console.error('Failed to persist chat messages', insertError);
      return jsonResponse(500, { error: 'Failed to persist chat messages' });
    }

    return jsonResponse(200, { reply });
  } catch (err) {
    console.error('AI chat call failed', err);
    return jsonResponse(502, { error: 'AI service unavailable' });
  }
});
