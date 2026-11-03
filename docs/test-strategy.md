# Test Strategy: Slice 1

Covers [`spec/slice-1.md`](spec/slice-1.md) as designed in [`technical-design.md`](technical-design.md). Quality gates are defined in `CLAUDE.md` §7.

## 1. Risks that drive the tests

| Risk                                                                 | Impact                                        | Main defence                                                           |
| -------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| Readiness shows Ready when work cannot go ahead                      | Crew travels and stands idle; trust is lost   | Exhaustive unit tests of allocation and readiness rules (§4)           |
| A team leader sees another crew's details, or resolves an escalation | Privacy and integrity breach                  | Integration tests of data access rules per persona                     |
| An escalation raised offline is lost or duplicated                   | Shortage never reaches the business, or noise | Unit tests of the outbox plus offline E2E                              |
| The assistant invents data or calls a candidate solution compliant   | Compliance risk                               | Prompt and tool contract tests with a stubbed model; manual evaluation |
| Catalogue parsing silently drops or misreads rows                    | Wrong product requirements                    | Unit tests over every size format in the file                          |
| Layout or accessibility regressions on phones                        | Team leaders cannot use it on site            | E2E on mobile and desktop viewports, accessibility checks              |

## 2. Test levels

| Level           | Tool                                  | Location               | Runs against                                       | Command                            |
| --------------- | ------------------------------------- | ---------------------- | -------------------------------------------------- | ---------------------------------- |
| **Unit**        | Vitest, React Testing Library, MSW    | `src/**/*.test.ts(x)`  | Pure functions, components, hooks, mocked network  | `pnpm test` / `pnpm test:coverage` |
| **Integration** | Vitest + `supabase-js`                | `src/**/*.int.test.ts` | Local Supabase (Docker), signed in as each persona | `pnpm test:int`                    |
| **End-to-end**  | Playwright (Pixel 7 + Desktop Chrome) | `e2e/*.spec.ts`        | Production build + local Supabase                  | `pnpm test:e2e`                    |
| **Manual**      | Checklist                             | PR description         | Real model, real devices                           | Before release                     |

- **Unit tests** cover all logic and UI states without I/O; the readiness module needs 100% branch coverage, and changed code overall ≥ 90% (CLAUDE.md §7).
- **Integration tests** prove the database behaves as designed: migrations apply, access rules hold per persona, the `allocation_demand` function leaks nothing, the one-open-escalation index and idempotent insert work, and the seed produces every readiness case.
- **E2E tests** walk the critical journeys in a real browser, including offline (`context.setOffline`), on both viewports. They use accessible locators only and no fixed sleeps.

## 3. Acceptance criteria to test levels

U = unit, I = integration, E = end-to-end, M = manual.

