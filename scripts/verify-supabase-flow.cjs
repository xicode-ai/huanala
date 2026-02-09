const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

async function main() {
  const url = process.env.VITE_SUPABASE_URL || 'https://rhltcewfhlawwjeokejt.supabase.co';
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_s7cZ6ysbi8kkNtpEJVEbFA_UWE_0FjM';
  const supabase = createClient(url, key);

  const email = `opsx${Date.now()}${crypto.randomBytes(3).toString('hex')}@testmail.com`;
  const password = 'Passw0rd!';
  const out = { email };

  const signUp = await supabase.auth.signUp({ email, password });
  out.signUpError = signUp.error ? signUp.error.message : null;
  if (signUp.error) return out;

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  out.signInError = signIn.error ? signIn.error.message : null;
  if (signIn.error) return out;

  const userId = signIn.data.user.id;
  out.userId = userId;

  const chat = await supabase.functions.invoke('ai-chat', {
    body: { message: 'hello from verification' },
  });
  out.chatError = chat.error ? chat.error.message : null;
  out.chatReply = chat.data?.reply ? String(chat.data.reply).slice(0, 80) : null;

  const voice = await supabase.functions.invoke('process-voice', {
    body: { transcript: '今天打车花了45块' },
  });
  out.voiceError = voice.error ? voice.error.message : null;
  out.voiceTxId = voice.data?.transaction?.id || null;

  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAASwAAACQCAIAAADxQW8VAAAB8ElEQVR4nO3SMQEAIAzAsIF/z0MGRxMFvXp2ZgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgJ8B1wgAAW1Y7JwAAAAASUVORK5CYII=';
  const fileBytes = Buffer.from(pngBase64, 'base64');
  const path = `${userId}/${Date.now()}.png`;

  const upload = await supabase.storage.from('bills').upload(path, fileBytes, {
    contentType: 'image/png',
    upsert: true,
  });
  out.billUploadError = upload.error ? upload.error.message : null;

  const signed = await supabase.storage.from('bills').createSignedUrl(path, 300);
  out.billSignedUrlError = signed.error ? signed.error.message : null;

  if (!signed.error) {
    const bill = await supabase.functions.invoke('process-bill', {
      body: { image_url: signed.data.signedUrl, storage_path: path },
    });
    out.billError = bill.error ? bill.error.message : null;
    out.billTxId = bill.data?.transaction?.id || null;
    out.billRaw = bill.data || null;
  }

  const tx = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  out.transactionCount = tx.data?.length || 0;

  const msg = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  out.messageCount = msg.data?.length || 0;

  await supabase.auth.signOut();
  const restore = await supabase.auth.signInWithPassword({ email, password });
  out.restoreError = restore.error ? restore.error.message : null;

  return out;
}

main()
  .then((res) => {
    process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  })
  .catch((err) => {
    process.stderr.write(`${String(err)}\n`);
    process.exit(1);
  });
