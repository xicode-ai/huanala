import { Message, Transaction, User } from '../types';
import { supabase } from './supabase';

function mapTransaction(row: Record<string, unknown>): Transaction {
  const createdAt = new Date(String(row.created_at || Date.now()));
  return {
    id: String(row.id),
    title: String(row.title || 'Transaction'),
    amount: Number(row.amount || 0),
    currency: String(row.currency || '¥'),
    date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    category: String(row.category || 'Other'),
    icon: String(row.icon || 'receipt'),
    iconBg: String(row.icon_bg || 'bg-slate-50'),
    iconColor: String(row.icon_color || 'text-slate-500'),
    type: row.type === 'income' ? 'income' : 'expense',
    note: row.note ? String(row.note) : undefined,
    details: {
      merchant: row.merchant ? String(row.merchant) : undefined,
      description: row.description ? String(row.description) : undefined,
    },
  };
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    sender: row.sender === 'user' ? 'user' : 'ai',
    text: String(row.text || ''),
    timestamp: row.created_at ? new Date(String(row.created_at)).toLocaleString() : 'Just now',
    type: row.type === 'chart' || row.type === 'transaction_list' ? row.type : 'text',
  };
}

async function mapSessionUser(): Promise<User> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

  return {
    id: session.user.id,
    name: profile?.name || session.user.email?.split('@')[0] || 'User',
    handle: profile?.handle || `@${session.user.email?.split('@')[0] || 'user'}`,
    avatar: profile?.avatar_url || 'https://picsum.photos/200',
    isPremium: Boolean(profile?.is_premium),
    phone: profile?.phone || '',
    balance: 0,
    monthlyExpenses: 0,
    dailyAvailable: 0,
    budgetUsedPercent: 0,
    leftAmount: 0,
  };
}

export const Api = {
  login: async (email: string): Promise<User> => {
    const password = 'unused';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return mapSessionUser();
  },

  getUser: async (): Promise<User> => mapSessionUser(),

  getTransactions: async (): Promise<Transaction[]> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => mapTransaction(row as unknown as Record<string, unknown>));
  },

  getChatHistory: async (): Promise<Message[]> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => mapMessage(row as unknown as Record<string, unknown>));
  },

  sendMessage: async (text: string): Promise<Message> => {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { message: text },
    });
    if (error) throw error;

    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: String(data?.reply || ''),
      timestamp: 'Just now',
      type: 'text',
    };
  },

  uploadBill: async (file: File): Promise<Transaction> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${session.user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('bills').upload(path, file);
    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('bills')
      .createSignedUrl(path, 60 * 5);
    if (signedUrlError) throw signedUrlError;

    const { data, error } = await supabase.functions.invoke('process-bill', {
      body: { image_url: signedUrlData?.signedUrl, storage_path: path },
    });
    if (error || !data?.transaction) throw error || new Error('No transaction returned');

    return mapTransaction(data.transaction as Record<string, unknown>);
  },

  uploadVoice: async (transcriptText: string): Promise<Transaction> => {
    const { data, error } = await supabase.functions.invoke('process-voice', {
      body: { transcript: transcriptText },
    });
    if (error || !data?.transaction) throw error || new Error('No transaction returned');

    return mapTransaction(data.transaction as Record<string, unknown>);
  },
};
