## Context

当前应用的错误处理呈碎片化状态：

- **Auth 层**: `authInterceptor.ts` 通过 `createAuthInterceptorFetch()` 注入 Supabase 的 `global.fetch`，仅拦截 401/403 认证错误
- **Service 层**: 各 Service（`transactionService`、`chatService`、`userService`）在出错时直接 `throw error`，无统一包装
- **Store 层**: 各 Store 各自 `try/catch`，处理方式一致（`console.error` + 设置 `isLoading: false`），但缺少用户通知
- **UI 层**: 无 React Error Boundary，无全局 `onerror`/`onunhandledrejection` 监听
- **Toast 系统**: `useToastStore` + `ToastContainer` 已就绪，支持 `success/error/warning/info` 四种类型，但未被错误流使用

核心问题：`authInterceptor` 目前直接返回包装后的 `fetch` 函数，与 Supabase SDK 耦合。如果未来接入非 Supabase 的 HTTP 接口，现有模式无法扩展。

## Goals / Non-Goals

**Goals:**

- 建立独立于 Supabase 的 HTTP 错误处理中间件，可被任意 HTTP 请求通道复用
- 设计可组合的 fetch 中间件管道，将 auth 和 error handling 解耦为独立中间件
- 提供 React Error Boundary 防止组件渲染崩溃导致白屏
- 注册全局兜底监听器捕获逃逸的未处理异常
- 复用现有 Toast 系统作为错误展示通道

**Non-Goals:**

- 不在本次变更中逐一重构所有 Store 的 catch 分支（后续渐进式迁移）
- 不引入第三方错误监控服务（如 Sentry）
- 不修改 Supabase SDK 内部行为
- 不改变 `AuthProvider` 接口定义

## Decisions

### Decision 1: 采用 fetch 中间件管道模式，auth 与 error handling 各为独立中间件

**选择**: 定义标准中间件签名 `type FetchMiddleware = (next: typeof fetch) => typeof fetch`，每个中间件接收下一层 fetch 并返回增强后的 fetch。通过 `composeFetch(...middlewares)` 函数将多个中间件组合为最终 fetch。

**架构示意**:

```
请求 → [httpErrorMiddleware] → [authMiddleware] → 原生 fetch → 响应
                ↓ 错误                   ↓ 401/403
            Toast 通知             AuthProvider.onAuthError
```

**理由**:

- 职责单一：每个中间件只关注一类问题
- 可扩展：未来新增日志、重试、缓存等中间件只需追加，无需修改现有代码
- 与框架无关：任何使用 fetch 的代码（Supabase、自定义 API 调用）都可使用同一管道
- 中间件顺序可控：error handler 在外层先捕获，auth 在内层先处理认证

**替代方案**:

- 在 `authInterceptor` 中直接扩展错误处理 → 职责混合，对非 Supabase 请求不可用
- 使用 Axios 等自带拦截器的库 → 引入不必要的依赖，与 Supabase SDK 的 fetch 模式不兼容

### Decision 2: 新建 `services/http/` 模块放置所有 HTTP 基础设施

**选择**: 创建 `services/http/` 目录，包含：

- `middleware.ts` — 中间件类型定义和 `composeFetch()` 组合函数
- `httpErrorMiddleware.ts` — HTTP 错误拦截中间件
- `errorHandler.ts` — 错误分类、用户提示映射、Toast 桥接

**理由**:

- 与 `services/auth/` 平级，层次清晰
- HTTP 基础设施独立于认证逻辑和业务服务
- 未来非 Supabase 的 API client 可以直接 `import { composeFetch } from './http'`

### Decision 3: 重构 authInterceptor 为标准中间件签名

**选择**: 将 `createAuthInterceptorFetch()` 重构为符合 `FetchMiddleware` 签名的 `authMiddleware`：`(next: typeof fetch) => typeof fetch`。内部逻辑（白名单检查、Token 判空、401/403 处理）保持不变。

**理由**:

- 使 auth 逻辑可以与其他中间件自由组合
- 改动最小化：仅调整函数签名，增加 `next` 参数调用，内部逻辑不变
- `supabase.ts` 中改用 `composeFetch(httpErrorMiddleware, authMiddleware)` 替代原来的直接调用

### Decision 4: 错误分类与用户提示映射，集中在 errorHandler.ts

**选择**: 通过 `handleHttpError(error)` 函数统一分类，内部调用 `useToastStore.getState().addToast()`。

| 错误类型                              | Toast 类型                       | 用户提示                   |
| ------------------------------------- | -------------------------------- | -------------------------- |
| 网络异常 (TypeError: Failed to fetch) | `error`                          | "网络连接异常，请检查网络" |
| 408 / 504 超时                        | `warning`                        | "请求超时，请稍后重试"     |
| 404                                   | `warning`                        | "请求的资源不存在"         |
| 429                                   | `warning`                        | "操作过于频繁，请稍后再试" |
| 500+                                  | `error`                          | "服务器异常，请稍后重试"   |
| 其他 4xx                              | `warning`                        | "请求出错，请重试"         |
| 401/403                               | _(跳过，由 authMiddleware 处理)_ |                            |

**理由**:

- 拦截器中不直接引入 Store，通过工具函数解耦
- 后续 Store 中的 catch 分支可直接调用此函数，实现渐进式迁移

### Decision 5: Error Boundary 使用 class 组件实现

**选择**: 使用 React class 组件 `ErrorBoundary`，这是项目中唯一的例外。

**理由**:

- React 仅支持 class 组件的 `componentDidCatch` / `getDerivedStateFromError`
- 这是 React 官方推荐方式，无函数式替代。在组件注释中说明原因

### Decision 6: 全局监听器在 App 组件的 useEffect 中注册

**选择**: 在 `App.tsx` 的 `useEffect` 中注册 `window.addEventListener('error')` 和 `window.addEventListener('unhandledrejection')`，内部调用 `errorHandler.ts` 的统一处理函数。

**理由**:

- `App` 是应用根组件，生命周期与应用一致
- 可在 cleanup 中移除监听器，避免内存泄漏
- 与现有 `initAuth()` 的 useEffect 模式一致

## Risks / Trade-offs

- **[authInterceptor 签名变更]** → 需要同步修改 `supabase.ts` 中的调用方式；影响面可控，仅一处调用点
- **[中间件执行顺序]** → 顺序不当可能导致错误被重复处理（如 401 同时触发 error handler 和 auth handler）；通过在 httpErrorMiddleware 中跳过 401/403 来规避
- **[Toast 疲劳]** → 高频错误可能导致大量 Toast 弹出；可通过去重逻辑缓解，留待后续优化
- **[Error Boundary class 组件]** → 与项目"禁用 class 组件"规范冲突；这是 React API 限制的已知例外
- **[全局监听器兜底范围]** → 可能捕获到非业务相关的浏览器错误；通过过滤条件（如忽略 Chrome 扩展错误）限定范围
