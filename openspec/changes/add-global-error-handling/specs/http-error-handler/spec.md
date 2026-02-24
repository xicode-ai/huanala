## ADDED Requirements

### Requirement: Fetch 中间件管道组合机制

系统 SHALL 提供标准的 fetch 中间件类型定义 `FetchMiddleware = (next: typeof fetch) => typeof fetch` 和组合函数 `composeFetch(...middlewares)`，支持将多个独立中间件按顺序组合为最终的 fetch 函数。

#### Scenario: 多个中间件按顺序组合

- **WHEN** 调用 `composeFetch(middlewareA, middlewareB)` 时
- **THEN** 返回的 fetch 函数 SHALL 按照从左到右的顺序执行中间件链（middlewareA 在外层先执行，middlewareB 在内层后执行）

#### Scenario: 单个中间件组合

- **WHEN** 调用 `composeFetch(middlewareA)` 时
- **THEN** 返回的 fetch 函数 SHALL 等价于 `middlewareA(fetch)`

#### Scenario: 无中间件组合

- **WHEN** 调用 `composeFetch()` 且不传入任何中间件时
- **THEN** 返回的 fetch 函数 SHALL 等价于原生 `fetch`

### Requirement: HTTP 错误状态码统一拦截

httpErrorMiddleware SHALL 以 fetch 中间件形式工作，在收到 HTTP 响应后检查状态码，对非认证类错误（即排除 401/403 的其他错误状态码）统一拦截并触发错误处理。

#### Scenario: 服务器错误（5xx）触发 Toast 通知

- **WHEN** HTTP 响应状态码为 500、502、503 等 5xx 错误
- **THEN** 系统 SHALL 向用户展示 `error` 类型的 Toast，提示"服务器异常，请稍后重试"
- **THEN** 中间件 SHALL 继续将原始 Response 返回给调用方

#### Scenario: 客户端错误（4xx，排除 401/403）触发 Toast 通知

- **WHEN** HTTP 响应状态码为 404、429 等非认证类 4xx 错误
- **THEN** 系统 SHALL 向用户展示对应类型的 Toast（404 → "请求的资源不存在"，429 → "操作过于频繁，请稍后再试"，其他 → "请求出错，请重试"）
- **THEN** 中间件 SHALL 继续将原始 Response 返回给调用方

#### Scenario: 401/403 错误跳过处理

- **WHEN** HTTP 响应状态码为 401 或 403
- **THEN** httpErrorMiddleware SHALL 不做任何处理，直接透传给下游（由 authMiddleware 处理）

#### Scenario: 成功响应不触发处理

- **WHEN** HTTP 响应状态码为 2xx 或 3xx
- **THEN** httpErrorMiddleware SHALL 不做任何处理，直接返回原始 Response

### Requirement: 网络异常统一拦截

httpErrorMiddleware SHALL 捕获 fetch 过程中抛出的网络级异常（如 DNS 解析失败、连接超时、断网），向用户展示友好提示。

#### Scenario: 网络断开时提示用户

- **WHEN** fetch 请求因网络原因抛出 `TypeError: Failed to fetch` 或类似异常
- **THEN** 系统 SHALL 向用户展示 `error` 类型的 Toast，提示"网络连接异常，请检查网络"
- **THEN** 中间件 SHALL 将原始异常继续向上抛出，不吞掉错误

#### Scenario: 请求超时提示用户

- **WHEN** fetch 请求因超时（408/504）返回错误
- **THEN** 系统 SHALL 向用户展示 `warning` 类型的 Toast，提示"请求超时，请稍后重试"

### Requirement: 错误处理工具函数独立于 UI 框架

错误分类和 Toast 桥接逻辑 SHALL 封装在独立的 `errorHandler` 工具模块中，不直接依赖 React 组件或 Hook，通过 `useToastStore.getState()` 访问 Store。

#### Scenario: 非 React 环境调用错误处理

- **WHEN** 在 fetch 中间件（非 React 组件）中捕获到错误
- **THEN** `errorHandler` SHALL 通过 `useToastStore.getState().addToast()` 触发 Toast 通知，无需 React 上下文

### Requirement: 中间件与 Supabase 客户端集成

Supabase 客户端 SHALL 使用 `composeFetch()` 组合 httpErrorMiddleware 和 authMiddleware 后的 fetch 函数，作为 `createClient` 的 `global.fetch` 配置。

#### Scenario: Supabase 请求经过完整中间件链

- **WHEN** 应用初始化 Supabase 客户端时
- **THEN** `createClient` SHALL 使用 `composeFetch(httpErrorMiddleware, authMiddleware)` 返回的 fetch 函数
- **THEN** 所有通过 Supabase SDK 发起的请求 SHALL 依次经过 httpErrorMiddleware 和 authMiddleware 处理

#### Scenario: 非 Supabase 请求可独立使用中间件

- **WHEN** 未来新增非 Supabase 的 HTTP API 调用
- **THEN** 该调用 SHALL 可以直接使用 `composeFetch(httpErrorMiddleware)` 或其他中间件组合，无需依赖 Supabase SDK
