## ADDED Requirements

### Requirement: Supabase client initialization

The system SHALL initialize a singleton Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables. The client MUST be importable from a shared module (`services/supabase.ts`) by any service or store that needs Supabase access.

#### Scenario: Client created on app load

- **WHEN** the application bundles and loads
- **THEN** the Supabase client SHALL be available as a named export and configured with the project URL and publishable key from `import.meta.env`

#### Scenario: Missing environment variables

- **WHEN** `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is not set
- **THEN** the client initialization SHALL throw a descriptive error at import time indicating which variable is missing

### Requirement: User registration with email and password

The system SHALL allow new users to create an account using an email address and password via Supabase Auth's `signUp` method.

#### Scenario: Successful registration

- **WHEN** a user submits a valid email and password (minimum 6 characters) on the registration form
- **THEN** the system SHALL call `supabase.auth.signUp({ email, password })`, create the user account, and transition the app to an authenticated state

#### Scenario: Registration with existing email

- **WHEN** a user submits an email that is already registered
- **THEN** the system SHALL display an error message indicating the email is already in use, without revealing whether the account exists (per Supabase default behavior)

#### Scenario: Registration with invalid email format

- **WHEN** a user submits a malformed email address
- **THEN** the system SHALL display a validation error before making any network request

#### Scenario: Registration with weak password

- **WHEN** a user submits a password shorter than 6 characters
- **THEN** the system SHALL display a validation error indicating the minimum password length

### Requirement: User login with email and password

The system SHALL allow existing users to sign in using email and password via Supabase Auth's `signInWithPassword` method.

#### Scenario: Successful login

- **WHEN** a user submits correct email and password credentials
- **THEN** the system SHALL authenticate the user, store the session, update `useUserStore` with the user data, and navigate to `/home`

#### Scenario: Invalid credentials

- **WHEN** a user submits an incorrect email or password
- **THEN** the system SHALL display an error message such as "Invalid login credentials" without specifying which field is wrong

#### Scenario: Network failure during login

- **WHEN** a network error occurs during the login request
- **THEN** the system SHALL display a user-friendly error message and allow the user to retry

### Requirement: Auth session persistence

The system SHALL persist the user's authentication session across page reloads and app restarts. The Supabase client handles token storage in localStorage automatically.

#### Scenario: Page reload while authenticated

- **WHEN** an authenticated user reloads the page
- **THEN** the system SHALL restore the session from storage via `supabase.auth.getSession()` and set `isAuthenticated: true` in the store before rendering protected routes

#### Scenario: Session token expired

- **WHEN** the access token expires but the refresh token is still valid
- **THEN** the Supabase client SHALL automatically refresh the token and the user remains authenticated

#### Scenario: Refresh token expired

- **WHEN** both access and refresh tokens have expired
- **THEN** the system SHALL clear the auth state, set `isAuthenticated: false`, and redirect the user to the login page

### Requirement: Auth state synchronization

The system SHALL listen for auth state changes via `supabase.auth.onAuthStateChange()` and synchronize the Zustand `useUserStore` accordingly.

#### Scenario: Auth state listener on app mount

- **WHEN** the application mounts
- **THEN** the system SHALL register an `onAuthStateChange` listener that updates `useUserStore` for events: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, and `USER_UPDATED`

#### Scenario: Sign-in event received

- **WHEN** the `SIGNED_IN` event fires with a valid session
- **THEN** the store SHALL set `user` (mapped from the session's user object), `isAuthenticated: true`, and `isLoading: false`

#### Scenario: Sign-out event received

- **WHEN** the `SIGNED_OUT` event fires
- **THEN** the store SHALL set `user: null`, `isAuthenticated: false`

#### Scenario: Listener cleanup

- **WHEN** the auth state listener is no longer needed (app unmount)
- **THEN** the subscription SHALL be unsubscribed to prevent memory leaks

### Requirement: User logout

The system SHALL allow users to sign out by calling `supabase.auth.signOut()`, which clears the session from both the client and server.

#### Scenario: Successful logout

- **WHEN** the user triggers logout (e.g., from Settings page)
- **THEN** the system SHALL call `supabase.auth.signOut()`, the `onAuthStateChange` listener fires `SIGNED_OUT`, the store is cleared, and the user is redirected to the login page

#### Scenario: Logout while offline

- **WHEN** the user triggers logout but there is no network connection
- **THEN** the system SHALL clear the local session and auth state regardless, ensuring the user cannot access protected content
