## Why

当前应用有两个独立的认证流程：登录（密码）和注册（密码+确认）。这增加了用户摩擦，需要记住密码。通过切换到 Supabase Email OTP（一次性验证码），可以简化为单一入口：用户输入邮箱 → 收到验证码 → 验证后自动登录或注册。

## What Changes

- **移除密码认证流程**：删除 `signInWithPassword` 和 `signUp` 密码方式，改用 `signInWithOtp`
- **合并登录/注册 UI**：移除 `/login-verify` 注册页面，将 `LoginOneClick.tsx` 改为邮箱验证码登录
- **新增验证码输入流程**：用户输入邮箱后，显示验证码输入界面
- **自动注册行为**：Supabase `signInWithOtp` 对未注册邮箱会自动创建用户
- **更新 useUserStore**：替换 `login`/`signUp` 方法为 `sendOtp` 和 `verifyOtp`

## Capabilities

### New Capabilities

- `email-otp-auth`: 邮箱验证码认证流程，包括发送 OTP、验证 OTP、自动注册

### Modified Capabilities

<!-- No existing specs are being modified - this is a new capability replacing the implicit password auth -->

## Impact

- **Pages**: `LoginOneClick.tsx` 重写为验证码流程；`LoginVerification.tsx` 删除
- **Store**: `useUserStore.ts` 需要新的 `sendOtp`/`verifyOtp` 方法
- **Routes**: 移除 `/login-verify` 路由
- **Supabase 配置**: 需确保 Supabase 项目已启用 Email OTP
- **用户体验**: 现有用户需通过验证码重新登录（无需记住密码）
