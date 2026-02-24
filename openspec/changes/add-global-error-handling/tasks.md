## 1. Fetch 中间件管道基础设施

- [x] 1.1 创建 `services/http/middleware.ts`，定义 `FetchMiddleware` 类型和 `composeFetch()` 组合函数
- [ ] 1.2 为 `composeFetch()` 编写单元测试，验证多中间件组合、单中间件、无中间件三种场景

## 2. HTTP 错误处理中间件

- [x] 2.1 创建 `services/http/errorHandler.ts`，实现错误分类映射和 `handleHttpError()` 工具函数，通过 `useToastStore.getState().addToast()` 触发 Toast
- [x] 2.2 创建 `services/http/httpErrorMiddleware.ts`，实现 HTTP 错误拦截中间件（捕获 4xx/5xx 状态码和网络异常，跳过 401/403）
- [x] 2.3 创建 `services/http/index.ts`，统一导出中间件管道相关模块

## 3. 重构 authInterceptor 为标准中间件

- [x] 3.1 重构 `services/auth/authInterceptor.ts`，将 `createAuthInterceptorFetch()` 改为符合 `FetchMiddleware` 签名的 `authMiddleware`（内部逻辑不变，`fetch` 调用改为 `next` 调用）
- [x] 3.2 更新 `services/auth/index.ts` 导出，将 `createAuthInterceptorFetch` 替换为 `authMiddleware`

## 4. Supabase 客户端集成

- [x] 4.1 修改 `services/supabase.ts`，使用 `composeFetch(httpErrorMiddleware, authMiddleware)` 替代原来的 `createAuthInterceptorFetch()`

## 5. React Error Boundary 组件

- [x] 5.1 创建 `components/ErrorBoundary.tsx`，实现 class 组件 Error Boundary，包含降级 UI 和重试功能
- [x] 5.2 在 `App.tsx` 中用 `ErrorBoundary` 包裹路由组件树（ToastContainer 保持在 ErrorBoundary 外层）

## 6. 全局未捕获异常监听

- [x] 6.1 创建 `hooks/useGlobalErrorListener.ts`，封装 `window.addEventListener('error')` 和 `window.addEventListener('unhandledrejection')` 的注册/注销逻辑，包含非业务错误过滤
- [x] 6.2 在 `App.tsx` 中调用 `useGlobalErrorListener()` Hook

## 7. 验证

- [x] 7.1 运行 `pnpm build` 确认无编译错误
- [x] 7.2 运行 `pnpm lint` 确认无 lint 错误
- [ ] 7.3 在浏览器中测试：模拟网络断开，验证 Toast 提示正常展示
- [ ] 7.4 在浏览器中测试：模拟组件渲染异常，验证 Error Boundary 降级 UI 正常展示
