# Delivery Plan

Slice 1 of the team leader experience: check whether planned work is **Ready**, **Short** or **Unknown**, escalate shortages to a project manager, keep readiness viewable offline, and optionally ask a read-only AI assistant. Terms follow [`GLOSSARY.md`](../GLOSSARY.md).

## Working rules

- One task = one GitHub issue = one branch = one PR (≤ 400 changed lines). See [`CLAUDE.md` §11](../CLAUDE.md).
- M1 docs are reviewed before any feature code is written.
- Everything runs locally: the Next.js app on the host, and Supabase in Docker via the Supabase CLI. Only the optional AI assistant needs a cloud service (an Anthropic API key).
- Status lives on the issues; this file lists scope and order.

## Milestones

### M1 Design docs

Blueprint docs the brief requires; no feature code until these are reviewed.

| Task | Issue                                                                                 | Summary                                                                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | [#4](https://github.com/coolloic/passive-fire/issues/4) `docs: iteration plan`        | Write `docs/iteration-plan.md`: the four iterations (readiness + escalation; candidate solutions with approval; stock per location and reservations; integration), the value of each, and why slice 1 comes first.                  |
| 1.2  | [#5](https://github.com/coolloic/passive-fire/issues/5) `docs: slice 1 specification` | Write `docs/spec/slice-1.md` with functional requirements, acceptance criteria, non-functional requirements, assumptions (including the sample-data mappings) and exclusions.                                                       |
| 1.3  | [#6](https://github.com/coolloic/passive-fire/issues/6) `docs: technical design`      | Write `docs/technical-design.md`: UX flows for the six screens, data model, components and interfaces (Supabase schema, readiness module, AI route and tools, offline storage), fit with the QAntum stack, and the main trade-offs. |
| 1.4  | [#7](https://github.com/coolloic/passive-fire/issues/7) `docs: test strategy`         | Write `docs/test-strategy.md`: what is tested at unit, integration (database and RLS) and E2E level, the risks each layer covers, and how CI runs them against local Supabase.                                                      |

### M2 Local data

Local Supabase in Docker, schema, catalogue import and sample data.

| Task | Issue                                                                                                    | Summary                                                                                                                                                                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | [#8](https://github.com/coolloic/passive-fire/issues/8) `chore: local supabase stack and ci`             | Add the Supabase CLI as a pinned dev dependency, `supabase init`, `pnpm db:start`, `pnpm db:reset` and `pnpm db:stop` scripts, and run local Supabase in CI.                                                                                 |
| 2.2  | [#9](https://github.com/coolloic/passive-fire/issues/9) `feat(db): schema and rls policies`              | Migrations for solutions, products, product requirements, sites, scenarios, nominated solutions, crews, planned work, stock, expected deliveries, escalations and profiles, with RLS policies for the Team Leader and Project Manager roles. |
| 2.3  | [#10](https://github.com/coolloic/passive-fire/issues/10) `feat(data): import solutions catalogue`       | Deterministic import of `docs/solutions-excerpt.csv`: keep raw columns, add cleaned fields (shape, dimensions in mm, substrate type and thickness, Insulation as null for '-'), and flag rows that cannot be parsed.                         |
| 2.4  | [#11](https://github.com/coolloic/passive-fire/issues/11) `feat(data): sample products and requirements` | About 12 generic SAMPLE products and rule-generated product requirements (quantity per penetration) for all solutions, with the rules documented as assumptions.                                                                             |
| 2.5  | [#12](https://github.com/coolloic/passive-fire/issues/12) `feat(data): sample site seed`                 | Seed one SAMPLE site with about 12 nominated solutions, 2 crews, about 6 planned works over 14 days relative to today, stock and expected deliveries, and demo personas.                                                                     |

### M3 Readiness rules

Pure, fully tested allocation and readiness logic.

| Task | Issue                                                                                           | Summary                                                                                                                                                           |
| ---- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | [#13](https://github.com/coolloic/passive-fire/issues/13) `feat(readiness): allocation by date` | Pure function that allocates stock and expected deliveries to future and today's planned work in date order, with ties going to the earlier-created planned work. |
| 3.2  | [#14](https://github.com/coolloic/passive-fire/issues/14) `feat(readiness): states and reasons` | Derive Ready, Short or Unknown per scenario and the worst state per planned work, with human-readable reasons.                                                    |

### M4 Team leader screens

Mobile-first screens for checking readiness.

| Task | Issue                                                                                         | Summary                                                                                                                                      |
| ---- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | [#15](https://github.com/coolloic/passive-fire/issues/15) `feat(auth): demo persona sign-in`  | Sign-in screen offering the SAMPLE Team Leader and Project Manager personas, backed by real Supabase Auth sessions, with role-based routing. |
| 4.2  | [#16](https://github.com/coolloic/passive-fire/issues/16) `feat(planned-work): list screen`   | Planned Work list for the next 14 days, grouped by date, with a readiness badge and a relies-on-delivery flag.                               |
| 4.3  | [#17](https://github.com/coolloic/passive-fire/issues/17) `feat(planned-work): detail screen` | Planned Work detail: scenarios with state, short products and quantities, and reasons, plus an Escalate call to action.                      |

### M5 Escalation

Raise, track and resolve shortages.

| Task | Issue                                                                                               | Summary                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | [#18](https://github.com/coolloic/passive-fire/issues/18) `feat(escalation): raise and track`       | Escalation form pre-filled with the shortage details, plus the My Escalations list.                                                                      |
| 5.2  | [#19](https://github.com/coolloic/passive-fire/issues/19) `feat(escalation): project manager inbox` | Project Manager inbox listing escalations, with resolution by reason: stock arriving, alternative solution being nominated, or planned work rescheduled. |

### M6 Offline

Read readiness offline and queue escalations.

| Task | Issue                                                                                           | Summary                                                                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6.1  | [#20](https://github.com/coolloic/passive-fire/issues/20) `feat(offline): saved readiness data` | Save readiness data in IndexedDB on every online visit, show 'Data as of', and warn when the data is more than 24 hours old.                                       |
| 6.2  | [#21](https://github.com/coolloic/passive-fire/issues/21) `feat(offline): queued escalations`   | Escalations raised offline are queued with IDs generated on the device and replayed when the connection returns, via Background Sync with a manual retry fallback. |

### M7 AI assistant

Optional, read-only assistant.

| Task | Issue                                                                                                     | Summary                                                                                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | [#22](https://github.com/coolloic/passive-fire/issues/22) `feat(ai): assistant route and read-only tools` | Server Route Handler streaming Claude responses, with read-only tools (list_planned_work, get_readiness, get_shortages, get_expected_deliveries) that query Supabase as the signed-in user, plus the assistant drawer UI. |
| 7.2  | [#23](https://github.com/coolloic/passive-fire/issues/23) `feat(ai): safeguards and degraded states`      | Per-session rate limit, response length cap, an `AI_ENABLED` switch, and clear states when the assistant is offline, disabled or not configured.                                                                          |
| 7.3  | [#24](https://github.com/coolloic/passive-fire/issues/24) `feat(ai): draft escalation with ai`            | A 'Draft with AI' option in the escalation form, using a draft_escalation tool that returns an editable draft and never sends it.                                                                                         |

## Order and MVP line

1. **MVP (local):** M1 → M2 → M3 → M4 → M5, giving a working readiness and escalation loop.
2. **Slice 1 complete:** M6 (offline) before M7 (AI), because offline-first is part of the brief and the AI is an addition.
3. **Deferred:** Supabase cloud project, Vercel deployment (`DEPLOY_ENABLED=true`, approval-gated environments) and release docs (README demo scenario, known limitations, account of the agentic coding approach). The brief's submission needs these, so they must be done before submitting.

## Risks

- **Time:** assuming about 5 working days, 21 PRs is about 4 per day, so M7 is at risk.
- **Sample data:** the catalogue has no products column, so all products, requirements, stock and deliveries are SAMPLE data generated by documented rules. Readiness is only as good as those assumptions.
- **Compliance:** the assistant and any future candidate solutions must never present a substitution as compliant without project manager approval.
