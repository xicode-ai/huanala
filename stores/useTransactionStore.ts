import { create } from 'zustand';
import { Transaction } from '../types';
import { supabase } from '../services/supabase';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  isUploading: boolean;

  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: Transaction) => void;
  insertTransaction: (tx: Omit<Transaction, 'id'>) => Promise<Transaction | null>;
  uploadBill: (file: File) => Promise<void>;
  uploadVoice: (transcriptText: string) => Promise<void>;

  // Computed financial summary
  monthlyExpenses: number;
  totalIncome: number;
}

/**
 * Map a Supabase row to the app's Transaction type.
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

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  isUploading: false,
  monthlyExpenses: 0,
  totalIncome: 0,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch transactions:', error);
        set({ isLoading: false });
        return;
      }

      const transactions = (data || []).map(mapRow);

      // Compute monthly summary
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyTransactions = transactions.filter(
        (t) => new Date(t.date) >= monthStart || true // all fetched for now
      );
      const monthlyExpenses = monthlyTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalIncome = monthlyTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

      set({ transactions, monthlyExpenses, totalIncome, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      set({ isLoading: false });
    }
  },

  addTransaction: (tx: Transaction) => {
    set((state) => ({
      transactions: [tx, ...state.transactions],
      monthlyExpenses: tx.type === 'expense' ? state.monthlyExpenses + tx.amount : state.monthlyExpenses,
      totalIncome: tx.type === 'income' ? state.totalIncome + tx.amount : state.totalIncome,
    }));
  },

  insertTransaction: async (tx: Omit<Transaction, 'id'>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user.id,
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

    if (error) {
      console.error('Failed to insert transaction:', error);
      return null;
    }

    const mapped = mapRow(data);
    get().addTransaction(mapped);
    return mapped;
  },

  uploadBill: async (file: File) => {
    set({ isUploading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // 1. Upload image to storage
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('bills').upload(path, file);

      if (uploadError) throw uploadError;

      // 2. Create signed URL for fallback image fetch in Edge Function
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('bills')
        .createSignedUrl(path, 60 * 5);

      if (signedUrlError) throw signedUrlError;

      // 3. Call process-bill Edge Function
      const { data, error } = await supabase.functions.invoke('process-bill', {
        body: { image_url: signedUrlData?.signedUrl, storage_path: path },
      });

      if (error) throw error;

      if (data?.transaction) {
        const mapped = mapRow(data.transaction);
        get().addTransaction(mapped);
      }
    } catch (error) {
      console.error('Upload bill failed:', error);
    } finally {
      set({ isUploading: false });
    }
  },

  uploadVoice: async (transcriptText: string) => {
    set({ isUploading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('process-voice', {
        body: { transcript: transcriptText },
      });

      if (error) throw error;

      if (data?.transaction) {
        const mapped = mapRow(data.transaction);
        get().addTransaction(mapped);
      }
    } catch (error) {
      console.error('Voice processing failed:', error);
    } finally {
      set({ isUploading: false });
    }
  },
}));
