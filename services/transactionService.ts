import { Transaction, InputSession } from '../types';
import { supabase } from './supabase';
import { compressImage } from './imageCompression';

const PAGE_SIZE = 20;

/** SSE line delimiter */
const LF = '\n';

/**
 * 将 Supabase 行数据映射为 Transaction 类型
 */
function mapRow(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    title: row.title as string,
    amount: Number(row.amount),
    currency: (row.currency as string) || '¥',
    date: new Date(row.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: new Date(row.created_at as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    category: row.category as string,
    icon: (row.icon as string) || 'receipt',
    iconBg: (row.icon_bg as string) || 'bg-slate-50',
    iconColor: (row.icon_color as string) || 'text-slate-500',
    type: row.type as 'expense' | 'income',
    note: row.note as string | undefined,
    sessionId: (row.session_id as string) || undefined,
    details: {
      merchant: row.merchant as string | undefined,
      description: row.description as string | undefined,
    },
  };
}

/**
 * 交易服务 - 交易记录 CRUD 和相关操作
 */
export const transactionService = {
  /**
   * 分页获取用户交易记录
   */
  fetchPage: async (
    userId: string,
    page: number = 0,
    pageSize: number = PAGE_SIZE
  ): Promise<{ transactions: Transaction[]; hasMore: boolean }> => {
    const from = page * pageSize;
    const to = from + pageSize; // 多取 1 条判断是否还有更多

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const rows = data || [];
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

    return {
      transactions: pageRows.map(mapRow),
      hasMore,
    };
  },

  /**
   * 获取当月收支汇总
   */
  fetchMonthlySummary: async (userId: string): Promise<{ expenses: number; income: number }> => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('created_at', monthStart);

    if (error) throw error;

    const rows = data || [];
    const expenses = rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
    const income = rows.filter((r) => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);

    return { expenses, income };
  },

  /**
   * 根据 session_id 获取会话下所有交易
   */
  fetchBySessionId: async (sessionId: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapRow);
  },

  /**
   * 根据 session_id 分页获取会话下交易记录
   */
  fetchBySessionIdPage: async (
    sessionId: string,
    page: number = 0,
    pageSize: number = PAGE_SIZE
  ): Promise<{ transactions: Transaction[]; hasMore: boolean }> => {
    const from = page * pageSize;
    const to = from + pageSize; // 多取 1 条判断是否还有更多

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const rows = data || [];
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

    return {
      transactions: pageRows.map(mapRow),
      hasMore,
    };
  },

  /**
   * 插入新交易记录
   */
  insert: async (userId: string, tx: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        title: tx.title,
        amount: tx.amount,
        currency: tx.currency,
        category: tx.category,
        icon: tx.icon,
        icon_bg: tx.iconBg,
        icon_color: tx.iconColor,
        type: tx.type,
        note: tx.note,
        merchant: tx.details?.merchant,
        description: tx.details?.description,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  /**
   * 上传账单图片并处理 — SSE streaming, returns new InputSession + transactions
   */
  uploadBill: async (
    userId: string,
    file: File,
    onProgress?: (info: { completed: number; latest: Transaction }) => void
  ): Promise<{ session: InputSession; transactions: Transaction[] }> => {
    // Compress image client-side (WebP preferred, JPEG fallback)
    const compressed = await compressImage(file);
    const ext = compressed.type === 'image/webp' ? '.webp' : '.jpg';
    const path = `${userId}/${Date.now()}${ext}`;
    const { error: uploadError } = await supabase.storage.from('bills').upload(path, compressed, {
      contentType: compressed.type,
    });
    if (uploadError) throw uploadError;

    // Get auth token for direct fetch (bypass supabase.functions.invoke for SSE streaming)
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (!authSession?.access_token) throw new Error('Not authenticated');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/process-bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authSession.access_token}`,
      },
      body: JSON.stringify({ storage_path: path }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`process-bill failed: ${response.status}`);
    }

    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const transactions: Transaction[] = [];
    let sessionId = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const sseLines = buffer.split(LF);
      buffer = sseLines.pop() || '';

      for (const line of sseLines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'transaction_inserted' && event.data) {
            const tx = mapRow(event.data);
            transactions.push(tx);
            onProgress?.({ completed: event.progress?.completed || transactions.length, latest: tx });
          } else if (event.type === 'completed') {
            sessionId = event.session_id || '';
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Bill processing failed');
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }

    if (transactions.length === 0) {
      throw new Error('No transactions returned from process-bill');
    }

    const now = new Date().toISOString();
    const session: InputSession = {
      id: sessionId,
      source: 'bill_scan',
      recordCount: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      currency: transactions[0]?.currency || '¥',
      date: new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      createdAt: now,
    };

    return { session, transactions };
  },

  /**
   * 处理语音记账 — returns new InputSession + transactions
   */
  processVoice: async (transcript: string): Promise<{ session: InputSession; transactions: Transaction[] }> => {
    const { data, error } = await supabase.functions.invoke('process-voice', {
      body: { transcript },
    });

    if (error || !Array.isArray(data?.transactions) || data.transactions.length === 0) {
      throw error || new Error('No transactions returned from process-voice');
    }

    const txs = (data.transactions as Record<string, unknown>[]).map(mapRow);
    const now = new Date().toISOString();
    const session: InputSession = {
      id: data.session_id as string,
      source: 'voice',
      recordCount: txs.length,
      totalAmount: txs.reduce((sum, t) => sum + t.amount, 0),
      currency: txs[0]?.currency || '¥',
      date: new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      createdAt: now,
    };

    return { session, transactions: txs };
  },
};
