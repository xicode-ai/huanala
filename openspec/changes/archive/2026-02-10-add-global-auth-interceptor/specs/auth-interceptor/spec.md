## ADDED Requirements

### Requirement: 请求前 Token 判空拦截

系统 SHALL 在每个受保护的 HTTP 请求发出前，通过 `AuthProvider.getToken()` 检查当前用户是否持有有效 Token。若 Token 为空（`null`），系统 SHALL 拦截该请求并触发认证错误处理流程。

#### Scenario: Token 存在时正常放行

- **WHEN** 用户已登录且 `AuthProvider.getToken()` 返回有效 Token
- **THEN** 请求 SHALL 正常发出，Token 包含在 Authorization 请求头中

#### Scenario: Token 为空时拦截请求

- **WHEN** 用户未登录或 Token 已失效，`AuthProvider.getToken()` 返回 `null`
- **THEN** 请求 SHALL 被拦截，不发送到服务端
- **THEN** 系统 SHALL 调用 `AuthProvider.onAuthError(401)` 进行错误处理

### Requirement: 白名单请求跳过拦截

系统 SHALL 维护一个请求白名单，对认证相关的请求（如登录、注册、OTP 验证）跳过 Token 检查。

#### Scenario: 登录请求不被拦截

- **WHEN** 请求路径匹配白名单规则（如 Supabase Auth API 路径 `/auth/`）
- **THEN** 拦截器 SHALL 跳过 Token 检查，允许请求正常发出

#### Scenario: 非白名单请求正常拦截

- **WHEN** 请求路径不在白名单中且 Token 为空
- **THEN** 拦截器 SHALL 按照标准流程拦截请求

### Requirement: 响应状态码统一处理

系统 SHALL 在收到 HTTP 响应后，检查状态码。对于 401 和 403 状态码，系统 SHALL 调用 `AuthProvider.onAuthError(statusCode)` 进行统一处理。

#### Scenario: 401 响应触发登出

- **WHEN** 服务端返回 HTTP 401 Unauthorized 响应
- **THEN** 系统 SHALL 调用 `AuthProvider.onAuthError(401)`
- **THEN** 用户状态 SHALL 被清除，页面 SHALL 导航至登录页

#### Scenario: 403 响应提示无权限

- **WHEN** 服务端返回 HTTP 403 Forbidden 响应
- **THEN** 系统 SHALL 调用 `AuthProvider.onAuthError(403)`
- **THEN** 系统 SHALL 向用户展示"无权限访问"的提示信息

#### Scenario: 非认证错误透传

- **WHEN** 服务端返回非 401/403 的错误响应（如 500、404）
- **THEN** 拦截器 SHALL 不做特殊处理，将错误透传给业务层

### Requirement: 通过自定义 fetch 接入 Supabase 客户端

拦截器 SHALL 通过 Supabase `createClient` 的 `global.fetch` 配置项注入，作为所有 Supabase SDK 请求的统一入口。

#### Scenario: Supabase 客户端使用拦截器 fetch

- **WHEN** 应用初始化 Supabase 客户端时
- **THEN** `createClient` SHALL 使用包含拦截逻辑的自定义 `fetch` 函数
- **THEN** 所有通过 Supabase SDK 发起的请求 SHALL 经过拦截器处理
