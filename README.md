# Passive Fire — QAntum Team Leader

[![CI](https://github.com/coolloic/passive-fire/actions/workflows/ci.yml/badge.svg)](https://github.com/coolloic/passive-fire/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A mobile-first, offline-capable web app for **construction team leaders** on the QAntum passive fire compliance platform. Before going on site, a team leader checks that the products needed for planned fire stopping work are in stock, and escalates shortages so the business can nominate a different solution or reschedule the work.

> **Status:** slice 1 (readiness check and escalation) is built and tested locally and in CI. It is **not deployed yet**: the cloud deploy job is ready but switched off until a Supabase cloud project and Vercel project exist (see [Deployment](#deployment)).

## Table of Contents

- [Background](#background)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
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

Planned for the first slice (see [Roadmap](#roadmap)): a readiness check for planned work, with shortage escalation.

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
- [Docker](https://www.docker.com/) running locally (Docker Desktop or compatible), for the local Supabase stack

### Installation

```bash
git clone git@github.com:coolloic/passive-fire.git
cd passive-fire
pnpm install          # also installs the Husky git hooks
```

### Local Supabase

Supabase (Postgres, Auth and the REST API) runs locally in Docker through the pinned Supabase CLI. No cloud project is needed.

```bash
pnpm db:start         # first run pulls Docker images and takes a few minutes
pnpm db:reset         # apply migrations in supabase/migrations and load supabase/seed.sql
pnpm db:status        # show local URLs (Studio: http://localhost:54323)
pnpm db:stop          # stop the containers
```

### Environment variables

```bash
cp .env.example .env.local
pnpm db:env           # prints the local Supabase URL and keys for .env.local
```

Paste the values `pnpm db:env` prints into `.env.local`. This file is git-ignored; never commit it.

| Variable                        | Exposed to browser | Description                                              |
| ------------------------------- | ------------------ | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes                | Supabase project URL                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes                | Supabase anon key (data access is RLS-guarded)           |
| `SUPABASE_SERVICE_ROLE_KEY`     | **No**             | Server-only; used by tests and passwordless demo sign-in |
| `ANTHROPIC_API_KEY`             | **No**             | Optional; enables the read-only AI assistant             |
| `AI_ENABLED`                    | **No**             | Set to `false` to switch the assistant off               |

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
| `pnpm test:int`      | Integration tests against local Supabase    |
| `pnpm test:e2e`      | Production build, then Playwright E2E tests |

### Demo scenario

Run `pnpm db:reset` (fresh SAMPLE data, dates relative to today), then `pnpm build && pnpm start` and open http://localhost:3000.

1. **Continue as Team Leader (SAMPLE).** Planned Work lists the next 14 days, each Ready, Short or Unknown.
2. Open the planned work **3 days from today** (Short): the reasons explain that earlier planned work took the collars and the delivery arrives on the work date.
3. **Escalate**, add a note and send. My escalations shows it as Open.
4. **Sign out**, then **Continue as Project Manager (SAMPLE).** The inbox lists the escalation; open it, choose a resolution and resolve it.
5. Sign back in as the team leader: My escalations shows the resolution.
6. **Offline:** after visiting Planned Work online ("Saved 7 planned works for offline use"), switch DevTools to **Network → Offline** and reload. The list and every detail page still open, marked "You're offline". **Escalate offline** saves an escalation on the device; switch back online and it is sent automatically.

## Testing

- **Unit tests** sit next to their source as `*.test.ts(x)`. Network calls are mocked with MSW (`src/test/msw/`). Unhandled requests fail the test.
- **Integration tests** are `*.int.test.ts` files, run with `pnpm test:int` against local Supabase (`pnpm db:start` first). They check the database and its access rules for real.
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
├── docs/                      # Brief, Ryanfire catalogue, delivery plan
│   └── adr/                   # Architecture Decision Records
├── e2e/                       # Playwright specs
├── public/icons/              # PWA icons (placeholder artwork)
├── GLOSSARY.md                # Domain language
├── supabase/                  # Local stack config, migrations, seed
└── src/
    ├── app/                   # Routes, layout, manifest.ts, sw.ts, offline page
    ├── components/            # Atomic Design
    │   ├── atoms/
    │   ├── molecules/
    │   ├── organisms/         # Domain sections: lists, forms, navigation, assistant
    │   └── templates/
    ├── hooks/                 # use-online-status
    ├── lib/                   # readiness rules, data access, services, offline, assistant, env, logger
    ├── stores/                # Zustand stores
    └── test/msw/              # Shared MSW server and handlers
```

Coding conventions, architecture rules and agent guidance are in [`CLAUDE.md`](CLAUDE.md).

## Documentation

| Document                                         | Purpose                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [`docs/requirements.pdf`](docs/requirements.pdf) | The business brief                                                     |
| [`GLOSSARY.md`](GLOSSARY.md)                     | Domain language: one agreed term per concept, with the terms to avoid  |
| [`docs/adr/`](docs/adr/)                         | Architecture Decision Records: why hard-to-reverse decisions were made |
| [`docs/delivery-plan.md`](docs/delivery-plan.md) | Milestones and tasks for slice 1, linked to GitHub issues              |
| [`CLAUDE.md`](CLAUDE.md)                         | Engineering rules and the agentic development workflow                 |

### Why a glossary?

Passive fire compliance has overloaded vocabulary. The glossary fixes **one term per concept**, used the same way in the UI, code, tests and docs, and lists synonyms to avoid. For example:

- **Variation** is reserved for QAntum's existing meaning (an installation outside the specification), so a substitution can never be mistaken for a flagged non-compliance.
- **Unknown** is defined as "a fact is missing, never treated as Ready", and that definition becomes a test case.
- **Product**, not "material", is used everywhere, so a single search finds every place that handles it.

It also keeps AI coding agents consistent: each session reads the glossary instead of inventing synonyms. Update it whenever a new domain concept appears or a definition gets sharper.

### Why ADRs?

Code shows _what_ was built, not _why_. An Architecture Decision Record is a short note explaining a decision and the alternatives rejected. ADRs are written only when a decision is **hard to reverse**, **surprising without context** and **the result of a real trade-off**. For example, [ADR 0001](docs/adr/0001-responsive-pwa-for-team-leaders.md) explains why team leaders get a responsive web app rather than screens in the Flutter operative app. To change course, add a new ADR that supersedes the old one rather than drifting silently. Smaller rules, such as allocating stock by date, belong in the specification instead.

## Deployment

> **Not deployed yet.** CI runs every check on every PR; the deploy job is skipped until the one-time setup below is done and `DEPLOY_ENABLED` is `true`.

Pushes and pull requests run [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **quality**: format check, lint, typecheck, unit tests with coverage.
2. **e2e**: production build and Playwright (the HTML report is uploaded as an artifact).
3. **deploy**: runs only after both checks pass. It uses the Vercel CLI to build and deploy, creating a **preview** for same-repo PRs and a **production** deploy for `main`. The deployment URL is recorded on the GitHub environment.
4. **Approval gate**: both the `preview` and `production` GitHub Environments require a reviewer to approve before the deploy runs. `production` also only accepts deploys from `main`. Approve a deploy from the paused run's **Review deployments** button.

One-time setup:

1. Create a Supabase cloud project, apply the migrations in `supabase/migrations/` and load the SAMPLE seed.
2. Create a Vercel project for this repo (`vercel link`). Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to its Preview and Production environments, plus `AI_ENABLED` and `ANTHROPIC_API_KEY` if the assistant should run.
3. Add these repository secrets in GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. The IDs are in `.vercel/project.json` after linking.
4. Turn off Vercel's own Git auto-deploy so GitHub Actions is the only deploy path.
5. Set the repository variable `DEPLOY_ENABLED` to `true`, then approve the first deploy.

## Sample Data

[`docs/solutions-excerpt.csv`](docs/solutions-excerpt.csv) has 148 Ryanfire solution records: internal and supplier codes, service, orientation, substrate, and integrity and insulation ratings. It is a **catalogue only**: it has no products, quantities, stock, deliveries, sites or schedules. Everything else is **SAMPLE** data, labelled as such in the database and the UI. All of it is generated by `pnpm db:seed:generate` into `supabase/seed/` and loaded by `pnpm db:reset`.

| Seed file                | Contents                                                                              | Source                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `01_catalogue.sql`       | The 148 solutions: raw columns plus cleaned shape, size, substrate and ratings        | The CSV                                                                     |
| `02_sample_products.sql` | 9 SAMPLE products and 242 product requirements                                        | Rules in [spec §4](docs/spec/slice-1.md#4-product-requirement-rules-sample) |
| `03_sample_site.sql`     | Demo personas, one site, 2 crews, 12 scenarios, 8 planned works, stock and deliveries | [`src/lib/sample-data/site.ts`](src/lib/sample-data/site.ts)                |

Dates are relative to the day you run `pnpm db:reset`, so upcoming work never goes stale. The sample site is tuned so every readiness case appears:

| Planned work | When       | Expected readiness        | Why                                                                         |
| ------------ | ---------- | ------------------------- | --------------------------------------------------------------------------- |
| PW0          | 3 days ago | (past)                    | Takes no part in allocation                                                 |
| PW1          | Day +1     | Ready                     | Collars and sealant in stock                                                |
| PW2          | Day +2     | Short                     | Not enough Ø100 collars; the pipe wrap delivery is overdue                  |
| PW3          | Day +3     | Short                     | PW1 took most of the Ø50 collars; the next delivery is due on the work date |
| PW4          | Day +5     | Ready, relies on delivery | Fire batts arrive the day before                                            |
| PW5          | Day +7     | Unknown                   | The timber beam's solution has no product requirement                       |
| PW6          | Day +9     | Unknown                   | One scenario has no nominated solution; the Ø65 collar has no stock record  |
| PW7          | Day +11    | Short                     | No pipe wrap, and its delivery is overdue                                   |

Demo personas: **Sam Taylor (SAMPLE)**, team leader for both crews, and **Priya Shah (SAMPLE)**, project manager. They have random, unknowable passwords; the app signs them in without a password.

## Known Limitations

- **SAMPLE data only.** Products, quantities, stock, deliveries, sites and schedules are generated SAMPLE data; the supplied catalogue has no products. Demo personas replace real sign-in.
- **Offline viewing caches whole pages** ([ADR 0003](docs/adr/0003-offline-viewing-by-caching-planned-work-pages.md)). The Planned Work list and the next 14 days' details work offline after one online visit; other pages need a connection. Escalations raised offline wait on the device and are sent the next time the app is open and online; there is no background sending while the app is closed.
- **The AI assistant is optional and has not been evaluated against the real model in this repository.** Without `ANTHROPIC_API_KEY` it says it is not set up; automated tests use a stubbed model. A manual evaluation with real questions is still needed before relying on its answers.
- **"Today" is UTC**, to match the local database; real sites need their own time zone.
- There is no "new version available" prompt yet. A waiting service worker activates the next time all tabs are closed.
- The icons are placeholder artwork.

### Gaps before production

- **Not deployed.** No public URL yet (see [Deployment](#deployment)).
- **Open demo sign-in.** On a public URL anyone can sign in as the SAMPLE personas. Fine for SAMPLE data; real users need real sign-in (QAntum's identity provider) and per-user crews.
- **Assistant cost and evaluation.** On a public URL every visitor shares the demo persona's hourly limit and the API key's cost; it needs a spending cap or `AI_ENABLED=false`, and the manual real-model evaluation in the [test strategy](docs/test-strategy.md).
- **Monitoring.** Errors go to the console through `src/lib/logger.ts`; production needs a hosted sink (e.g. Sentry) behind the same interface, and uptime alerts.
- **Device coverage.** iOS Safari's service worker behaviour is checked manually, not in CI.
- **Time zones and updates.** "Today" is UTC, and there is no "new version available" prompt (above).

### Possible enhancement: structured offline data

Offline viewing could move from cached pages to an **IndexedDB snapshot** of readiness data rendered in the browser. That would make offline data queryable (search, filters) and reusable by other features, at the cost of a second, browser-side rendering path for the list and detail. See the rejected option in ADR 0003.

## Roadmap

Tasks for slice 1 are tracked in [`docs/delivery-plan.md`](docs/delivery-plan.md). A possible enhancement to offline viewing (an IndexedDB snapshot) is described under [Known Limitations](#possible-enhancement-structured-offline-data).

1. **Readiness check and escalation (slice 1):** show whether each planned work is Ready, Short or Unknown against stock and expected deliveries, and escalate shortages to a project manager. Includes offline viewing, escalations queued offline, and an optional read-only AI assistant.
2. **Candidate solutions:** suggest catalogue solutions that match on service, orientation, substrate and fire rating. Each is clearly marked **"requires approval"**, because a matching catalogue field alone is not proof of compliance. A project manager approves the new nominated solution.
3. **Stock per location and manual allocation:** stock held in warehouses, vans and sites, and manual allocation.
4. **Integration:** real notifications, installations recorded in the operative app reducing stock, and the QAntum web app as the source of truth for sites and planned work.

## Contributing

1. Branch from `main` as `<type>/<short-description>` (e.g. `feat/material-readiness`).
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`). Hooks enforce style, lint, types and the message format; do not bypass them with `--no-verify`.
3. Before opening a PR, run `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm test:e2e`.
4. Open a PR with `gh pr create`. Every PR needs human review before merging.

## License

[MIT](LICENSE) © loic-ship-it
