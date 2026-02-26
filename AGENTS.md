# AGENTS.md — 花哪了 (Hua Na Le) Expense Tracker

## Project Overview

Mobile-first expense tracking app with AI assistant (voice input, bill scanning, AI chat).
Stack: React 19, TypeScript, Vite 6, Tailwind CSS, Zustand, ECharts, Supabase, Capacitor 8.

## Build & Dev Commands

| Command                       | Description                      |
| ----------------------------- | -------------------------------- |
| `pnpm dev`                    | Start dev server (port 3000)     |
| `pnpm build`                  | Production build (`vite build`)  |
| `pnpm preview`                | Preview production build         |
| `pnpm lint`                   | ESLint check                     |
| `pnpm lint:fix`               | ESLint auto-fix                  |
| `pnpm format`                 | Prettier format all files        |
| `pnpm format:check`           | Prettier check (no write)        |
| `pnpm test`                   | Run all tests once (vitest run)  |
| `pnpm test:watch`             | Run tests in watch mode          |
| `pnpm test:coverage`          | Run tests with coverage          |
| `pnpm supabase:schema:export` | Export DB schema via script      |
| `pnpm supabase:schema:pull`   | Pull schema migration via script |

### Running a Single Test

```bash
pnpm vitest run tests/components/Icon.test.tsx
pnpm vitest run -t "renders icon correctly"
```

## Project Structure

**No `src/` directory** — source files live at project root.

```
components/     # Reusable UI components (PascalCase files)
pages/          # Route-level page components
stores/         # Zustand state stores (barrel: index.ts)
services/       # API/business logic (see services/AGENTS.md)
hooks/          # Custom React hooks
utils/          # (empty — reserved)
types.ts        # Centralized type definitions
App.tsx         # Root component with HashRouter + auth guards
index.tsx       # Entry point
tests/          # Mirrors root structure
supabase/       # Edge Functions, migrations (see supabase/AGENTS.md)
```

### Path Alias & Imports

- `@/*` maps to project root: `@/components/Foo`, `@/services/bar`
- Source files use **relative imports**: `../types`, `../stores/useToastStore`
- Tests use `@/` alias: `import { X } from '@/services/http/middleware'`

### Dependency Graph

```
types.ts → services/ → stores/ → hooks/ → components/ + pages/ → App.tsx
```

## Code Style

### Formatting (Prettier)

- 2-space indent, single quotes, semicolons
- Trailing commas: es5, line width: 120, LF line endings

### ESLint

ESLint 9 flat config with typescript-eslint, react-hooks, react-refresh, and prettier integration.

### TypeScript

- Target: ES2022, module: ESNext, moduleResolution: bundler
- Use `interface` over `type` for object shapes; centralize in `types.ts`
- **Never** use `any` — use `unknown` + type guards or proper generics
- **Never** use `@ts-ignore` or `@ts-expect-error`
- Exception: `any` with `eslint-disable` in speech engine files (browser API compat)

### Import Order

1. React / React libraries
2. Third-party packages
3. Local components (`../components/...` or `@/components/...`)
4. Local services / stores
5. Types (`../types`)

### Naming Conventions

| Kind                  | Convention        | Example                               |
| --------------------- | ----------------- | ------------------------------------- |
| Components / files    | PascalCase        | `TransactionList.tsx`                 |
| Variables / functions | camelCase         | `handleSubmit`, `totalAmount`         |
| Constants             | UPPER_SNAKE_CASE  | `MAX_RETRY_COUNT`                     |
| Stores                | `use${Name}Store` | `useUserStore`, `useTransactionStore` |
| Services              | `${name}Service`  | `transactionService`                  |
| Hooks                 | `use` + camelCase | `useGlobalErrorListener`              |
| Interfaces / Types    | PascalCase        | `Transaction`, `UserProfile`          |

## Component Patterns

- **Functional components only** — never class components
- `React.FC<Props>` with named exports (except `App.tsx` default export)
- Define `interface Props {}` above the component
- **Tailwind CSS only** — no CSS Modules, styled-components, or inline styles
- Use Tailwind theme tokens — **never** hardcode color values
- **Never** directly manipulate DOM — use React refs and state
- **Never** call Hooks outside components or other hooks
- Comments may be in Chinese — this is intentional

## Store Pattern (Zustand)

Plain `create<State>` — no middleware (no persist, no devtools, no immer).
Async actions: `set({ loading: true })` → try/catch → `set({ loading: false })`.
Services throw; stores catch and re-throw.

## Service Pattern

Object literals with async methods. Throw on Supabase errors. Never class-based.

```tsx
export const fooService = {
  async getAll(): Promise<Foo[]> {
    const { data, error } = await supabase.from('foo').select('*');
    if (error) throw error;
    return data;
  },
};
```

## Error Handling

- Wrap async operations in try/catch
- `error instanceof Error ? error.message : '未知错误'` for error display
- Services throw; callers (stores/components) handle
- Never silently swallow errors (no empty catch blocks)

## Testing

- Framework: Vitest + jsdom + @testing-library/react
- Tests in `tests/` mirroring root structure
- Setup file: `tests/setup.ts` (imports `@testing-library/jest-dom`)
- Vitest globals enabled — no need to import `describe`, `it`, `expect`

## Auth Architecture

- **OTP-based** via Supabase (email one-time password, no social login)
- `AuthProvider` interface → `SupabaseAuthProvider` implementation
- `ProtectedRoute` / `GuestRoute` guard components in `App.tsx`
- Auth state managed in `useUserStore`

## Key Constraints (from .cursorrules)

- Mobile-first — always consider touch interactions and small screens
- Use HashRouter (Capacitor compatibility)
- Use JSDoc `/** */` for public method documentation
- Custom Tailwind theme tokens in `tailwind.config.ts` — use them
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
