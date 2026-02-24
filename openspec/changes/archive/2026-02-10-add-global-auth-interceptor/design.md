## Context

当前花哪了 App 是一个 React + Supabase 的移动优先记账应用。认证架构现状：

- **路由层**：`App.tsx` 中 `ProtectedRoute` / `GuestRoute` 通过 `useUserStore.isAuthenticated` 控制页面访问
- **状态层**：`useUserStore` 通过 `authService` 调用 Supabase Auth API 管理登录、会话、OTP 流程
- **服务层**：`transactionService`、`chatService`、`userService` 直接导入 `supabase` 客户端发起请求，无统一拦截
- **后端层**：Supabase Edge Functions 通过 `_shared/auth.js` 的 `getAuthenticatedUser()` 做 Token 验证

**核心问题**：前端没有请求级别的全局拦截器，认证错误处理分散在各 Service 中，且所有服务与 Supabase SDK 强耦合。

## Goals / Non-Goals

**Goals:**

- 建立全局请求拦截器，在请求发出前统一做 Token 判空和请求头校验
- 抽象出 `AuthProvider` 标准接口，解耦认证实现与业务层
- 统一 401/403 等认证错误的处理逻辑（跳转登录页 / 非法用户提示）
- 提供 Supabase 的 `AuthProvider` 默认实现
- 保持现有 OTP 登录流程和路由守卫不变

**Non-Goals:**

- 不涉及后端 Edge Functions 的修改
- 不替换现有 Supabase 客户端（`services/supabase.ts`）
- 不涉及 RBAC / 权限角色管理
- 不涉及 token 刷新策略的重新设计（沿用 Supabase SDK 自带刷新逻辑）

## Decisions

### Decision 1: AuthProvider 接口设计 — 接口抽象 vs 直接封装

**选择**：定义 `AuthProvider` 接口 + Provider 模式

**理由**：

- 接口定义标准契约（`getToken`、`validateSession`、`onAuthError`），任何后端都可实现
- 通过 `setAuthProvider(provider)` 全局注册，业务层无需关心具体实现
- 替代方案"直接在 authService 上加 adapter"会导致接口不稳定，扩展性差

**接口定义**：

```typescript
interface AuthProvider {
  /** 获取当前 access token，若无有效 token 返回 null */
  getToken(): Promise<string | null>;
  /** 验证当前会话是否有效 */
  validateSession(): Promise<boolean>;
  /** 处理认证错误，返回是否已处理（如已跳转登录页） */
  onAuthError(statusCode: number): Promise<boolean>;
}
```

### Decision 2: 拦截器实现方式 — HTTP Client Wrapper vs Supabase 事件监听

**选择**：HTTP Client Wrapper（请求拦截器 + 响应拦截器）

**理由**：

- 当前 Supabase JS SDK 自动在请求头注入 session token，但没有统一错误处理
- 我们需要在"请求前"判空 token、在"响应后"处理 401/403
- 实现方式：包装 `supabase` 客户端的 `fetch` 函数（Supabase `createClient` 支持自定义 `global.fetch`）
- 替代方案 "Axios 拦截器"不适用，因为项目使用 Supabase SDK 而非直接 HTTP 调用

**拦截器职责**：

1. **请求拦截**：检查 `AuthProvider.getToken()` 返回是否为空，空则拦截请求触发 `onAuthError(401)`
2. **响应拦截**：捕获 401/403 响应，调用 `AuthProvider.onAuthError(statusCode)` 统一处理

### Decision 3: 错误处理策略 — 状态码路由

| 状态码           | 行为                        |
| ---------------- | --------------------------- |
| 401 Unauthorized | 清除用户状态 → 导航至登录页 |
| 403 Forbidden    | Toast 提示"无权限访问"      |
| 其他错误         | 透传给业务层 Service 处理   |

**实现**：`SupabaseAuthProvider.onAuthError()` 中调用 `useUserStore.getState().logout()` 并触发路由跳转。

### Decision 4: 文件组织 — 新增文件结构

```
services/
├── auth/
│   ├── types.ts              # AuthProvider 接口定义
│   ├── authInterceptor.ts     # 拦截器核心逻辑
│   └── supabaseAuthProvider.ts # Supabase 实现
├── authService.ts             # 保留，供 OTP 登录流程使用
├── supabase.ts                # 修改：接入自定义 fetch 拦截器
└── ...
```

**理由**：将认证抽象层放在 `services/auth/` 子目录，与现有 `authService.ts`（处理 OTP 输入流程）职责分离。

## Risks / Trade-offs

| Risk                                           | Mitigation                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 自定义 fetch 可能与 Supabase SDK 内部行为冲突  | Supabase `createClient` 官方支持 `global.fetch` 自定义；拦截器保持最小侵入，仅做 header 判空和错误码捕获 |
| 拦截器可能影响登录请求（登录时本身没有 token） | 拦截器维护白名单（如 `/auth/` 路径的请求跳过 token 检查）                                                |
| `onAuthError` 中调用 store 可能引发循环依赖    | 通过 `useUserStore.getState()` 直接访问而非 hook 订阅，避免 React 渲染循环                               |
| 未来切换后端时需同步替换 fetch wrapper         | AuthProvider 接口已解耦，切换时只需替换 Provider 实现和 supabase.ts 中的 fetch 配置                      |
