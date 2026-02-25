## ADDED Requirements

### Requirement: Send OTP to email

The system SHALL send a one-time password (OTP) to the user's email address when they request to login.

#### Scenario: Valid email receives OTP

- **WHEN** user enters a valid email address and clicks "发送验证码"
- **THEN** system calls `supabase.auth.signInWithOtp({ email })` and displays the verification code input UI

#### Scenario: Invalid email format rejected

- **WHEN** user enters an invalid email format (e.g., "test@", "test.com")
- **THEN** system displays validation error "邮箱格式不正确" without calling Supabase

#### Scenario: Empty email rejected

- **WHEN** user clicks "发送验证码" with empty email field
- **THEN** system displays validation error "请输入邮箱地址"

#### Scenario: Rate limit handling

- **WHEN** user requests OTP too frequently and Supabase returns rate limit error
- **THEN** system displays the error message from Supabase

### Requirement: Verify OTP and authenticate

The system SHALL verify the OTP code entered by the user and complete authentication.

#### Scenario: Valid OTP authenticates user

- **WHEN** user enters a valid 6-digit OTP code
- **THEN** system calls `supabase.auth.verifyOtp({ email, token, type: 'email' })` and on success navigates to `/home`

#### Scenario: Invalid OTP rejected

- **WHEN** user enters an incorrect OTP code
- **THEN** system displays error message from Supabase (e.g., "Token has expired or is invalid")

#### Scenario: Expired OTP rejected

- **WHEN** user enters an OTP code that has expired (default 1 hour)
- **THEN** system displays error and allows user to resend OTP

### Requirement: Auto-register new users

The system SHALL automatically create a new user account when an unregistered email successfully verifies OTP.

#### Scenario: New email auto-registers

- **WHEN** user verifies OTP with an email that has no existing account
- **THEN** Supabase creates a new user and profile (via database trigger) and user is authenticated

#### Scenario: Existing user logs in

- **WHEN** user verifies OTP with an email that has an existing account
- **THEN** user is authenticated and navigated to `/home`

### Requirement: Resend OTP functionality

The system SHALL allow users to request a new OTP if the previous one expired or was not received.

#### Scenario: Resend OTP successfully

- **WHEN** user clicks "重新发送验证码" on the verification code input screen
- **THEN** system calls `supabase.auth.signInWithOtp({ email })` again and resets the verification UI

### Requirement: Cancel OTP flow

The system SHALL allow users to go back to email input from the verification code screen.

#### Scenario: Return to email input

- **WHEN** user clicks back/cancel on the verification code input screen
- **THEN** system returns to email input state, clearing any entered OTP

### Requirement: Remove registration page

The system SHALL remove the separate registration page and route.

#### Scenario: Registration route redirects

- **WHEN** user navigates to `/login-verify`
- **THEN** system redirects to `/` (main login page)

#### Scenario: No registration link in UI

- **WHEN** user views the login page
- **THEN** there is no "注册" or "还没有账号" link visible
