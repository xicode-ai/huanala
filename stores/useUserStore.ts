import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../services/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface UserState {
  user: User | null;
  isLoading: boolean;
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

/**
 * Map a Supabase auth user + profiles row into our app's User type.
 */
async function mapSupabaseUser(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;

  const authUser = session.user;

  // Fetch profile from profiles table
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();

  return {
    id: authUser.id,
    name: profile?.name || authUser.email?.split('@')[0] || 'User',
    handle: profile?.handle || `@${authUser.email?.split('@')[0] || 'user'}`,
    avatar: profile?.avatar_url || 'https://picsum.photos/200',
    isPremium: profile?.is_premium || false,
    phone: profile?.phone || '',
    // Financial fields are computed client-side from transactions
    balance: 0,
    monthlyExpenses: 0,
    dailyAvailable: 0,
    budgetUsedPercent: 0,
    leftAmount: 0,
  };
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true, // start true until session check completes
  isAuthenticated: false,
  authError: null,
  otpSent: false,
  otpEmail: null,

  initAuth: async () => {
    set({ isLoading: true });

    // Check existing session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const user = await mapSupabaseUser(session);
      set({ user, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const user = await mapSupabaseUser(session);
        set({ user, isAuthenticated: true, isLoading: false, otpSent: false });
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, isAuthenticated: false, isLoading: false, otpSent: false, otpEmail: null });
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
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
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) {
        set({ authError: error.message, isLoading: false });
      } else {
        const user = await mapSupabaseUser(data.session ?? null);
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
    await supabase.auth.signOut();
    // onAuthStateChange will clear state
  },

  fetchUser: async () => {
    if (get().user) return; // already loaded
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = await mapSupabaseUser(session);
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