| Requirement               | Acceptance criteria |  U  |  I  |  E  | Notes                                                                                                                                                                                              |
| ------------------------- | ------------------- | :-: | :-: | :-: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1 Sign-in              | AC-1.1 – 1.4        |  ✓  |  ✓  |  ✓  | Middleware and role guards unit-tested; refusal of the wrong role checked by integration; both personas end to end.                                                                                |
| FR-2 Catalogue import     | AC-2.1 – 2.4        |  ✓  |  ✓  |     | Parser per size format (U); 148 rows, leading zeros and determinism after `db:reset` (I).                                                                                                          |
| FR-3 Allocation           | AC-3.1 – 3.6        |  ✓  |  ✓  |     | Matrix in §4 (U); `allocation_demand` output (I).                                                                                                                                                  |
| FR-4 Readiness            | AC-4.1 – 4.6        |  ✓  |     |  ✓  | Matrix in §4 (U); each state visible in the UI from the seed (E).                                                                                                                                  |
| FR-5 List                 | AC-5.1 – 5.4        |  ✓  |  ✓  |  ✓  | Grouping, empty state, badges (U); own crews only (I); seeded list (E).                                                                                                                            |
| FR-6 Detail               | AC-6.1 – 6.4        |  ✓  |  ✓  |  ✓  | Reasons rendering and button rules (U); other leader's work returns nothing (I); not-found page (E).                                                                                               |
| FR-7 Raise                | AC-7.1 – 7.6        |  ✓  |  ✓  |  ✓  | Form validation and errors (U); one-open index and recomputed shortage (I); raise, duplicate block and note (E).                                                                                   |
| FR-8 Resolve              | AC-8.1 – 8.5        |  ✓  |  ✓  |  ✓  | Ordering and required resolution (U); team leader cannot update (I); full loop across personas (E).                                                                                                |
| FR-9 Offline viewing      | AC-9.1 – 9.5        |  ✓  |     |  ✓  | Offline page rules and the 24-hour warning with fake timers (U); offline reload of list and detail, including pages never opened (E).                                                              |
| FR-10 Offline escalations | AC-10.1 – 10.5      |  ✓  |  ✓  |  ✓  | Outbox replay, retry and removal rules (U); `on conflict` idempotency and cleared-shortage flag (I); escalate offline, reconnect, exactly one record (E).                                          |
| FR-11 Assistant questions | AC-11.1 – 11.5      |  ✓  |  ✓  |  ✓  | Route with stubbed model and tool calls (U); tools return only the user's data (I); drawer opens, offline state (E); answer quality (M).                                                           |
| FR-12 Draft escalation    | AC-12.1 – 12.3      |  ✓  |     |  ✓  | Draft fills the note and is editable (U); form works with the assistant disabled (E).                                                                                                              |
| FR-13 Safeguards          | AC-13.1 – 13.3      |  ✓  |  ✓  |  ✓  | Length cap and error mapping (U); 20-per-hour counter (I); disabled and offline states (E).                                                                                                        |
| FR-14 Sample data         | AC-14.1 – 14.4      |  ✓  |  ✓  |  ✓  | Generator rules (U); seed contents and SAMPLE flags (I); SAMPLE labels in the UI (E).                                                                                                              |
| Non-functional            | §5 of the spec      |     |  ✓  |  ✓  | Access rules (I); viewports, touch targets, and an axe WCAG 2.2 AA scan of every screen in light and dark mode (`e2e/accessibility.spec.ts`) (E); Lighthouse mobile on the list page (M, see §7a). |

## 4. Readiness edge-case matrix

Unit tests for `computeDemand`, `allocate` and `deriveReadiness`. "Today" is fixed in each test.

| #   | Case                                           | Expected                                                               |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| R1  | Stock covers demand exactly                    | Ready                                                                  |
| R2  | Stock zero, no deliveries                      | Short by full demand                                                   |
| R3  | Stock one unit below demand                    | Short by 1                                                             |
| R4  | Two planned works, earlier one takes the stock | Earlier Ready; later Short, reason "allocated to earlier planned work" |
| R5  | Two planned works on the same date             | The earlier-created one is allocated first                             |
| R6  | Delivery due the day before the work           | Counted; Ready, "Relies on delivery"                                   |
| R7  | Delivery due on the work date                  | Not counted; Short, reason "delivery due same day"                     |
| R8  | Delivery date passed, not received             | Not counted; reason "delivery overdue"                                 |
| R9  | Delivery date passed, received                 | Already in stock; delivery ignored                                     |
| R10 | Planned work dated yesterday                   | Excluded from allocation                                               |
| R11 | Planned work dated today                       | Included                                                               |
| R12 | 14 × 0.1 cartridge across two scenarios        | Summed to 1.4, rounded up once to 2                                    |
| R13 | Fractional demand in one scenario only         | Rounded up per planned work, not per scenario                          |
| R14 | Scenario without a nominated solution          | Unknown, reason "no nominated solution"                                |
| R15 | Solution without a product requirement         | Unknown, reason "no product requirement"                               |
| R16 | Product without a stock record                 | Unknown, reason "no stock record"                                      |
| R17 | One scenario Short, another Unknown            | Planned work Short                                                     |
| R18 | One scenario Unknown, others Ready             | Planned work Unknown (never Ready)                                     |
| R19 | Planned work with no scenarios                 | Unknown                                                                |
| R20 | Same input twice, rows in different order      | Identical output                                                       |
| R21 | 1,000 planned works × 12 products              | Correct and fast enough (< 100 ms)                                     |
| R22 | Negative or zero penetration count in input    | Rejected as invalid input                                              |

## 5. Data access rules per persona

Integration tests sign in through Supabase Auth as each SAMPLE persona and a second, unrelated team leader created by the test.

