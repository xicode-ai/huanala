import { Transaction } from '../types';
import { supabase } from './supabase';

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
   * 获取用户所有交易记录
   */
  fetchAll: async (userId: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRow);
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
   * 上传账单图片并处理
   */
  uploadBill: async (userId: string, file: File): Promise<Transaction> => {
    // 1. Upload image to storage
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('bills').upload(path, file);

    if (uploadError) throw uploadError;

    // 2. Create signed URL for Edge Function
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('bills')
      .createSignedUrl(path, 60 * 5);

    if (signedUrlError) throw signedUrlError;

    // 3. Call process-bill Edge Function
    const { data, error } = await supabase.functions.invoke('process-bill', {
      body: { image_url: signedUrlData?.signedUrl, storage_path: path },
    });

    if (error || !data?.transaction) {
      throw error || new Error('No transaction returned from process-bill');
    }

    return mapRow(data.transaction);
  },

  /**
   * 处理语音记账
   */
  processVoice: async (transcript: string): Promise<Transaction> => {
    const { data, error } = await supabase.functions.invoke('process-voice', {
      body: { transcript },
    });

    if (error || !data?.transaction) {
      throw error || new Error('No transaction returned from process-voice');
    }

    return mapRow(data.transaction);
  },
};
