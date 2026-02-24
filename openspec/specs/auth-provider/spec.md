## ADDED Requirements

### Requirement: AuthProvider 标准接口定义

系统 SHALL 定义一个与技术框架无关的 `AuthProvider` 接口，作为所有认证操作的统一契约。接口 MUST 包含以下方法：

- `getToken(): Promise<string | null>` — 获取当前有效 Token
- `validateSession(): Promise<boolean>` — 验证当前会话是否有效
- `onAuthError(statusCode: number): Promise<boolean>` — 处理认证错误，返回是否已处理

#### Scenario: 接口定义类型完整

- **WHEN** 开发者引入 `AuthProvider` 接口
- **THEN** TypeScript 编译器 SHALL 强制实现所有三个方法
- **THEN** 方法签名 SHALL 与定义严格一致

### Requirement: 全局 AuthProvider 注册与获取

系统 SHALL 提供全局的 `setAuthProvider(provider)` 和 `getAuthProvider()` 方法，用于注册和获取当前使用的 AuthProvider 实例。

#### Scenario: 注册 AuthProvider

- **WHEN** 应用启动时调用 `setAuthProvider(provider)`
- **THEN** 传入的 provider 实例 SHALL 被设置为全局认证提供者
- **THEN** 后续 `getAuthProvider()` SHALL 返回该实例

#### Scenario: 未注册时获取 Provider

- **WHEN** 在未调用 `setAuthProvider` 的情况下调用 `getAuthProvider()`
- **THEN** 系统 SHALL 抛出明确的错误提示，告知 AuthProvider 未初始化

### Requirement: Supabase AuthProvider 实现

系统 SHALL 提供基于 Supabase Auth 的 `AuthProvider` 默认实现（`SupabaseAuthProvider`），封装现有的 Supabase 认证逻辑。

#### Scenario: getToken 返回 Supabase session token

- **WHEN** 用户已通过 Supabase Auth 登录
- **THEN** `getToken()` SHALL 通过 `supabase.auth.getSession()` 获取当前 session 的 `access_token`
- **THEN** 若 session 存在，SHALL 返回 `access_token` 字符串
- **THEN** 若 session 不存在或已过期，SHALL 返回 `null`

#### Scenario: validateSession 检查会话有效性

- **WHEN** 调用 `validateSession()`
- **THEN** SHALL 通过 `supabase.auth.getSession()` 检查 session 是否存在
- **THEN** 返回 `true`（有效）或 `false`（无效/过期）

#### Scenario: onAuthError 处理 401 错误

- **WHEN** 调用 `onAuthError(401)`
- **THEN** SHALL 调用 `useUserStore.getState()` 清除用户状态
- **THEN** SHALL 触发页面导航至登录页（`/`）
- **THEN** SHALL 返回 `true` 表示错误已处理

#### Scenario: onAuthError 处理 403 错误

- **WHEN** 调用 `onAuthError(403)`
- **THEN** SHALL 向用户展示"无权限访问"提示（Toast 或类似 UI 反馈）
- **THEN** SHALL 返回 `true` 表示错误已处理

#### Scenario: onAuthError 处理未知错误码

- **WHEN** 调用 `onAuthError()` 且状态码非 401/403
- **THEN** SHALL 返回 `false` 表示错误未被处理，交由调用方处理

### Requirement: AuthProvider 可插拔替换

系统 SHALL 支持在不修改业务层代码的前提下，通过替换 `setAuthProvider()` 的传入实例来切换认证后端。

#### Scenario: 替换为自定义 AuthProvider

- **WHEN** 开发者实现了新的 `AuthProvider`（如基于自建后端 JWT 验证）
- **THEN** 通过 `setAuthProvider(customProvider)` 注册后，拦截器和业务层 SHALL 自动使用新的认证逻辑
- **THEN** 无需修改 `transactionService`、`chatService` 等业务层代码
