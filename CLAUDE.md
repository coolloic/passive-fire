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

### SOLID Principles
Apply SOLID to components, hooks, stores, and services:
- **S — Single Responsibility**: Each component, hook, or module does one thing. Separate data fetching (pages/hooks), business logic (`lib/`, services), and presentation (atoms → organisms). A component that fetches, transforms, and renders should be split.
- **O — Open/Closed**: Extend behavior through props, variants, composition (`children`, slots), and config maps — not by editing a shared component with new `if` branches for each use case.
- **L — Liskov Substitution**: Wrapped or extended components must honor the base contract (e.g., a custom `Button` still accepts and forwards standard `button` props, `ref`, and accessibility attributes). Implementations of a shared interface must be interchangeable without breaking callers.
- **I — Interface Segregation**: Keep props interfaces small and focused; don't pass whole domain objects when a component needs two fields. Prefer several narrow hooks/selectors over one hook returning everything (also avoids unnecessary Zustand re-renders).
- **D — Dependency Inversion**: Depend on abstractions, not concrete implementations. Access external services (Supabase, APIs, storage, logger) through typed interfaces in `src/lib/` (e.g., a repository or client module) so UI code never calls SDKs directly and dependencies can be mocked in tests.
- Apply pragmatically: do not add abstractions with only one speculative use (YAGNI); refactor toward SOLID when a second use case appears.

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

### Principle of Least Privilege
Grant every user, service, token, and tool only the minimum access required for its task — nothing more, for no longer than needed.
- **Database (Supabase)**: Enable Row Level Security (RLS) on every table, with policies scoped to the authenticated user/role. Default deny; explicitly grant only the operations (`select`, `insert`, …) each role needs.
- **Service role key**: Use the Supabase anon key + RLS by default. Use the service role key only in server-side code for operations that genuinely require bypassing RLS, and document why at the call site.
- **API routes & Server Actions**: Authenticate and authorize every request on the server; never trust client-side checks or client-supplied user IDs/roles.
- **Tokens & keys**: Create scoped, minimal-permission keys (read-only where possible, limited to a single project/environment) with expiry where supported. Use separate credentials for dev, preview, and production.
- **Client exposure**: Send the browser only the data it needs; select explicit columns rather than `select('*')` and never return internal fields (roles, tokens, other users' data).
- **CI/CD & GitHub**: Give workflows the minimal `permissions:` block (default `contents: read`); grant write scopes per job only when required.
- **MCP & tooling**: Prefer read-only modes and project-scoped access for MCP servers (e.g., Supabase `read_only=true&project_ref=...`). Request elevated access from the user only for the specific action, and drop it afterward.
- **Dependencies**: Do not add packages that require broad install scripts or permissions without justification; prefer well-maintained, minimal dependencies.

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

## 11. Agentic Development Workflow

### Spec-Driven & Blueprint Planning
- **Spec before code.** No feature code is written until its blueprint exists and has been reviewed:
  - `docs/iteration-plan.md`: iterations and why each one adds value.
  - `docs/spec/slice-1.md`: functional requirements, acceptance criteria, non-functional requirements, assumptions, exclusions.
  - `docs/technical-design.md`: UX, data model, components, interfaces, trade-offs.
  - `docs/test-strategy.md`: what is tested at which level, and why.
- If an implementation needs to deviate from the spec or design, **stop and update the doc first** (with user approval), then code. The docs and the code must never disagree.
- **Granular chunking.** One task = one GitHub issue = one branch = one PR, tracked in `docs/delivery-plan.md`. A task must be reviewable in one sitting (aim for ≤ 400 changed lines, excluding lockfiles and generated files); split it before starting if it is larger. Never build or refactor a whole feature or app in a single step.
- Start each task by restating its acceptance criteria from the issue. Finish by showing how each one is verified (test name or manual check).

### Explicit Context Files
Read the relevant files at the start of every session or task, and keep them current:
- `CLAUDE.md`: rules and conventions (this file).
- `GLOSSARY.md`: the domain language. Use these terms in code identifiers, UI copy, tests and docs; never use a term listed under _Avoid_.
- `docs/adr/`: architecture decisions. Do not contradict an accepted ADR; propose a new ADR that supersedes it instead.
- `docs/delivery-plan.md` and the open issue: current scope and status.

**Pinned versions** (knowledge-cutoff guard): Next.js 14.2 (App Router), React 18, Node 22, TypeScript 5, Tailwind CSS 3, ESLint 8 (`.eslintrc.json`), Zod 4, Vitest 5, Playwright 1.x, MSW 3, Serwist 9, Supabase CLI (local Docker).
- Do not upgrade a major version without user approval and an ADR.
- Verify library APIs against the installed version (`node_modules/<pkg>`, its types and changelog) rather than from memory, because these may be newer than your training data.

### Version Control & State Management
- **Frequent checkpoints.** Commit every working state on the feature branch as soon as the checks for that step are green. Do not let large uncommitted changes pile up; each commit is a safe rollback point. Push the branch regularly.
- **Never commit a broken state** to make progress look faster. If a step goes wrong, roll back to the last checkpoint (`git restore` / `git reset` on the feature branch, with user approval for anything destructive) instead of layering fixes on top.
- **Change one thing at a time.** Each commit contains one logical change. Never mix a refactor with a behaviour change, or a dependency upgrade with a feature. For a bug fix, first add a failing test that reproduces it, then fix it.
- **Diff reviews.** Before every commit, review the full staged diff (`git diff --staged`) line by line, including lockfiles, migrations and generated files. Remove anything unrelated to the task, and report anything unexpected to the user. AI-generated output is never accepted unread: the agent reviews its own diff, and a human reviews every line of the PR before merging (Section 9).
