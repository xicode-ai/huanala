import { create } from 'zustand';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User } from '../types';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

interface UserState {
  user: User | null;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  otpSent: boolean;
  otpEmail: string | null;

  initAuth: () => Promise<() => void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  resetOtpFlow: () => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitializing: true, // start true until session check completes
  isAuthenticated: false,
  authError: null,
  otpSent: false,
  otpEmail: null,

  initAuth: async () => {
    set({ isInitializing: true });

    // 标记是否已从 getSession 获取用户，避免 onAuthStateChange 重复处理
    let sessionHandled = false;

    // Check existing session
    const {
      data: { session },
    } = await authService.getSession();
    if (session) {
      const user = await userService.mapSupabaseSession(session);
      set({ user, isAuthenticated: true, isInitializing: false });
      sessionHandled = true;
    } else {
      set({ isInitializing: false });
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      // 跳过初始化阶段已处理的 session（避免重复查询 profiles）
      if (sessionHandled && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        sessionHandled = false; // 重置标记，后续事件正常处理
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const user = await userService.mapSupabaseSession(session);
        set({ user, isAuthenticated: true, isInitializing: false, otpSent: false });
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, isAuthenticated: false, isInitializing: false, otpSent: false, otpEmail: null });
      }
    });

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
    };
  },

  sendOtp: async (email: string) => {
    set({ isLoading: true, authError: null });
    try {
      const { error } = await authService.sendOtp(email);
      if (error) {
        set({ authError: error.message, isLoading: false });
      } else {
        set({ isLoading: false, otpSent: true, otpEmail: email });
      }
    } catch (error) {
      set({
        authError: error instanceof Error ? error.message : 'Failed to send OTP',
        isLoading: false,
      });
    }
  },

  verifyOtp: async (email: string, token: string) => {
    set({ isLoading: true, authError: null });
    try {
      const { data, error } = await authService.verifyOtp(email, token);
      if (error) {
        set({ authError: error.message, isLoading: false });
      } else {
        const user = await userService.mapSupabaseSession(data.session ?? null);
        set({
          user,
          isAuthenticated: Boolean(user),
          isLoading: false,
          otpSent: false,
        });
      }
    } catch (error) {
      set({
        authError: error instanceof Error ? error.message : 'OTP verification failed',
        isLoading: false,
      });
    }
  },

  resetOtpFlow: () => {
    set({ otpSent: false, otpEmail: null, authError: null });
  },

  logout: async () => {
    set({ isLoading: true });
    await authService.signOut();
    // onAuthStateChange will clear state
  },

  fetchUser: async () => {
    if (get().user) return; // already loaded
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await authService.getSession();
      const user = await userService.mapSupabaseSession(session);
      if (user) {
        set({ user, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ authError: null }),
}));
