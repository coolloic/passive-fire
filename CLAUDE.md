# CLAUDE.md

Guidance for Claude Code when working in this repository.

## 1. Environment & Commands
- **Package Manager**: Always use `pnpm`. Never use npm or yarn.
- **Node Version**: Check `.nvmrc` if needed, defaults to Node 20+.
- **Core Commands**:
  - Dev server: `pnpm dev`
  - Build project: `pnpm build`
  - Run linting: `pnpm lint`
  - Format code: `pnpm format`
  - Run tests: `pnpm test` / `pnpm test:watch`
  - Unit test coverage: `pnpm test:coverage`
  - E2E tests: `pnpm test:e2e`
  - Type check: `pnpm typecheck` (`tsc --noEmit`)

## 2. Tech Stack & Architecture
- **Framework**: Next.js 14 (App Router).
- **Language**: TypeScript (Strict mode enabled).
- **Styling**: Tailwind CSS (Utility-first, do NOT write inline styles or CSS modules unless requested).
- **State Management**: Zustand for global state, React Context for layout-level state.
- **Routing**: Use `next/navigation` (`useRouter`, `usePathname`). Do NOT use `next/router`.

## 3. Code & Design Guidelines
- **Component Pattern**:
  - Default to **Server Components** (`app/` directory).
  - Only add `"use client"` at the very top if using hooks (`useState`, `useEffect`) or event listeners.
- **TypeScript**:
  - Explicitly define props using `interface` (e.g., `interface ComponentProps {}`).
  - **Zero `any` policy**: Always type arguments, return values, and API responses.
- **File Naming**:
  - Components: PascalCase (e.g., `UserCard.tsx`).
  - Hooks/Utils/Routings: kebab-case (e.g., `use-auth.ts`, `page.tsx`).
- **File Size**: Keep components under 250 lines. Extract sub-components into a local `_components/` folder if it grows too large.

## 4. Atomic Design
Organize shared UI by Atomic Design levels. Each level may only import from the levels below it.

```
src/components/
├── atoms/       # Smallest building blocks: Button, Input, Icon, Label, Badge
├── molecules/   # Small groups of atoms: SearchField, FormRow, NavItem
├── organisms/   # Self-contained sections: Header, ProductGrid, LoginForm
└── templates/   # Page layouts with slots, no real data: DashboardTemplate
app/             # Pages: route files that fill templates with real data
```

- **Atoms** are pure and stateless where possible: no data fetching, no global state, styling driven by props/variants.
- **Molecules** combine atoms for a single purpose; keep logic to local UI state only.
- **Organisms** may read global state (Zustand) or receive data from pages; they are the first level allowed to know about domain concepts.
- **Templates** define layout and responsive structure only; they receive content via props/`children`.
- **Pages** (`app/**/page.tsx`) fetch data (prefer Server Components) and compose templates/organisms.
- shadcn/ui primitives (if present in `components/ui/`) count as atoms; wrap or extend them rather than duplicating.
- Route-specific components that are not reused stay in that route's `_components/` folder.
- Before creating a new component, check whether an existing atom/molecule already covers it.

## 5. Mobile-First Responsive Design
- Write base Tailwind classes for the **smallest screen first**, then layer up with `sm:`, `md:`, `lg:`, `xl:` breakpoints. Never design desktop-first and patch down with `max-*` variants unless unavoidable.
- Use fluid layouts (`flex`, `grid`, `w-full`, `max-w-*`) instead of fixed pixel widths.
- Touch targets must be at least **44×44px** (e.g., `min-h-11 min-w-11`); keep adequate spacing between interactive elements.
- Body text no smaller than `text-base` on mobile to avoid iOS zoom on input focus.
- Respect safe areas on notched devices (`env(safe-area-inset-*)`) for fixed headers/footers.
- Use `next/image` with `sizes` set appropriately for responsive images.
- Avoid hover-only interactions; every hover affordance needs a tap/focus equivalent.
- Verify layouts at 375px, 768px, and 1280px widths before considering UI work done.

