import { supabase } from './supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * 认证服务 - 封装所有 Supabase Auth 操作
 */
export const authService = {
  /**
   * 获取当前会话
   */
  getSession: () => supabase.auth.getSession(),

  /**
   * 监听认证状态变化
   */
  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) =>
    supabase.auth.onAuthStateChange(callback),

  /**
   * 发送 OTP 验证码
   */
  sendOtp: (email: string) =>
    supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    }),

  /**
   * 验证 OTP 验证码
   */
  verifyOtp: (email: string, token: string) =>
    supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    }),

  /**
   * 退出登录
   */
  signOut: () => supabase.auth.signOut(),
};
