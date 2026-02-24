import type { Session } from '@supabase/supabase-js';
import { User } from '../types';
import { supabase } from './supabase';

/**
 * 用户服务 - 用户 Profile 查询和数据映射
 */
export const userService = {
  /**
   * 根据 Supabase Session 获取并映射用户信息
   */
  mapSupabaseSession: async (session: Session | null): Promise<User | null> => {
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
  },

  /**
   * 根据用户 ID 获取 Profile
   */
  getProfile: async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  },
};