## 6. Progressive Web App & Offline Support
- The app must be installable and usable offline.
- **Manifest**: Define it via `app/manifest.ts` (Next.js metadata route) with `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, and icons (192px, 512px, and a maskable icon).
- **Service Worker**: Use Serwist (`@serwist/next`) to generate the service worker. Do NOT hand-roll a service worker unless requested.
- **Caching Strategy**:
  - App shell and static assets (JS, CSS, fonts, icons): precache / cache-first.
  - Pages/navigation: network-first with an offline fallback page (`app/offline/page.tsx`).
  - API GET requests: stale-while-revalidate where data freshness allows; never cache authenticated or sensitive responses unless explicitly approved.
  - Images: cache-first with an expiration limit.
- **Offline Data**:
  - Persist data the user needs offline in IndexedDB (e.g., via `idb` or Zustand `persist` with an IndexedDB storage adapter); do not use `localStorage` for large or structured data.
  - Queue writes made while offline and replay them when connectivity returns (Background Sync where supported, with a manual retry fallback).
- **UX**:
  - Detect connectivity with `navigator.onLine` plus `online`/`offline` events via a shared hook (e.g., `use-online-status.ts`) and show a clear offline indicator.
  - Disable or clearly mark actions that require a network connection.
  - Notify users when a new service worker version is available and offer a reload.
- The service worker should be disabled in development (`pnpm dev`) to avoid stale caches; test PWA behavior with `pnpm build && pnpm start`.

## 7. SDLC: Testing & Quality Gates
Every feature or fix must ship with tests. A task is not done until all quality gates pass.

### Unit Tests — cover all edge cases
- **Tools**: Vitest + React Testing Library (+ `@testing-library/user-event`). Mock network calls with MSW.
- **Location**: Co-locate tests next to the source file as `*.test.ts(x)`.
- **Scope**: Every util, hook, Zustand store, and component (atoms → organisms) gets unit tests.
- **Edge cases are mandatory**, not optional. For each unit, cover at minimum:
  - Happy path.
  - Empty / null / undefined inputs, empty arrays and strings.
  - Boundary values (0, negative, max length, min/max dates, very large lists).
  - Invalid or malformed input and the resulting error handling (`try/catch` paths, error toasts).
  - Async states: loading, success, failure, timeout, and race conditions where relevant.
  - Offline vs. online behavior for anything touching network, cache, or sync queue.
  - Accessibility: query by role/label (not test IDs) so tests also verify a11y semantics.
- **Coverage threshold**: ≥ 90% lines/branches on changed code; `pnpm test:coverage` must not regress overall coverage.
- Test behavior, not implementation details; avoid snapshot tests except for small, stable output.

### E2E Tests — cover all functionalities
- **Tool**: Playwright, tests live in `e2e/` as `*.spec.ts`.
- Every user-facing feature and critical user journey must have an E2E spec covering its main flow and key failure flows (validation errors, server errors, empty states).
- Run against a **production build** (`pnpm build && pnpm start`), not the dev server.
- Run on both a **mobile viewport** (e.g., Pixel 7 / iPhone 14) and a desktop viewport, consistent with mobile-first design.
- Include PWA/offline scenarios: app loads offline after first visit, offline indicator appears, queued writes sync when back online (use `context.setOffline(true)`).
- Use resilient locators (`getByRole`, `getByLabel`); no arbitrary `waitForTimeout` sleeps.

### Pre-commit Hook — style, lint, type
- **Tools**: Husky + lint-staged.
- On every commit, the pre-commit hook must run:
  1. **Style**: Prettier check/format on staged files.
  2. **Lint**: ESLint (`--max-warnings=0`) on staged files.
  3. **Type**: `pnpm typecheck` across the project.
- A `commit-msg` hook runs commitlint to enforce Conventional Commits (Section 9).
- **Never bypass hooks** with `--no-verify`. If a hook fails, fix the underlying issue.

### Definition of Done
Before raising a PR, all of the following pass locally: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm build`. CI must run the same checks and be green before human review.

