# Cross-crew allocation through a narrow demand function

Allocation gives stock to the earliest planned work across **all** crews, but row-level security lets a team leader read only their own crews' planned work. We expose a single `security definer` Postgres function, `allocation_demand(from_date)`, that returns each future planned work's product demand (date, creation time, product, quantity, and whether it is the caller's own), with no crew, site or scenario details for other crews. The allocation rules themselves stay in TypeScript.

## Considered Options

- **Service role key in the app**: simplest, but bypasses RLS for the whole request and puts a powerful key on the request path.
- **All allocation logic in Postgres**: keeps everything behind RLS, but the rules are harder to unit-test exhaustively and cannot be reused by the assistant.
- **Precomputed allocation table** refreshed on change: faster reads, but adds triggers and staleness for a small data set.

## Consequences

- The function is the only privileged code path; its output columns are reviewed and tested so no other crew's details leak.
- Team leaders can infer how much of a product other crews' planned work needs; this is accepted, as it is needed to explain shortages.
