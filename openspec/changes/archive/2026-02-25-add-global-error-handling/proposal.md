## Why

当前系统缺少统一的全局异常处理机制。现有的 `authInterceptor` 仅覆盖 401/403 认证错误，其他 HTTP 错误（如 500、404、网络超时）直接 `throw` 到业务层，各个 Store 各自 `try/catch` 后仅 `console.error`，用户无感知。同时，应用没有 React Error Boundary 和 `window.onunhandledrejection` 监听，未捕获的异常会导致白屏或静默失败。需要建立与具体请求方式无关的中心化错误处理层，统一拦截、分类和展示错误，提升用户体验和可调试性。

## What Changes

- 新增独立的 HTTP 错误处理中间件，与 `authInterceptor` 平级且职责分离，通过 fetch 中间件组合模式串联；该中间件不依赖 Supabase，未来任何 HTTP 请求均可复用
- 新增 fetch 中间件管道机制，将 authInterceptor 和 httpErrorHandler 以可组合的方式编排，支持灵活增减中间件
- 新增 React Error Boundary 组件，捕获组件渲染阶段的未处理异常，展示降级 UI（Fallback）
- 新增全局未捕获异常监听（`window.onerror` + `window.onunhandledrejection`），兜底捕获所有逃逸的错误并统一提示

## Capabilities

### New Capabilities

- `http-error-handler`: 独立的 HTTP 错误拦截中间件——以 fetch 中间件形式工作，捕获非认证类 HTTP 错误（网络异常、4xx、5xx），转换为标准化错误对象，并通过 Toast 向用户展示友好提示。不依赖任何特定后端 SDK
- `error-boundary`: React Error Boundary 组件——捕获组件树渲染阶段的未处理异常，展示降级 UI，防止整个应用白屏
- `global-error-listener`: 全局未捕获异常兜底监听——注册 `window.onerror` 和 `window.onunhandledrejection`，捕获所有逃逸的运行时错误和未处理的 Promise rejection

### Modified Capabilities

- `auth-interceptor`: 重构为标准 fetch 中间件签名，使其可与其他中间件组合，但内部逻辑不变

## Impact

- **新增模块**: `services/http/` 目录，包含 fetch 中间件管道、HTTP 错误处理中间件、错误分类工具
- **重构模块**: `services/auth/authInterceptor.ts` 重构为标准中间件签名（接口变更，内部逻辑不变）
- **组件层**: `App.tsx` 需包裹 Error Boundary 组件，注册全局监听器
- **Supabase 客户端**: `services/supabase.ts` 改用中间件管道组合后的 fetch
- **Toast 系统**: 已有的 `useToastStore` + `ToastContainer` 将作为错误信息展示通道
- **无外部依赖变更**: 不需要引入新的第三方库
