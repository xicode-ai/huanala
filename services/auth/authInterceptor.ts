import { getAuthProvider } from './types';
import type { FetchMiddleware } from '../http/middleware';

/**
 * 认证请求白名单路径
 * 匹配这些路径的请求将跳过 Token 检查
 */
const AUTH_WHITELIST_PATTERNS = ['/auth/', '/auth/v1/'];

/**
 * 检查请求 URL 是否匹配白名单
 */
const isWhitelisted = (url: string): boolean => {
  return AUTH_WHITELIST_PATTERNS.some((pattern) => url.includes(pattern));
};

/**
 * 认证拦截中间件（符合 FetchMiddleware 签名）
 *
 * - 请求前：检查 Token 是否存在，空则拦截并触发认证错误处理
 * - 白名单：对 /auth/ 路径跳过 Token 检查
 * - 响应后：捕获 401/403 状态码，调用 onAuthError 统一处理
 */
export const authMiddleware: FetchMiddleware = (next) => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // 白名单请求直接放行
    if (isWhitelisted(url)) {
      return next(input, init);
    }

    const provider = getAuthProvider();

    // 请求前拦截：Token 判空
    const token = await provider.getToken();
    if (!token) {
      await provider.onAuthError(401);
      throw new Error('[AuthInterceptor] 请求被拦截：Token 为空，用户未认证');
    }

    // 显式注入 Authorization Header，解决 supabase-js 可能未及时更新 Header 的竞态问题
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);

    // 发起请求（调用下一层中间件或原生 fetch）
    const response = await next(input, { ...init, headers });

    // 响应后拦截：状态码检查
    if (response.status === 401 || response.status === 403) {
      const handled = await provider.onAuthError(response.status);
      if (handled) {
        throw new Error(`[AuthInterceptor] 认证错误 ${response.status} 已处理`);
      }
    }

    return response;
  };
};
