# services/ — Service Layer

## Architecture

Object literal services with async methods. **Never class-based** (one exception: `SpeechToTextService`).
Services throw on errors; callers (stores/components) catch.

```
services/
├── supabase.ts          # Supabase client (singleton, middleware-enhanced fetch)
├── transactionService   # CRUD for transactions + bill upload + voice processing
├── sessionService       # Input session CRUD
├── chatService          # AI chat messages
├── userService          # User profile
├── authService          # Auth operations (OTP send/verify, logout)
├── imageCompression     # Client-side JPEG compression before upload
├── auth/                # Auth subsystem (barrel: index.ts)
├── http/                # HTTP middleware subsystem (barrel: index.ts)
└── speech/              # Speech-to-text subsystem (no barrel)
```

## Supabase Client (`supabase.ts`)

Single shared client. Fetch is wrapped via middleware composition:

```
composeFetch(httpErrorMiddleware, authMiddleware)
```

Execution order: `httpErrorMiddleware` → `authMiddleware` → native `fetch` → auth post-process → error post-process.

## Data Service Pattern

All data services follow the pattern documented in root AGENTS.md (Service Pattern section).

- Use `mapRow()` for DB row → domain type mapping (snake_case → camelCase)
- Pagination via `.range(from, to)` with `hasMore` detection (fetch N+1 rows)
- Edge Function calls via `supabase.functions.invoke('function-name', { body })`

## HTTP Subsystem (`http/`)

Barrel export: `http/index.ts` re-exports all public symbols.

| File                  | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `middleware.ts`       | `FetchMiddleware` type + `composeFetch()` combinator   |
| `httpErrorMiddleware` | Catches 4xx/5xx (skips 401/403), shows Toast via store |
| `errorHandler.ts`     | Maps status codes → Chinese user-facing messages       |

`FetchMiddleware` signature: `(next: typeof fetch) => typeof fetch`
`composeFetch(...middlewares)` — left-to-right wrapping (left = outermost).

## Auth Subsystem (`auth/`)

Barrel export: `auth/index.ts` re-exports all public symbols.

| File                      | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `types.ts`                | `AuthProvider` interface + global provider registry    |
| `supabaseAuthProvider.ts` | `SupabaseAuthProvider` class (implements interface)    |
| `authInterceptor.ts`      | `authMiddleware` — FetchMiddleware for token injection |

**Key patterns**: `AuthProvider` interface (`getToken()`, `validateSession()`, `onAuthError()`); global registry via `setAuthProvider()`/`getAuthProvider()`; auth whitelist skips `/auth/` paths; explicit `Authorization: Bearer` header (avoids supabase-js race); 401/403 calls `provider.onAuthError()`.

## Speech Subsystem (`speech/`)

No barrel export. Import from specific files.

| File                               | Purpose                                         |
| ---------------------------------- | ----------------------------------------------- |
| `types.ts`                         | `SpeechEngine` interface, status/config types   |
| `SpeechToTextService.ts`           | Singleton, platform detection, engine selection |
| `engines/WebSpeechEngine.ts`       | Web Speech API implementation                   |
| `engines/CapacitorSpeechEngine.ts` | Native Capacitor plugin implementation          |

**Key patterns:**
- Strategy pattern: `SpeechEngine` interface → platform-specific implementations
- `SpeechToTextService`: singleton class via `getInstance()` (only class besides `SupabaseAuthProvider`)
- Platform detection: `window.Capacitor.isNativePlatform()` → selects Capacitor or Web engine
- `any` with `eslint-disable` is **permitted** in engine files (browser API compatibility)
