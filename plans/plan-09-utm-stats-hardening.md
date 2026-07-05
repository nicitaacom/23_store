# plan-09 — UTM stats hardening: geo columns, shared constant, index, SQL aggregation

**Priority:** P3
**Screenshot:** — (from `app/[locale]/(site)/stats/dev_readme-utm.md` TODO section)
**Recommended model:** Opus · medium thinking — a schema migration on a table SHARED across projects + an aggregation redesign behind a stable response shape
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

Four TODOs in the UTM stats doc, all about scale and correctness:

1. Geo lives inside the `user_agent` JSON — countries are filtered/aggregated in JS instead of SQL.
2. `FIRST_YEAR = 2023` is a magic constant inside `app/[locale]/(site)/stats/components/UTMDashboard.tsx:11`.
3. No index on `utm_stats(created_at)` — the doc says add one "if the period scan ever gets slow".
4. The dashboard selects rows and reduces in JS; at larger row counts this should be SQL `count ... group by`.

Hard constraint: `utm_stats` is **shared across projects 14/23/28/29** (`dev_readme-backup.md:28`) — any ALTER affects all of them.

## §1 Where it lives

| Piece | File |
| --- | --- |
| Dashboard + JS aggregation + FIRST_YEAR | `app/[locale]/(site)/stats/components/UTMDashboard.tsx` (`:11`, `:406`) |
| Row select action | `app/[locale]/(site)/stats/actions/selectDBUTMStatsAction.ts` |
| Feature doc (TODO list to close) | `app/[locale]/(site)/stats/dev_readme-utm.md` |
| SQL doc (migration blocks live here, copy-paste-ready) | `dev_readme-supbase-sql.md` |

## §3 Expected behavior

```
BEFORE                                     AFTER
country filter: select all rows,           country filter: WHERE country = 'FI'
  parse user_agent JSON in JS ✗              on a real column ✓
FIRST_YEAR buried in one component         shared constant, one source of truth
period scan: full table read               index on created_at (if measurement
                                             says it pays for itself)
totals: N rows -> JS reduce                totals: SQL count/group by, same
                                             response shape to the component ✓
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **Impact report first (shared table!).** Read the live `utm_stats` shape (columns, row count, what projects 14/28/29 write into `user_agent`). Produce: the exact ALTER for geo columns (`country`, `city` — nullable), the backfill UPDATE from the JSON, row-count/duration estimate, and what each other project needs to change (ideally: nothing — columns are nullable, they keep writing JSON until they adopt the columns). No SQL runs. STOP — show Nikita the report and wait for his decision.
2. **Geo migration.** Add the approved SQL as a copy-paste block in `dev_readme-supbase-sql.md`; Nikita runs it. Then update this project's write path (insert geo into the real columns, keep JSON as-is) and the read path (filter/aggregate on columns with a fallback to JSON for rows older than the backfill, until backfill confirms 100%). STOP — show Nikita the diff and wait for his review.
3. **FIRST_YEAR → shared constant.** Move to a config constant (e.g. `app/constant/` — but first check `app/constant/dev_readme.md`, which warns when NOT to use that folder; follow its verdict, else keep a named export near the stats feature). Replace the usage at `UTMDashboard.tsx:406`. STOP — show Nikita the diff and wait for his review.
4. **Index — measure before adding.** Ask Nikita to run `EXPLAIN ANALYZE` on the period query (provide it ready-made). Add `CREATE INDEX CONCURRENTLY ... ON utm_stats (created_at)` to the SQL doc only if the measurement shows a sequential scan hurting; report numbers either way. STOP — show Nikita the finding and wait for his decision.
5. **Server-side aggregation.** Replace the select-all + JS reduce with SQL aggregation (RPC or grouped selects) returning the SAME shape `UTMDashboard` reads today — the component diff should be near-zero. Update `dev_readme-utm.md` (§ data flow + close its TODO items; screenshots stay Nikita-owned). STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- All SQL lands as copy-paste blocks in `dev_readme-supbase-sql.md` (same convention as decision quoted in plan-02: "so if something happens to this supbase I can copy paste SQL and it will work").
- Steps 1 and 4 are report-first — nothing changes on a shared table without Nikita seeing the impact numbers.

## Code patterns to follow

- `dev_readme-code-patterns.md` — verb table (`selectDB...` naming for any new action), rule 12 (no fetching what state already has).
- `good-bad-examples.md` — `<fnName>Resp` naming, no vague `results` in state.
- `app/[locale]/(site)/stats/dev_readme-utm.md` + `app/constant/dev_readme.md` — the docs this plan touches.

Read them BEFORE coding; validate each diff line-by-line before saying done; rewrite touched code to match where a file drifts.

➡️ Next plan: [plan-10-faceit-oauth.md](plan-10-faceit-oauth.md)