| Check                                                           | Team leader            | Other team leader | Project manager |
| --------------------------------------------------------------- | ---------------------- | ----------------- | --------------- |
| Read own crews' planned work                                    | Allowed                | Denied            | Allowed         |
| `allocation_demand` exposes other crews' crew, site or scenario | Never                  | Never             | n/a             |
| Insert escalation on own planned work                           | Allowed                | Denied            | Denied          |
| Second open escalation on the same planned work                 | Refused (unique index) |                   |                 |
| Update or resolve an escalation                                 | Denied                 | Denied            | Allowed         |
| Add note to an escalation                                       | Own only               | Denied            | Allowed         |
| Read another user's assistant usage                             | Denied                 | Denied            | Denied          |
| Anonymous access to any table                                   | Denied                 |                   |                 |

## 6. Assistant testing

| What                             | How                                                                                                                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool contracts                   | Unit tests call each tool with a fake repository and check the input validation, output shape and that no other user's data is reachable.                                                                                                                                             |
| Loop and streaming               | MSW intercepts the Anthropic API and replays recorded responses: a tool call followed by an answer, a `refusal` stop, `max_tokens`, a 429 and a 500. Each maps to the right UI state.                                                                                                 |
| Safeguards                       | `AI_ENABLED=false`, missing key and offline are covered in unit and E2E tests; the rate limit in integration tests.                                                                                                                                                                   |
| Grounding and compliance wording | A manual evaluation set of 10 questions (including "can I use a different collar?") run against the real model before release, recording whether answers name sources, state the data's age and refuse compliance claims. Not in CI, because it costs money and is non-deterministic. |

E2E tests run with the assistant disabled or stubbed, never against the real API.

## 7. Offline testing

| What                                                                                                              | Level              |
| ----------------------------------------------------------------------------------------------------------------- | ------------------ |
| Which requests may be cached (Planned Work pages only; other private pages and RSC never)                         | Unit               |
| Pre-loading detail pages; clearing caches on sign-in and sign-out                                                 | Unit, E2E          |
| Stale warning after 24 hours                                                                                      | Unit (fake timers) |
| Outbox: add, replay, retry, remove on `created` / `duplicate` / `alreadyOpen`, keep on network error              | Unit               |
| App shell, list and detail (including details never opened) load offline after one visit; My escalations does not | E2E                |
| Offline banner and disabled network actions                                                                       | E2E                |
| Escalate offline, reconnect, exactly one escalation exists                                                        | E2E                |

## 7a. Accessibility and performance

- **Automated:** `e2e/accessibility.spec.ts` runs axe with the WCAG 2.2 AA rules on sign-in, the offline page, every team leader page (including the assistant dialog and the offline list) and the project manager inbox, in light and dark mode, on the mobile and desktop projects. Transitions are switched off during the scan so colours are measured at rest. axe covers the automatable subset of WCAG; keyboard and screen reader checks stay manual.
- **Manual (Lighthouse 13.5, mobile preset with simulated slow 4G, signed-in Planned Work list, production build, 3 Nov 2026):**

  | Colour scheme | Performance | Accessibility | Best practices | Time to interactive | Largest contentful paint |
  | ------------- | ----------- | ------------- | -------------- | ------------------- | ------------------------ |
  | Light         | 99          | 100           | 100            | 2.5 s               | 2.3 s                    |
  | Dark          | 98          | 100           | 100            | 2.4 s               | 2.4 s                    |

  The first run found a dark-mode contrast failure (4.17:1) in the header that the light-mode axe scan had missed; that is why the axe scan now covers both schemes. Re-run Lighthouse against the deployed URL after the first deploy.

## 8. CI

Each PR runs, in order: format check, lint, typecheck, unit tests with coverage thresholds, start local Supabase with migrations and seed, integration tests, production build, E2E on both viewports. Reports (coverage, Playwright HTML) are uploaded as artifacts. A failing gate blocks the merge.

## 9. Not tested, and why

| Gap                             | Reason                                                                                | Mitigation                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Real-model answer quality in CI | Non-deterministic and costs money                                                     | Manual evaluation set (§6) before release                                 |
| Sending while the app is closed | Background Sync is not used (Server Actions cannot be called from the service worker) | Items send on next open; E2E covers reconnect while open                  |
| iOS Safari                      | Not available in Playwright's WebKit with full service worker fidelity                | Manual check on an iPhone before release                                  |
| Cloud Supabase and Vercel       | Deferred to the deployment milestone                                                  | Same migrations; smoke test after first deploy                            |
| Real product data accuracy      | The catalogue has no products; quantities are SAMPLE                                  | Documented assumptions (spec §6); validation listed in the iteration plan |
| Load beyond a single business   | Out of scope for slice 1                                                              | R21 checks the readiness module at 1,000 planned works                    |
