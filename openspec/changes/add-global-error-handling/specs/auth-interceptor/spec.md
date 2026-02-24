## MODIFIED Requirements

### Requirement: 通过自定义 fetch 接入 Supabase 客户端

拦截器 SHALL 以标准 fetch 中间件形式实现，签名为 `(next: typeof fetch) => typeof fetch`，通过 `next` 参数调用下一层 fetch 而非直接调用原生 `fetch`。拦截器通过 `composeFetch()` 与其他中间件组合后，注入 Supabase `createClient` 的 `global.fetch` 配置项。

#### Scenario: Supabase 客户端使用中间件管道

- **WHEN** 应用初始化 Supabase 客户端时
- **THEN** `createClient` SHALL 使用 `composeFetch()` 组合后的 fetch 函数（包含 authMiddleware 和其他中间件）
- **THEN** 所有通过 Supabase SDK 发起的请求 SHALL 经过完整的中间件链处理

#### Scenario: authMiddleware 调用 next 而非直接 fetch

- **WHEN** authMiddleware 内部需要发起实际的 HTTP 请求时
- **THEN** authMiddleware SHALL 调用 `next(input, init)` 而非 `fetch(input, init)`，以确保中间件链路正确传递
