## 1. AuthProvider 接口与类型定义

- [x] 1.1 创建 `services/auth/types.ts`，定义 `AuthProvider` 接口（`getToken`、`validateSession`、`onAuthError`）
- [x] 1.2 在 `services/auth/types.ts` 中实现全局 `setAuthProvider()` / `getAuthProvider()` 注册与获取方法

## 2. Supabase AuthProvider 实现

- [x] 2.1 创建 `services/auth/supabaseAuthProvider.ts`，实现 `SupabaseAuthProvider` 类
- [x] 2.2 实现 `getToken()` — 通过 `supabase.auth.getSession()` 获取 `access_token`
- [x] 2.3 实现 `validateSession()` — 检查当前 session 是否存在
- [x] 2.4 实现 `onAuthError(statusCode)` — 401 清除状态并跳转登录页，403 显示提示，其他返回 `false`

## 3. 拦截器核心逻辑

- [x] 3.1 创建 `services/auth/authInterceptor.ts`，实现自定义 `fetch` wrapper 函数
- [x] 3.2 实现请求前拦截：调用 `getAuthProvider().getToken()` 判空，为空时触发 `onAuthError(401)` 并阻止请求
- [x] 3.3 实现白名单机制：对 `/auth/` 等认证路径跳过 Token 检查
- [x] 3.4 实现响应后拦截：捕获 401/403 状态码，调用 `onAuthError(statusCode)` 统一处理

## 4. 接入 Supabase 客户端

- [x] 4.1 修改 `services/supabase.ts`，将自定义 fetch wrapper 注入 `createClient` 的 `global.fetch` 配置
- [x] 4.2 在应用启动点（`App.tsx` 或入口文件）调用 `setAuthProvider(new SupabaseAuthProvider())` 完成注册

## 5. 验证与测试

- [x] 5.1 验证正常登录后请求携带 Token 且正常发出
- [x] 5.2 验证 Token 为空时请求被拦截并跳转登录页
- [x] 5.3 验证登录请求（白名单）不被拦截
- [x] 5.4 验证服务端 401 响应触发登出跳转
- [x] 5.5 验证服务端 403 响应显示无权限提示
- [x] 5.6 验证非认证错误（500/404）正常透传给业务层
