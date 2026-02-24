## Why

当前项目的权限验证逻辑分散在 Supabase Edge Functions（`supabase/functions/_shared/auth.js`）和前端 `authService.ts` 中，前端服务层（如 `transactionService`、`chatService`）直接使用 `supabase` 客户端发起请求，没有统一的请求拦截和权限校验机制。这导致：

1. **前端缺少全局拦截**：没有统一的入口对请求头（如 Token）进行判空和基础校验，无法在请求发出前统一拦截未授权请求。
2. **与 Supabase 强耦合**：权限验证逻辑直接依赖 Supabase SDK，后续若需切换后端技术栈（如自建 API、Firebase），改动成本高。
3. **错误处理不统一**：Token 过期或非法用户的处理逻辑分散在各个 Service 中，没有统一的状态码路由（如 401 → 登录页，403 → 非法用户提示）。

## What Changes

- **新增全局权限拦截器**：在前端服务层建立统一的请求拦截入口，对每次请求进行基础的请求头判空（如 Authorization header 是否存在、格式是否正确），拦截不合法请求。
- **抽象标准认证接口（AuthProvider）**：定义与技术框架无关的统一认证接口，包含 `getToken`、`validateToken`、`onAuthError` 等标准方法。
- **Supabase 实现**：基于现有 `authService.ts` 和 `supabase.ts`，实现上述标准接口的 Supabase 版本，作为默认 Provider。
- **统一错误处理**：拦截器根据响应状态码（401/403）统一执行跳转登录页或提示非法用户等操作。
- **可插拔架构**：通过切换 AuthProvider 实现即可更换后端认证方式，无需修改业务层代码。

## Capabilities

### New Capabilities

- `auth-interceptor`: 全局权限拦截器，负责请求头判空、Token 注入、响应状态码统一处理（401→登录页、403→非法提示）
- `auth-provider`: 抽象认证接口定义（AuthProvider），以及 Supabase 默认实现，支持可插拔切换后端认证方式

### Modified Capabilities

_无现有 spec 需要修改_

## Impact

- **`services/`**：所有现有 Service（`transactionService`、`chatService`、`userService`）的请求调用方式可能需要接入拦截器
- **`stores/`**：`useUserStore` 中的认证状态管理需配合拦截器的错误回调
- **`services/authService.ts`**：将被重构为 AuthProvider 接口的 Supabase 实现
- **`services/supabase.ts`**：可能需要调整以支持拦截器注入 Token
- **路由守卫**：`ProtectedRoute` / `GuestRoute` 与拦截器的协作关系需明确
- **无 Breaking Change**：对外部 API 和 Supabase Edge Functions 无影响，仅为前端架构调整
