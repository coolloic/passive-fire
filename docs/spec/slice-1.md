# Slice 1 Specification: Readiness Check and Escalation

Terms follow [`GLOSSARY.md`](../../GLOSSARY.md). Context: [`iteration-plan.md`](../iteration-plan.md). Tasks: [`delivery-plan.md`](../delivery-plan.md).

## 1. Purpose and users

| User                | Goal in this slice                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Team leader**     | Before going on site, find out whether each planned work is Ready, Short or Unknown and why; escalate shortages. |
| **Project manager** | Receive escalations with enough context to act, and record how each was resolved.                                |

**Value:** shortages are found before a crew travels, and reach the business with lead time and context.

## 2. Scope

**In scope:** readiness for planned work over the next 14 days; allocation of stock and expected deliveries; escalation and resolution; offline viewing and queued escalations; an optional read-only AI assistant; import of the supplied catalogue; SAMPLE data for everything the catalogue lacks.

**Out of scope:** see [§7 Exclusions](#7-exclusions).

## 3. Functional requirements

Acceptance criteria (AC) are written so each maps to at least one automated test (see [`test-strategy.md`](../test-strategy.md)).

### FR-1 Demo sign-in

The app offers sign-in as a SAMPLE team leader or a SAMPLE project manager, backed by real authentication sessions.

- **AC-1.1** Signing in as the team leader opens the Planned Work list; signing in as the project manager opens the escalation inbox.
- **AC-1.2** A signed-out user requesting any app page is redirected to sign-in.
- **AC-1.3** A team leader requesting a project manager page (or vice versa) is refused by the server, not just hidden in the UI.
- **AC-1.4** Signing out ends the session; the back button does not reveal protected data.

### FR-2 Catalogue import

The supplied catalogue (`docs/solutions-excerpt.csv`) is imported as solutions.

- **AC-2.1** All 148 rows are imported; internal codes keep leading zeros (e.g. `0334`).
- **AC-2.2** Every raw column is kept unchanged alongside cleaned fields: shape (round, rectangular, linear), dimensions in mm, substrate type and thickness, and insulation rating (empty when the source is `-`).
- **AC-2.3** Size formats `Ø50mm`, `75mm`, `60`, `1100x10mm`, `900mm x 50mm` and `75x1100mm` are parsed; a row that cannot be parsed is imported and flagged, never dropped.
- **AC-2.4** Re-running the import on the same file produces identical data.

### FR-3 Allocation

Stock and expected deliveries are allocated to planned work.

- **AC-3.1** Only planned work dated today or later takes part; earlier planned work is ignored.
- **AC-3.2** Planned work is allocated in date order; planned work on the same date is ordered by creation time, earliest first.
- **AC-3.3** An expected delivery counts only for planned work dated **after** its expected date. A delivery due on the same day as the planned work does not count.
- **AC-3.4** An expected delivery whose date has passed without being received counts for nothing (overdue).
- **AC-3.5** For each planned work, product quantities are summed across its scenarios (penetration count × product requirement) and then rounded **up** to whole units once.
- **AC-3.6** Allocation is deterministic: the same data always yields the same result.

### FR-4 Readiness states and reasons

- **AC-4.1** A scenario is **Ready** when every product it needs is fully allocated.
- **AC-4.2** A scenario is **Short** when at least one product it needs cannot be fully allocated. The shortage quantity per product is shown.
- **AC-4.3** A scenario is **Unknown** when any of these is missing: a nominated solution, a product requirement for that solution, or a stock record for a required product. Unknown is never shown as Ready.
- **AC-4.4** A planned work takes its worst scenario state, in the order Short, then Unknown, then Ready.
- **AC-4.5** Every non-Ready scenario shows at least one reason from this list:

  | Reason                            | Example wording                                                                 |
  | --------------------------------- | ------------------------------------------------------------------------------- |
  | Shortage                          | "Short by 6 × 110 mm intumescent collar"                                        |
  | Allocated to earlier planned work | "5 collars allocated to earlier planned work" (no details of other crews' work) |
  | Delivery due same day             | "Delivery of 20 due on the work date; not counted"                              |
  | Delivery overdue                  | "Delivery of 20 was due Mon 2 Nov and has not arrived"                          |
  | No nominated solution             | "No solution nominated for this scenario"                                       |
  | No product requirement            | "Product quantities unknown for solution 0918"                                  |
  | No stock record                   | "No stock record for fire batt 1200 × 600 × 50"                                 |

- **AC-4.6** A Ready scenario that depends on an expected delivery shows a "Relies on delivery" flag with the delivery date.

#### Worked examples

Collar stock 15; crew A Tue needs 10; crew B Thu needs 10; delivery of 8 due Wed.

| Planned work | Allocated                          | State | Reason                   |
| ------------ | ---------------------------------- | ----- | ------------------------ |
| Crew A, Tue  | 10 from stock                      | Ready | none                     |
| Crew B, Thu  | 5 from stock + 5 from Wed delivery | Ready | Relies on delivery (Wed) |

Same data, but the delivery is due Thu: crew B gets 5, so it is **Short by 5**, with reasons "allocated to earlier planned work" and "delivery due same day".

### FR-5 Planned Work list

- **AC-5.1** Shows the team leader's planned work for today plus the next 13 days, grouped by date, earliest first.
- **AC-5.2** Each item shows site, crew, scenario count, readiness state (text and icon, not colour alone) and the "Relies on delivery" flag when it applies.
- **AC-5.3** When there is no planned work, an empty state explains that nothing is scheduled.
- **AC-5.4** A team leader sees only planned work for their own crews.

### FR-6 Planned Work detail

- **AC-6.1** Lists each scenario with its penetration count, nominated solution code, state and reasons.
- **AC-6.2** Lists each required product with quantity needed, quantity allocated and shortage.
- **AC-6.3** Shows **Escalate** when the planned work is Short or Unknown and has no Open escalation; shows **View open escalation** when it has one; shows neither when it is Ready.
- **AC-6.4** A planned work that does not exist or belongs to another team leader shows a not-found page, without revealing whether it exists.

### FR-7 Raise an escalation

- **AC-7.1** The form is pre-filled with the planned work, its date, and every short or unknown product with quantities.
- **AC-7.2** The team leader can add a note (up to 1000 characters) and submit.
- **AC-7.3** Only one Open escalation can exist per planned work; a second attempt is refused by the server and the UI links to the existing one.
- **AC-7.4** While an escalation is Open, the team leader can add notes to it.
- **AC-7.5** Validation errors (empty required fields, note too long) and server errors are shown next to the form; the input is not lost.
- **AC-7.6** My Escalations lists the team leader's escalations with state (Open or Resolved), date raised and, when resolved, the resolution.

### FR-8 Resolve an escalation

- **AC-8.1** The project manager inbox lists Open escalations first, oldest first, then Resolved ones.
- **AC-8.2** Each escalation shows the planned work, date, short products, notes and who raised it.
- **AC-8.3** Resolving requires one resolution: stock arriving, a different solution being nominated, or planned work rescheduled; an optional comment may be added.
- **AC-8.4** After resolution, the team leader sees the escalation as Resolved with its resolution.
- **AC-8.5** Team leaders cannot resolve escalations (enforced on the server and by data access rules).

### FR-9 Offline viewing

- **AC-9.1** After one online visit, the Planned Work list and detail for viewed planned work open offline.
- **AC-9.2** While offline, an offline banner is shown and every screen shows "Data as of" with the time of the last sync.
- **AC-9.3** When the data is more than 24 hours old, a warning says readiness may be out of date.
- **AC-9.4** Actions that need the network (resolving, the assistant) are disabled offline, with the reason shown.
- **AC-9.5** Every online visit refreshes the saved data.

### FR-10 Offline escalations

- **AC-10.1** Raising an escalation offline saves it on the device and shows it as "Waiting to send".
- **AC-10.2** When the connection returns, escalations waiting to send are sent automatically; a manual "Retry" is also available.
- **AC-10.3** Each escalation carries an ID created on the device; sending it more than once results in exactly one escalation.
- **AC-10.4** If the planned work's shortage has cleared by the time the escalation is sent, it is still recorded and marked "Shortage no longer present at sync".
- **AC-10.5** If the server refuses an escalation waiting to send (for example, one is already Open for that planned work), the team leader is told and the waiting item links to the existing escalation.

### FR-11 Assistant: questions

- **AC-11.1** A team leader can open the assistant from the Planned Work list and detail, and ask questions in plain language.
- **AC-11.2** The assistant can only read the team leader's own planned work, readiness, shortages and expected deliveries.
- **AC-11.3** Answers name the planned work and products they refer to and state the "Data as of" time.
- **AC-11.4** When the data does not answer a question, the assistant says so instead of guessing.
- **AC-11.5** The assistant never states that a solution other than the nominated solution is compliant or suitable; it can only point out that a project manager must approve any change.

### FR-12 Assistant: draft an escalation

- **AC-12.1** "Draft with AI" in the escalation form fills the note with a draft based on the planned work's shortages.
- **AC-12.2** The draft is only a suggestion: the team leader can edit or discard it, and nothing is sent until they submit.
- **AC-12.3** The form remains fully usable without the assistant.

### FR-13 Assistant: safeguards

- **AC-13.1** Each signed-in user can send at most 20 assistant messages per hour; beyond that, a message says when they can try again.
- **AC-13.2** Each answer is capped in length.
- **AC-13.3** When the assistant is switched off, not configured or the device is offline, the panel says so and every other feature works normally.

### FR-14 Sample data

- **AC-14.1** SAMPLE data includes about 12 products, product requirements for the catalogue's solutions, one site, about 12 nominated solutions, 2 crews with one team leader, about 6 planned works, stock and expected deliveries.
- **AC-14.2** All sample records are labelled SAMPLE in the data, and the UI marks sample products and the sample site.
- **AC-14.3** Dates are relative to the day the data is loaded, so the demo always shows upcoming work.
- **AC-14.4** The sample data produces every case: Ready; Short; Short because of earlier allocation; Ready relying on a delivery; delivery due same day; delivery overdue; Unknown with no nominated solution; Unknown with no product requirement.

## 4. Product requirement rules (SAMPLE)

The catalogue has no products, so quantities per penetration are generated by these rules. Diameters use the band at or above the service size (32, 50, 65, 100, 150 mm); larger services have no collar band and are Unknown.

| Service                                                       | Products per penetration                                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combustible pipe (PVC, PEX, PE, PP, polybutylene and similar) | 1 intumescent collar of the matching band per exposed face (wall 2, floor and ceiling 1) + 0.1 sealant cartridge                                          |
| Non-combustible pipe (copper, steel, brass)                   | 0.1 sealant cartridge per 25 mm of diameter (rounded up to the next 25 mm), + 0.5 m pipe wrap when an insulation rating of 60 minutes or more is required |
| Insulated pipe                                                | 0.5 m pipe wrap + 0.1 sealant cartridge per 25 mm of diameter                                                                                             |
| Electrical: conduit or cable bundle                           | 0.1 sealant cartridge per 25 mm of diameter                                                                                                               |
| Electrical: cable tray                                        | Fire batts covering the opening area (1 batt per 0.72 m², per exposed face) + 0.5 sealant cartridge                                                       |
| Linear joint                                                  | 1 m backing rod + 0.1 sealant cartridge per 10 mm of joint width, per metre of joint length                                                               |
| Blank opening                                                 | Fire batts covering the opening area, per exposed face + 0.5 sealant cartridge                                                                            |
| Anything else (e.g. structural timber beam)                   | No rule: no product requirement, so the scenario is Unknown                                                                                               |

## 5. Non-functional requirements

| Area           | Requirement                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility  | WCAG 2.2 AA; all states conveyed by text, not colour alone; keyboard and screen reader operable.                                                                                        |
| Performance    | Planned Work list interactive within 2.5 s on a mid-range phone on a fast mobile connection; Lighthouse mobile performance ≥ 90 on the list page.                                       |
| Responsiveness | Layouts verified at 375, 768 and 1280 px; touch targets ≥ 44 × 44 px; no horizontal scrolling.                                                                                          |
| Offline        | As FR-9 and FR-10; the app shell loads offline after the first visit.                                                                                                                   |
| Security       | Data access rules on every table, deny by default; every server action checks the user and role; the AI key and service role key never reach the browser; no secrets in the repository. |
| Privacy        | A team leader never sees other crews' planned work details; the assistant cannot read beyond the signed-in user's access.                                                               |
| Reliability    | Queued escalations survive app restarts and are sent exactly once.                                                                                                                      |
| Quality        | ≥ 90% unit test coverage on changed code, 100% branch coverage on allocation and readiness rules; E2E tests on mobile and desktop viewports.                                            |
| Operability    | Runs locally with Docker (Supabase CLI) and pnpm; one command loads the schema and SAMPLE data.                                                                                         |

## 6. Assumptions

| #   | Assumption                                                                                                                                            | Consequence                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| A-1 | The catalogue has **no products column**, despite the brief mentioning required products.                                                             | All products and product requirements are SAMPLE data from the rules in §4. |
| A-2 | Rows with service type "Blank" are linear joints (one dimension ≤ 75 mm, or a single width such as `50mm`) or blank openings (both dimensions large). | Their quantities come from length or area.                                  |
| A-3 | Stock is one pool for the business; location does not matter.                                                                                         | Iteration 3 revisits this.                                                  |
| A-4 | A delivery must arrive the day before the planned work to be usable.                                                                                  | Same-day deliveries are not counted.                                        |
| A-5 | Escalations go to a project manager.                                                                                                                  | One recipient role in slice 1.                                              |
| A-6 | Sample product names are generic and are not Ryanfire products.                                                                                       | No one should read them as real specifications.                             |
| A-7 | Sizes without a unit (e.g. `60`) are millimetres.                                                                                                     | Parsed as mm and flagged as inferred.                                       |
| A-8 | Insulation `-` means no insulation rating applies.                                                                                                    | Stored as empty, not zero.                                                  |

## 7. Exclusions

- Suggesting or approving candidate solutions (iteration 2).
- Stock per location and manual allocation (iteration 3).
- Real email or push notifications, supplier ordering, and integration with the QAntum web and operative apps (iteration 4).
- Creating or editing sites, planned work, stock or expected deliveries in the app.
- Real sign-in; demo personas only.
- Any assistant action other than reading data and drafting text.
- Multiple suppliers' catalogues; only the supplied Ryanfire excerpt.

## 8. Traceability

| Requirement       | Delivery tasks                  |
| ----------------- | ------------------------------- |
| FR-1              | 4.1 (#15)                       |
| FR-2              | 2.3 (#10)                       |
| FR-3, FR-4        | 3.1 (#13), 3.2 (#14)            |
| FR-5, FR-6        | 4.2 (#16), 4.3 (#17)            |
| FR-7, FR-8        | 5.1 (#18), 5.2 (#19)            |
| FR-9, FR-10       | 6.1 (#20), 6.2 (#21)            |
| FR-11 to FR-13    | 7.1 (#22), 7.2 (#23), 7.3 (#24) |
| FR-14, §4         | 2.4 (#11), 2.5 (#12)            |
| Data access rules | 2.2 (#9)                        |
