import { supabase } from '../supabase';
import type { AuthProvider } from './types';

/**
 * Supabase AuthProvider 实现
 * 基于 Supabase Auth 的默认认证提供者
 */
export class SupabaseAuthProvider implements AuthProvider {
  /**
   * 获取当前 access token
   * 通过 supabase.auth.getSession() 获取 session 中的 access_token
   */
  async getToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  /**
   * 验证当前会话是否有效
   */
  async validateSession(): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session !== null;
  }

  /**
   * 处理认证错误
   * - 401: 清除用户状态，导航至登录页
   * - 403: 显示无权限提示
   * - 其他: 返回 false，交由调用方处理
   */
  async onAuthError(statusCode: number): Promise<boolean> {
    if (statusCode === 401) {
      // 动态导入避免循环依赖
      const { useUserStore } = await import('../../stores/useUserStore');
      useUserStore.getState().logout();
      return true;
    }

    if (statusCode === 403) {
      // TODO: 接入项目统一的 Toast 组件
      console.warn('[Auth] 403 Forbidden: 无权限访问');
      return true;
    }

    return false;
  }
}
