# Passive Fire — QAntum Team Leader

[![CI](https://github.com/coolloic/passive-fire/actions/workflows/ci.yml/badge.svg)](https://github.com/coolloic/passive-fire/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A mobile-first, offline-capable web app for **construction team leaders** on the QAntum passive fire compliance platform. Before going on site, a team leader checks that the materials needed for the planned fire stopping work are in stock, and escalates shortages so the business can pick an alternative solution or reschedule the work.

> **Status:** project scaffold. The tech stack, quality gates, PWA shell and CI/CD are in place. The first feature slice has not been built yet.

## Table of Contents

- [Background](#background)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Sample Data](#sample-data)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Background

QAntum captures the "golden thread" of building information for passive fire protection, from design through installation to ongoing inspection. It already has:

- a **web app** for administration, specification and reporting, and
- an **offline-first mobile app** for operatives who install fire stopping and record photo evidence against a floor plan.

**Team leaders** have no tool of their own. They need to know whether the materials for upcoming work are available before they schedule crews. A shortage may mean nominating a different solution for the affected scenarios, which needs approval, or waiting for stock.

This repository is the team leader web experience. The full brief is in [`docs/requirements.pdf`](docs/requirements.pdf). The Flutter mobile app is **out of scope** for this repo.

## Features

What the scaffold includes today:

- **Installable PWA.** Web manifest, maskable icons and a Serwist service worker. The app shell is precached and pages fall back to `/offline` when there is no connection.
- **Connectivity awareness.** A shared `useOnlineStatus` hook and an accessible offline banner.
- **Supabase access layer.** Typed browser and server clients behind `src/lib/supabase/`. Both use the anon key, so Row Level Security applies.
- **Fail-fast configuration.** Zod-validated environment variables. Errors name the missing variable, never its value.
- **Quality gates.** ESLint, Prettier, strict TypeScript, Vitest with a 90% coverage threshold, Playwright on mobile and desktop viewports, Husky pre-commit hooks and commitlint.
- **CI/CD.** GitHub Actions runs every check, then deploys to Vercel (preview for PRs, production for `main`).

Planned for the first slice (see [Roadmap](#roadmap)): material readiness for planned work, with shortage escalation.

## Tech Stack

| Concern         | Choice                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| Framework       | [Next.js 14](https://nextjs.org/) (App Router), React 18                    |
| Language        | TypeScript (strict)                                                         |
| Styling         | Tailwind CSS (mobile-first)                                                 |
| State           | Zustand (global), React Context (layout)                                    |
| Backend / data  | [Supabase](https://supabase.com/) (Postgres, Auth, RLS) via `@supabase/ssr` |
| Offline / PWA   | [Serwist](https://serwist.pages.dev/) (`@serwist/next`)                     |
| Validation      | Zod                                                                         |
| Unit tests      | Vitest, React Testing Library, user-event, MSW                              |
| E2E tests       | Playwright (Pixel 7 + Desktop Chrome)                                       |
| Git hooks       | Husky, lint-staged, commitlint (Conventional Commits)                       |
| Hosting / CI/CD | Vercel, GitHub Actions                                                      |

This matches QAntum's existing stack (React, Node.js, Next.js, Supabase, Vercel). Flutter is used only by the operative mobile app and is not part of this repo.

## Getting Started

### Prerequisites

- Node.js **22+** (see [`.nvmrc`](.nvmrc); run `nvm use`)
- [pnpm](https://pnpm.io/) **12+**. This project uses pnpm only; do not use npm or yarn.
- A Supabase project (optional until the first data-backed feature lands)

### Installation

```bash
git clone git@github.com:coolloic/passive-fire.git
cd passive-fire
pnpm install          # also installs the Husky git hooks
```

### Environment variables

```bash
cp .env.example .env.local
```

Then fill in the values in `.env.local`. This file is git-ignored; never commit it.

| Variable                        | Exposed to browser | Description                                    |
| ------------------------------- | ------------------ | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes                | Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes                | Supabase anon key (data access is RLS-guarded) |
| `SUPABASE_SERVICE_ROLE_KEY`     | **No**             | Server-only; reserved for RLS-bypassing jobs   |

## Usage

```bash
pnpm dev              # dev server on http://localhost:3000 (service worker disabled)
pnpm build            # production build (generates public/sw.js)
pnpm start            # serve the production build; use this to test PWA/offline behaviour
```

| Script               | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `pnpm lint`          | ESLint with `--max-warnings=0`              |
| `pnpm format`        | Prettier write (`format:check` to verify)   |
| `pnpm typecheck`     | `tsc --noEmit`                              |
| `pnpm test`          | Unit tests (`test:watch` for watch mode)    |
| `pnpm test:coverage` | Unit tests with the 90% coverage threshold  |
| `pnpm test:e2e`      | Production build, then Playwright E2E tests |

### Demo scenario (current scaffold)

1. Run `pnpm build && pnpm start` and open http://localhost:3000.
2. In DevTools, go to **Application → Service Workers** and confirm `sw.js` is active.
3. Go to **Network → Offline**. The amber "You are offline" banner appears.
4. Reload: the home page still loads from cache. Open an unvisited URL (e.g. `/anything`) to see the offline fallback page.

## Testing

- **Unit tests** sit next to their source as `*.test.ts(x)`. Network calls are mocked with MSW (`src/test/msw/`). Unhandled requests fail the test.
- **E2E tests** live in `e2e/*.spec.ts`. They run against a production build on port 3100, on both a mobile (Pixel 7) and a desktop viewport. The suite covers the app shell, layout overflow, the manifest, the offline indicator, offline reload and the offline fallback.
- First run only: install the browser with `pnpm exec playwright install chromium`.
- To test against an already running or deployed server, set `PLAYWRIGHT_BASE_URL`.

```bash
pnpm test:coverage
pnpm test:e2e
```

## Project Structure

```
.
├── .github/workflows/ci.yml   # CI: quality → e2e → Vercel deploy
├── .husky/                    # pre-commit (lint-staged + typecheck), commit-msg (commitlint)
├── docs/                      # Brief and supplied Ryanfire solutions catalogue
├── e2e/                       # Playwright specs
├── public/icons/              # PWA icons (placeholder artwork)
└── src/
    ├── app/                   # Routes, layout, manifest.ts, sw.ts, offline page
    ├── components/            # Atomic Design
    │   ├── atoms/
    │   ├── molecules/
    │   ├── organisms/         # OfflineIndicator
    │   └── templates/
    ├── hooks/                 # use-online-status
    ├── lib/                   # env (Zod), logger, supabase clients
    ├── stores/                # Zustand stores
    └── test/msw/              # Shared MSW server and handlers
```

Coding conventions, architecture rules and agent guidance are in [`CLAUDE.md`](CLAUDE.md).

## Deployment

Pushes and pull requests run [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **quality**: format check, lint, typecheck, unit tests with coverage.
2. **e2e**: production build and Playwright (the HTML report is uploaded as an artifact).
3. **deploy**: runs only after both checks pass. It uses the Vercel CLI to build and deploy, creating a **preview** for same-repo PRs and a **production** deploy for `main`. The deployment URL is recorded on the GitHub environment.

One-time setup:

1. Create a Vercel project for this repo (`vercel link`). Add the Supabase variables to Vercel's Preview and Production environments.
2. Add these repository secrets in GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. The IDs are in `.vercel/project.json` after linking.
3. Turn off Vercel's own Git auto-deploy so GitHub Actions is the only deploy path.

## Sample Data

- [`docs/solutions-excerpt.csv`](docs/solutions-excerpt.csv) has 148 Ryanfire solution records: internal/supplier codes, service, orientation, substrate, and integrity/insulation ratings. It is a **catalogue only**. It does not include material quantities, stock levels, delivery dates, nominated site solutions or crew schedules.
- Any sample data added for those gaps will be clearly labelled as sample data, and its assumptions documented, when the first slice is built.

## Known Limitations

- No feature slice yet. The home page is a placeholder.
- No authentication, database schema or migrations yet. The Supabase clients exist but are not used.
- There is no "new version available" prompt yet. A waiting service worker activates the next time all tabs are closed.
- Offline writes (IndexedDB queue + Background Sync) are not implemented yet.
- The icons are placeholder artwork.

## Roadmap

1. **Material readiness check (first slice):** for a planned work package, list the required products per nominated solution against stock, and highlight shortages.
2. **Shortage escalation:** raise and track a shortage with procurement or the project manager.
3. **Alternative solutions:** suggest catalogue candidates that match on service, orientation, substrate and fire rating. Each candidate is clearly marked **"requires approval"**, because a matching catalogue field alone is not proof of compliance.
4. **Schedule impact:** link readiness to crew schedules, and work offline on site.

## Contributing

1. Branch from `main` as `<type>/<short-description>` (e.g. `feat/material-readiness`).
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`). Hooks enforce style, lint, types and the message format; do not bypass them with `--no-verify`.
3. Before opening a PR, run `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm test:e2e`.
4. Open a PR with `gh pr create`. Every PR needs human review before merging.

## License

[MIT](LICENSE) © loic-ship-it
