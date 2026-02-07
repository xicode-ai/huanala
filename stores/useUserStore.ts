import { create } from 'zustand';
import { User } from '../types';
import { Api } from '../services/api';

interface UserState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (phone: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (phone: string) => {
    set({ isLoading: true });
    try {
      const user = await Api.login(phone);
      set({ user, isAuthenticated: true });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    if (get().user) return; // already loaded
    set({ isLoading: true });
    try {
      const user = await Api.getUser();
      set({ user, isAuthenticated: true });
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
