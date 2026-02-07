import { create } from 'zustand';
import { Transaction } from '../types';
import { Api } from '../services/api';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  isUploading: boolean;

  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: Transaction) => void;
  uploadBill: (file: File) => Promise<void>;
  uploadVoice: (transcriptText: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  isLoading: false,
  isUploading: false,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const transactions = await Api.getTransactions();
      set({ transactions });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: (tx: Transaction) => {
    set((state) => ({ transactions: [tx, ...state.transactions] }));
  },

  uploadBill: async (file: File) => {
    set({ isUploading: true });
    try {
      const newTransaction = await Api.uploadBill(file);
      set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
    } catch (error) {
      console.error('Upload bill failed:', error);
    } finally {
      set({ isUploading: false });
    }
  },

  uploadVoice: async (transcriptText: string) => {
    set({ isUploading: true });
    try {
      const newTransaction = await Api.uploadVoice(transcriptText);
      set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
    } catch (error) {
      console.error('Voice processing failed:', error);
    } finally {
      set({ isUploading: false });
    }
  },
}));
