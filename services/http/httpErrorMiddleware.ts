/**
 * HTTP 错误拦截中间件
 *
 * 捕获非认证相关的 HTTP 错误（4xx/5xx，跳过 401/403）和网络异常，
 * 通过 errorHandler 向用户展示 Toast 提示
 *
 * 注意：401/403 由 authMiddleware 专门处理，此中间件不干预
 */

import type { FetchMiddleware } from './middleware';
import { handleHttpError } from './errorHandler';

export const httpErrorMiddleware: FetchMiddleware = (next) => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let response: Response;

    try {
      response = await next(input, init);
    } catch (error) {
      // 网络异常（DNS 解析失败、连接被拒绝等）
      handleHttpError(undefined, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    // 跳过 401/403（由 authMiddleware 处理）
    if (!response.ok && response.status !== 401 && response.status !== 403) {
      handleHttpError(response.status);
    }

    return response;
  };
};
