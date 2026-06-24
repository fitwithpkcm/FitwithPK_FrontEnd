# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (network-accessible via --host)
npm run build        # tsc + vite build
npm run lint         # ESLint
npm run preview      # Preview production build
npm run generate-pwa-assets  # Regenerate PWA icons/assets
```

No test suite is configured.

## Architecture

**FitwithPK** is a fitness/coaching SaaS PWA with two user roles: **Client (student)** and **Admin (coach)**. The backend API runs at `http://localhost:3202` by default (configurable via `src/common/Constant.ts` → `BASE_URL`).

### Tech Stack

- **React 19 + TypeScript**, built with **Vite 6**
- **Routing:** Wouter (primary) + React Router DOM (BrowserRouter wrapper)
- **Server state:** TanStack Query v5 — stale-time infinite, no refetch on focus, no auto-retry
- **Auth state:** React Context (`src/hooks/use-auth.tsx`), persisted to localStorage under key `"userData"`
- **Forms:** React Hook Form + Zod validation
- **Styling:** Tailwind CSS (class-based dark mode) + Radix UI primitives + shadcn-style components in `src/components/ui/`
- **HTTP:** Axios wrapper in `src/services/HttpService.ts` — injects `Token` header from localStorage, auto-clears session and reloads on 401

### Key Directories

| Path | Purpose |
|------|---------|
| `src/page/admin-side/` | Admin/coach route pages |
| `src/page/client-side/` | Client/student route pages |
| `src/components/ui/` | Reusable UI primitives (Radix-based) |
| `src/services/` | Domain API services (Login, Admin, Food, Profile, Updates) |
| `src/hooks/` | `use-auth`, `use-toast`, `use-mobile` |
| `src/interface/` | TypeScript interfaces for API responses and models |
| `src/common/Urls.ts` | All API endpoint constants (~50+ endpoints) |
| `src/common/Constant.ts` | App-wide constants including `BASE_URL` |
| `src/lib/` | QueryClient config, `protected-route.tsx`, `utils.ts` (cn helper) |

### Routing

Routes are defined in `src/App.tsx` using Wouter. Client routes start with `/student-*`, admin routes with `/admin-*`. Route protection is handled by `src/lib/protected-route.tsx`, which checks auth state from `useAuth()`.

### API Integration Pattern

All API calls go through `src/services/HttpService.ts` (`httpCall`, `httpUpload`). Services are organized by domain and called from React Query `useQuery`/`useMutation` hooks inside components or page files. All endpoints expect and return:

```typescript
{ success: boolean; message: string; data: T }
```

The base URL is set once in `App.tsx` via `setBaseUrl(BASE_URL)` on mount.

### Path Aliases

`@/*` → `src/*` and `@shared/*` → `shared/*` (configured in `tsconfig.json` and `vite.config.ts`).
