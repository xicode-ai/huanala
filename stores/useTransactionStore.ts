import { create } from 'zustand';
import { InputSession } from '../types';
import { authService } from '../services/authService';
import { sessionService } from '../services/sessionService';
import { transactionService } from '../services/transactionService';

interface TransactionState {
  sessions: InputSession[];
  isLoading: boolean;
  isUploading: boolean;
  isFetchingMore: boolean;
  lastBatchCount: number;
  uploadProgress: number;
  page: number;
  hasMore: boolean;
  monthlyExpenses: number;
  totalIncome: number;
  fetchSessions: () => Promise<void>;
  fetchMoreSessions: () => Promise<void>;
  uploadBill: (file: File) => Promise<void>;
  uploadVoice: (transcriptText: string) => Promise<void>;
  clearLastBatchCount: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  sessions: [],
  isLoading: false,
  isUploading: false,
  isFetchingMore: false,
  lastBatchCount: 0,
  uploadProgress: 0,
  page: 0,
  hasMore: true,
  monthlyExpenses: 0,
  totalIncome: 0,

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await authService.getSession();
      if (!session) {
        set({ isLoading: false });
        return;
      }

      const [pageResult, summary] = await Promise.all([
        sessionService.fetchPage(session.user.id, 0),
        sessionService.fetchMonthlySummary(session.user.id),
      ]);

      set({
        sessions: pageResult.sessions,
        hasMore: pageResult.hasMore,
        page: 0,
        monthlyExpenses: summary.expenses,
        totalIncome: summary.income,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      set({ isLoading: false });
    }
  },

  fetchMoreSessions: async () => {
    const { isFetchingMore, hasMore, page } = get();
    if (isFetchingMore || !hasMore) return;

    set({ isFetchingMore: true });
    try {
      const {
        data: { session },
      } = await authService.getSession();
      if (!session) {
        set({ isFetchingMore: false });
        return;
      }

      const nextPage = page + 1;
      const result = await sessionService.fetchPage(session.user.id, nextPage);

      set((state) => ({
        sessions: [...state.sessions, ...result.sessions],
        hasMore: result.hasMore,
        page: nextPage,
        isFetchingMore: false,
      }));
    } catch (error) {
      console.error('Failed to fetch more sessions:', error);
      set({ isFetchingMore: false });
    }
  },

  uploadBill: async (file: File) => {
    set({ isUploading: true, uploadProgress: 0 });
    try {
      const {
        data: { session },
      } = await authService.getSession();
      if (!session) throw new Error('Not authenticated');

      const result = await transactionService.uploadBill(session.user.id, file, (info) => {
        set({ uploadProgress: info.completed });
      });

      set((state) => ({
        sessions: [result.session, ...state.sessions],
        monthlyExpenses:
          state.monthlyExpenses +
          result.transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        totalIncome:
          state.totalIncome +
          result.transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        lastBatchCount: result.transactions.length,
      }));
    } catch (error) {
      console.error('Upload bill failed:', error);
    } finally {
      set({ isUploading: false, uploadProgress: 0 });
    }
  },

  uploadVoice: async (transcriptText: string) => {
    set({ isUploading: true });
    try {
      const {
        data: { session },
      } = await authService.getSession();
      if (!session) throw new Error('Not authenticated');

      const result = await transactionService.processVoice(transcriptText);

      set((state) => ({
        sessions: [result.session, ...state.sessions],
        monthlyExpenses:
          state.monthlyExpenses +
          result.transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        totalIncome:
          state.totalIncome +
          result.transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        lastBatchCount: result.transactions.length,
      }));
    } catch (error) {
      console.error('Voice processing failed:', error);
    } finally {
      set({ isUploading: false });
    }
  },

  clearLastBatchCount: () => {
    set({ lastBatchCount: 0 });
  },
}));
