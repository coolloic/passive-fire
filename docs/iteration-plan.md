# Iteration Plan

Terms follow [`GLOSSARY.md`](../GLOSSARY.md). Tasks for slice 1 are in [`delivery-plan.md`](delivery-plan.md).

## The need

Before going on site, a **team leader** must know whether the products for the crew's planned work will be available. When they won't be, the business has to decide whether to wait for stock, nominate a different solution, or reschedule. Today QAntum has no team leader experience, so this check happens outside the platform, if it happens at all, and shortages surface on site, when a crew is already standing idle.

## Iterations at a glance

| #   | Iteration                                    | Users                                    | Decision or action it enables                                                                               |
| --- | -------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | **Readiness check and escalation** (slice 1) | Team leader, project manager             | "Can my crew do this planned work on this date?" If not, escalate the shortage and track its resolution.    |
| 2   | **Candidate solutions with approval**        | Project manager, team leader             | "Is there a catalogue solution that could replace the short one?" Approve it as the new nominated solution. |
| 3   | **Stock per location and manual allocation** | Team leader                              | "Where is the stock, and can I secure it for my crew?"                                                      |
| 4   | **Integration with the QAntum platform**     | Team leader, project manager, operatives | Readiness built from live platform data, with real notifications, instead of sample data.                   |

Each iteration is releasable on its own and builds on the one before.

## 1. Readiness check and escalation (slice 1)

**Value:** shortages are found before the crew travels, and the business hears about them with enough context and lead time to act.

**In scope**

- Planned work for the next 14 days, each with a **Ready**, **Short** or **Unknown** state, and the reason for it.
- Allocation of stock and expected deliveries to planned work by date, earliest first.
- One escalation per planned work to a project manager, who records a resolution: stock arriving, a different solution being nominated, or planned work rescheduled.
- Readiness viewable offline from the last sync, and escalations queued offline until reconnect.
- An optional, read-only AI assistant that answers questions about readiness and drafts escalations for the team leader to send.

**Out of scope (boundaries)**

- Suggesting or approving candidate solutions (iteration 2).
- Stock per location, and any manual allocation (iteration 3).
- Real email or push notifications, ordering from suppliers, and integration with the QAntum web or operative apps (iteration 4).
- Creating or editing sites, planned work, stock or expected deliveries in the app. These come from clearly labelled SAMPLE data.
- Real sign-in. Demo personas are used instead, with access rules still enforced.
- Any AI action other than reading data and drafting text.

**Why first:** it is the smallest slice that turns the brief's core question ("are the products in stock?") into a decision and an action. It needs no new compliance process, and it produces the shortage data the later iterations act on.

## 2. Candidate solutions with approval

**Value:** shortages can be resolved by changing the nominated solution instead of waiting, without risking non-compliance.

- For a Short scenario, list catalogue solutions that match on service type, size, orientation and substrate, and meet or exceed the required fire rating. The supplied catalogue already has several solutions for the same scenario, which makes this practical.
- Each is shown as a **candidate solution: requires approval**. A matching catalogue field is not proof of compliance, so suitability is established by the project manager (and, where needed, the manufacturer or fire engineer). The approval records who approved it, when, and the evidence.
- An approved candidate becomes the scenario's new nominated solution, and readiness is recalculated.
- **Boundary:** no automatic replacement of a nominated solution, and no change to installations already recorded.

## 3. Stock per location and manual allocation

**Value:** team leaders can see and secure the stock that is actually reachable for their crew.

- Stock held per warehouse, van and site, and readiness that accounts for where products are.
- A team leader can deliberately allocate stock to planned work, overriding the date-order default.
- **Open term:** whether a deliberate hold is a kind of _Allocation_ or a separate concept is to be settled in this iteration and added to the glossary.

## 4. Integration with the QAntum platform

**Value:** readiness reflects reality without manual data entry.

- Sites, nominated solutions and planned work come from the QAntum web app, which remains the source of truth.
- Installations recorded in the operative app reduce stock.
- Escalations and resolutions trigger real notifications, and can connect to supplier ordering.
- **Boundary:** this repo consumes platform data through defined interfaces; it does not replace the web app's specification features.

## Uncertainties to validate

These are assumptions in slice 1 that real users or data could overturn:

| Assumption                                                                        | Why it matters                                                  | How to validate                                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Product requirements per solution can be derived from service, size and substrate | The catalogue has no products column; slice 1 uses SAMPLE rules | Obtain real product and quantity data from the supplier, or from QAntum's specification data |
| Stock is one shared pool                                                          | Real stock may be split across locations                        | Interview team leaders and the stores or purchasing team (feeds iteration 3)                 |
| Escalations go to a project manager                                               | The responsible role may vary by business                       | Confirm with QAntum customers                                                                |
| A delivery must arrive the day before the work                                    | Crews may load on the day                                       | Confirm with team leaders                                                                    |
| Team leaders need readiness offline                                               | Determines how much offline investment is worthwhile            | Observe where and when the check is done                                                     |
