/**
 * Fetch 中间件类型定义与管道组合工具
 *
 * 中间件签名：接收下一层 fetch 函数，返回增强后的 fetch 函数
 * 通过 composeFetch() 将多个中间件按顺序组合为最终的 fetch 函数
 */

/**
 * Fetch 中间件类型
 * 每个中间件接收 next（下一层 fetch），返回增强后的 fetch
 */
export type FetchMiddleware = (next: typeof fetch) => typeof fetch;

/**
 * 将多个 Fetch 中间件组合为一个最终的 fetch 函数
 *
 * 中间件按从左到右顺序包裹（左边在外层先执行）：
 *   composeFetch(A, B)(request)
 *   → A 拦截 → B 拦截 → 原生 fetch → B 后处理 → A 后处理
 *
 * @param middlewares - 要组合的中间件列表
 * @returns 组合后的 fetch 函数
 */
export const composeFetch = (...middlewares: FetchMiddleware[]): typeof fetch => {
  return middlewares.reduceRight<typeof fetch>((next, middleware) => middleware(next), fetch);
};