## 8. Behavior Rules & Guardrails
- **Minimal Diff Principle**: Only modify code directly related to the task. Do NOT format, reorganize, or refactor unrelated files or lines.
- **No Hallucinated Imports**: Before importing a utility, UI component (shadcn), or hook, check if it actually exists in the workspace first.
- **Error Handling**: Always wrap API fetches and async operations in `try/catch` blocks and use the centralized logger or toast notification.
- **Language**: Write all code, inline comments, and variables in English. You may respond to the user in Chinese.

### Security & Credentials
- **Never expose credentials.** Do NOT hardcode, commit, log, print, or paste API keys, tokens, passwords, connection strings, or private keys into code, comments, tests, docs, PR descriptions, commit messages, MCP config, or chat output.
- **All secrets live in a local `.env.local`** (git-ignored). Read them via `process.env.*` only; never commit any `.env*` file except `.env.example`.
- Keep `.env.example` up to date with every required variable name and a placeholder value (e.g., `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`) — never real values.
- **Client vs. server**: Only variables prefixed `NEXT_PUBLIC_` reach the browser, so only non-sensitive values (e.g., Supabase URL and anon key) may use that prefix. Server secrets (e.g., `SUPABASE_SERVICE_ROLE_KEY`, third-party API keys) must only be used in Server Components, Route Handlers, or Server Actions — never in `"use client"` files.
- Validate required env vars at startup with a typed schema (e.g., Zod in `src/lib/env.ts`) and fail fast with a message naming the missing variable, not its value.
- Do NOT read, `cat`, or echo the contents of `.env*` files unless the user explicitly asks; refer to variables by name only.
- Production/preview secrets are managed in Vercel environment variables, not in the repo.
- If a secret is ever committed or exposed, stop and tell the user immediately so it can be rotated; rewriting git history alone is not sufficient.

### MCP Servers
Project-level MCP servers are defined in `.mcp.json` (committed; must never contain credentials — remote servers authenticate via OAuth).
- **playwright**: Drive a real browser to verify UI changes, check mobile/desktop layouts, reproduce bugs, and debug E2E tests.
- **vercel**: Inspect deployments, build logs, and project settings. Do NOT change production settings or env vars, or trigger production deploys, without explicit user approval.
- **supabase**: Inspect schema, run read queries, and generate types. Schema changes must go through migration files committed in a PR — do NOT apply migrations or run destructive SQL against a remote/production database without explicit user approval.

## 9. Git Commit Guidelines
- Follow Conventional Commits format: `<type>(<scope>): <short description>`
- **Allowed Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- **Constraint**: Keep the description under 60 characters and write it in English.
- *Example*: `feat(auth): add google oauth provider`

### Branching & Pull Requests
- **Never commit, merge, or push directly to `main`** (the default branch, a.k.a. master).
- Always create a feature branch named `<type>/<short-description>` (e.g., `feat/offline-sync`, `fix/header-overflow`).
- **Keep the branch up to date with `main`** before raising a PR and again before merging: run `git fetch origin && git rebase origin/main`, resolve any conflicts, and re-run the Definition of Done checks (Section 7) before pushing (`git push --force-with-lease` after a rebase; never plain `--force`).
- Push the branch and open a Pull Request with `gh pr create`; the PR description must summarize the change and how it was tested.
- Every PR requires **human review and approval** before merging. Do NOT merge PRs yourself, approve your own PRs, or bypass branch protection.

## 10. Document Evolution
- If you find yourself repeatedly making the same assumption mistake, or if the user corrects your code pattern twice in one session, ask the user: *"Should we update CLAUDE.md to remember this constraint?"*
