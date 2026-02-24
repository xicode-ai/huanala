import { create } from 'zustand';
import { Transaction } from '../types';
import { authService } from '../services/authService';
import { transactionService } from '../services/transactionService';

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
      } = await authService.getSession();
      if (!session) {
        set({ isLoading: false });
        return;
      }

      const transactions = await transactionService.fetchAll(session.user.id);

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
    try {
      const {
        data: { session },
      } = await authService.getSession();
      if (!session) return null;

      const mapped = await transactionService.insert(session.user.id, tx);
      get().addTransaction(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to insert transaction:', error);
      return null;
    }
  },

  uploadBill: async (file: File) => {
    set({ isUploading: true });
    try {
      const {
        data: { session },
      } = await authService.getSession();
      if (!session) throw new Error('Not authenticated');

      const mapped = await transactionService.uploadBill(session.user.id, file);
      get().addTransaction(mapped);
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
      } = await authService.getSession();
      if (!session) throw new Error('Not authenticated');

      const mapped = await transactionService.processVoice(transcriptText);
      get().addTransaction(mapped);
    } catch (error) {
      console.error('Voice processing failed:', error);
    } finally {
      set({ isUploading: false });
    }
  },
}));
