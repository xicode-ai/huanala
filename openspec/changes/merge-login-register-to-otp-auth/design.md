## Context

当前应用使用传统的邮箱+密码认证方式：

- 登录页 `LoginOneClick.tsx` 调用 `supabase.auth.signInWithPassword`
- 注册页 `LoginVerification.tsx` 调用 `supabase.auth.signUp`
- `useUserStore.ts` 维护 `login` 和 `signUp` 两个方法
- 路由：`/` (登录), `/login-verify` (注册)

用户需要记住密码，且需要在两个页面之间跳转完成注册/登录。

## Goals / Non-Goals

**Goals:**

- 使用 Supabase Email OTP (`signInWithOtp`) 替代密码认证
- 单一入口：用户只需输入邮箱，收到验证码后即可登录/注册
- 新用户自动创建账号（Supabase OTP 默认行为）
- 简化 UI 为两步：输入邮箱 → 输入验证码

**Non-Goals:**

- 不支持密码登录（完全移除）
- 不支持社交登录（不在此变更范围）
- 不修改用户 Profile 逻辑（保持现有 `mapSupabaseUser` 不变）
- 不处理已登录用户的密码迁移（直接使用 OTP 重新认证）

## Decisions

### 1. 使用 Supabase `signInWithOtp` API

**选择**: 使用 `supabase.auth.signInWithOtp({ email })` 发送验证码

**原因**:

- Supabase 原生支持，无需额外配置邮件服务
- 对未注册邮箱自动创建用户（`shouldCreateUser: true` 默认值）
- 统一登录/注册流程

**替代方案**:

- Magic Link：点击链接登录，但用户体验较差（需切换应用）
- 第三方 OTP 服务：增加复杂性和成本

### 2. 单页面双状态 UI

**选择**: 保留 `LoginOneClick.tsx` 改造为双状态组件（输入邮箱 → 输入验证码）

**原因**:

- 减少路由跳转
- 用户体验更流畅
- 代码更简洁

**替代方案**:

- 两个独立页面（邮箱页 → 验证码页）：增加路由复杂性
- Modal 弹窗输入验证码：移动端体验不佳

### 3. Store 方法重构

**选择**: 在 `useUserStore` 中：

- 移除 `login` 和 `signUp`
- 新增 `sendOtp(email: string)` 和 `verifyOtp(email: string, token: string)`
- 新增 `otpSent: boolean` 状态追踪

**原因**: 清晰分离两步操作，状态可预测

### 4. 验证码验证使用 `verifyOtp`

**选择**: 使用 `supabase.auth.verifyOtp({ email, token, type: 'email' })`

**原因**: Supabase 官方 API，返回 session 后 `onAuthStateChange` 自动触发

## Risks / Trade-offs

| Risk                    | Mitigation                        |
| ----------------------- | --------------------------------- |
| 邮件发送延迟或进垃圾箱  | UI 提示检查垃圾邮件，提供重发按钮 |
| Supabase Email 限额     | 生产环境配置自定义 SMTP           |
| 用户习惯密码登录        | 首次使用引导提示                  |
| OTP 过期（默认 1 小时） | UI 显示过期提示，允许重发         |

## Migration Plan

1. 更新 `useUserStore.ts`：新增 `sendOtp`/`verifyOtp`，移除 `login`/`signUp`
2. 重构 `LoginOneClick.tsx` 为双状态验证码登录
3. 删除 `LoginVerification.tsx`
4. 更新 `App.tsx` 移除 `/login-verify` 路由
5. 确保 Supabase 项目已启用 Email OTP（Auth → Providers → Email）
6. 测试：新用户注册、老用户登录、验证码重发、错误处理
