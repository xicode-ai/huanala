## 1. Store Layer - useUserStore

- [x] 1.1 Add `otpSent: boolean` and `otpEmail: string | null` state fields to track OTP flow
- [x] 1.2 Implement `sendOtp(email: string)` method calling `supabase.auth.signInWithOtp({ email })`
- [x] 1.3 Implement `verifyOtp(email: string, token: string)` method calling `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- [x] 1.4 Implement `resetOtpFlow()` method to clear OTP state and return to email input
- [x] 1.5 Remove `login(email, password)` method
- [x] 1.6 Remove `signUp(email, password)` method
- [x] 1.7 Update UserState interface with new OTP-related types

## 2. UI - Login Page Refactor

- [x] 2.1 Refactor `LoginOneClick.tsx` to dual-state component (email input vs OTP input)
- [x] 2.2 Create email input state with "发送验证码" button
- [x] 2.3 Create OTP input state with 6-digit code field and "验证" button
- [x] 2.4 Add "重新发送验证码" button on OTP input state
- [x] 2.5 Add back/cancel button to return from OTP state to email state
- [x] 2.6 Remove "还没有账号？注册" link from login page
- [x] 2.7 Update form validation for email-only (remove password validation)
- [x] 2.8 Handle loading states for sendOtp and verifyOtp operations
- [x] 2.9 Display error messages from Supabase (rate limit, invalid token, expired token)

## 3. Cleanup - Remove Registration

- [x] 3.1 Delete `pages/LoginVerification.tsx` file
- [x] 3.2 Remove `/login-verify` route from `App.tsx`
- [x] 3.3 Remove `LoginVerification` import from `App.tsx`
- [x] 3.4 Add redirect from `/login-verify` to `/` in routes (optional fallback)

## 4. Testing & Verification

- [x] 4.1 Test new user flow: email → OTP → auto-register → navigate to /home
- [x] 4.2 Test existing user flow: email → OTP → login → navigate to /home
- [x] 4.3 Test validation: empty email, invalid email format
- [x] 4.4 Test error handling: wrong OTP code, expired OTP
- [x] 4.5 Test resend OTP functionality
- [x] 4.6 Test back/cancel from OTP screen
- [x] 4.7 Verify old registration route redirects properly
- [x] 4.8 Run linter and fix any errors
