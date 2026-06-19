# UTM stats — dev readme

> Docs for the UTM Analytics Dashboard at `/[locale]/stats`.
> Read top to bottom: section 1 gives you the vocab + where data lives, then ASCII walkthroughs.

<br/>

## 0. Why this exists (the problem)

We want to answer one question without paying for an external analytics SaaS:

> **"When someone lands on the store, where did they come from, and from where in the world?"**

Every page view by a logged-in user is recorded once per day with its UTM params
(`utm_source` / `utm_medium` / `utm_campaign`), the page URL, and geo info derived from
edge headers. The dashboard aggregates those rows into the cards + charts you see in the
screenshots (Total Visits, Traffic Sources, Traffic Medium, Countries, Daily Visits).

Plain words: **it's our own tiny, self-hosted Google-Analytics-for-UTM, backed by one Supabase table.**

What it is **not**:

- not anonymous — we only track rows that have a `user_id` (see [trackVisitAction.ts](actions/trackVisitAction.ts) line `if (!userId) return`).
- not real-time — one row per user per day (dedupe), so counts are "unique-ish visits per day", not raw hits.

<br/>

---

## 1. Where the data lives

There is exactly **one** store: **Supabase** (Postgres table `utm_stats`).
No Redis, no Elasticbeanstalk, no Zustand for this feature — the dashboard is a server
component that reads once and hands an aggregated object to a client component.

> NOTE: the docs structure template asks for Redis/EB/Zustand screenshots. They are intentionally
> absent here — **section 2 explains why we decided against them.** Keep this section honest:
> only Supabase holds UTM data.

### Terminology (read this before the ASCII below)

<details open> <summary><b>Vocab used in this doc</b></summary>

| Term                 | Meaning                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| **visit**            | one row in `utm_stats`. Deduped to max 1 per `user_id` per calendar day.               |
| **UTM params**       | `utm_source`, `utm_medium`, `utm_campaign` read from the URL query string.             |
| **organic / direct** | fallback values when the URL has no UTM params (`source=organic`, `medium=direct`).    |
| **visit metadata**   | geo + user-agent JSON: `{ userAgent, countryCode, country, region, city }`.            |
| **aggregated stats** | `IUTMAggregatedStats` — the rolled-up object the dashboard renders (counts, not rows). |
| **chartData**        | `{ date, visits }[]` — visits grouped by `YYYY-MM-DD` for the Daily Visits chart.      |
| **period**           | the year + month selected in the date picker (`month = 0` means "Entire Year").        |
| `trackVisit`         | capture a visit (client → server action → insert).                                     |
| `selectDB`           | read from Supabase. `insertDB`                                                         | write to Supabase. (project-wide convention) |

</details>

### Types

- [IUTMVisitMetadata](../../../../utils/utmVisitMetadata.ts) — the geo/UA blob stored per row.
- [IUTMAggregatedStats](../../../../ts/interfaces/IUTMAggregatedStats.ts) — what the dashboard consumes.

### The `utm_stats` table (Supabase)

```
utm_stats
├─ id          uuid
├─ user_id     uuid        -- who; used for daily dedupe + uniqueUsers
├─ created_at  timestamptz -- when; drives the period filter + chartData
├─ source      text        -- utm_source  (or "organic")
├─ medium      text        -- utm_medium  (or "direct")
├─ campaign    text        -- utm_campaign (or "no-campaign" at read time)
├─ url         text        -- page URL; also used to scope rows to this project
└─ user_agent  text        -- ⚠️ NOT just the UA — a JSON blob of IUTMVisitMetadata
```

> 📸 **Screenshot to add:** Supabase table editor showing a few `utm_stats` rows.
> Save as `./img/supabase-utm_stats.png` and embed here:
> `![utm_stats rows in Supabase](./img/supabase-utm_stats.png)`

### Where each piece of code lives

| Stage                     | File                                                                           |
| ------------------------- | ------------------------------------------------------------------------------ |
| Capture (client)          | [UTMTracker.tsx](./UTMTracker.tsx) — mounted in [layout.tsx](../../layout.tsx) |
| Capture (server)          | [trackVisitAction.ts](actions/trackVisitAction.ts)                             |
| Write to DB               | [insertDBUTMVisitAction.ts](../../../../actions/insertDBUTMVisitAction.ts)     |
| Geo/UA serialize+parse    | [utmVisitMetadata.ts](../../../../utils/utmVisitMetadata.ts)                   |
| Read + aggregate (server) | [selectDBUTMStatsAction.ts](actions/selectDBUTMStatsAction.ts)                 |
| Render (UI)               | [UTMDashboard.tsx](components/UTMDashboard.tsx) via [page.tsx](page.tsx)       |

### Where the data renders in the UI

```
/[locale]/stats  (page.tsx → UTMDashboard.tsx)
├─ Header ............ date picker (year grid + month list) — selects the "period"
├─ Cards ............. Total Visits | Unique Users | Recent Visits (30d) | Campaigns | Countries
├─ Traffic Sources ... BarChart   ← sourceStats
├─ Traffic Medium .... PieChart   ← mediumStats
├─ Countries ......... list       ← countryStats
└─ Daily Visits ...... AreaChart  ← chartData (DailyVisitsChart component)
```

> 📸 **Screenshot to add:** the rendered dashboard. Save as `./img/ui-dashboard.png`
> and embed: `![UTM dashboard UI](./img/ui-dashboard.png)`

### Why Supabase (and only Supabase)

- **Durability matters.** Visits are historical facts we report on months later — they must
  survive restarts, so an in-memory/cache store (Redis) is wrong for the source of truth.
- **We need date-range queries.** "Show me March 2026" is a `created_at` range scan —
  Postgres does this natively (`gte`/`lt`), so the period filter lives in the DB, not in JS.
- **No client state store (Zustand) needed.** The page is a server component; the only client
  state is the _selected period_, which is plain `useState` in `UTMDashboard`. Persisting it
  globally would be over-engineering — it resets on navigation by design.

<br/>

---

## 2. TODO + decisions made AGAINST

### Decisions made against (and why)

- **❌ Did not add a Redis cache layer.** Read volume is tiny (one admin viewing a dashboard).
  Caching would add an invalidation problem for ~zero latency win. Revisit only if the table
  grows huge and the full-table aggregate scan gets slow.
- **❌ Did not add a Zustand store for the data.** Server component already has the data; a
  global store would just duplicate it and risk going stale. Period selection is local UI state.
- **❌ Did not add a dedicated geo columns (`country`, `city`, …).** Geo is packed as JSON into
  the **`user_agent`** column (see ⚠️ in section 1). This was a deliberate shortcut to avoid a
  migration — `serializeUTMVisitMetadata` writes JSON in, `parseUTMVisitMetadata` reads it out.
  Cost: you can't `WHERE country = 'FI'` in SQL; aggregation happens in JS after fetch.
- **❌ Did not track anonymous visitors.** `trackVisitAction` returns early without a `userId`.
  Keeps rows attributable + dedupable, at the cost of missing logged-out traffic.
- **❌ Mock data is NOT shown when real data exists.** `getMockData` in `UTMDashboard` is only a
  fallback for an empty DB (`totalVisits === 0`). Never mix mock + real.

### TODO

- [ ] Promote geo out of the `user_agent` JSON into real columns + a migration, so countries
      can be filtered/aggregated in SQL instead of in JS.
- [ ] Move `FIRST_YEAR` (currently `2023` in `UTMDashboard.tsx`) into a shared config constant.
- [ ] Add an index on `utm_stats(created_at)` if the period scan ever gets slow.
- [ ] Consider server-side aggregation (SQL `count ... group by`) instead of fetching rows and
      reducing in JS, once row count is large.
- [ ] Drop screenshots into `./img/` and replace the 📸 placeholders above.

<br/>

---

## 3. Terminology — how it should work (ASCII)

### Period selection (`year` + `month`)

`month = 0` → whole year. `month = 1..12` → that calendar month. The server turns this into a
half-open `created_at` range `[start, end)`:

```
Entire Year 2026   (year=2026, month=0)
  start = 2026-01-01T00:00:00Z
  end   = 2027-01-01T00:00:00Z          ── one full year ──▶
          |================================================|
          2026-01-01                               2026-12-31

March 2026         (year=2026, month=3)
  start = 2026-03-01T00:00:00Z
  end   = 2026-04-01T00:00:00Z   ──▶  only March rows
                    |======|
                    03-01  03-31
```

The picker also clamps the **year list** to real history:

```
FIRST_YEAR = 2023, today = 2026
years = [2026, 2025, 2024, 2023]      ✅ no 2020 (site didn't exist), 2026 included
```

### Dedupe (one visit per user per day)

```
user A visits 3× on 2026-06-18:
  09:00 ──▶ INSERT row   ✅ (first today)
  13:00 ──▶ found today  ⏭️  skip
  21:00 ──▶ found today  ⏭️  skip
next day 2026-06-19:
  08:00 ──▶ INSERT row   ✅ (new day)
```

### Fallback params (no UTM in URL = organic/direct)

```
URL has ?utm_source=newsletter&utm_medium=email
  ──▶ { source: "newsletter", medium: "email", campaign: undefined }

URL has no utm_* params
  ──▶ { source: "organic", medium: "direct", campaign: undefined }
```

<br/>

---

## 4. Reproduction steps (ASCII walkthrough)

### A. A real visit, end to end

```
Browser                     Server action              Supabase
───────                     ─────────────              ────────
visit /fi?utm_source=ig
  │
  ▼
UTMTracker (useEffect)
  reads ?utm_source=ig
  │  trackVisitAction(userId, params)
  ▼
                    extractUTMParams → {source:"ig"}
                    getVisitMetadata → reads edge headers
                       x-vercel-ip-country = FI
                       x-vercel-ip-city    = Helsinki
                    dedupe check: any row today? ── no ─┐
                                                        ▼
                    insertDBUTMVisitAction ───────────────▶ INSERT utm_stats
                       user_agent = JSON.stringify({         { source:"ig",
                         userAgent, countryCode:"FI",          medium:"direct",
                         country:"Finland",                    user_agent:"{...geo json...}",
                         region, city:"Helsinki" })            created_at: now }
  ▼
history.replaceState → strips ?utm_source=ig from the address bar (clean URL)
```

### B. Viewing a period in the dashboard

```
Open /stats
  page.tsx ──▶ selectDBUTMStatsAction()            (all-time, seeds first paint)
  UTMDashboard mounts, default period = Entire Year <currentYear>
        │
        ▼ effect fires for the selected period
  selectDBUTMStatsAction({ year:2026, month:0 })
        │   query: utm_stats
        │     .or(url ilike project fragments)      ← only this project's rows
        │     .gte created_at 2026-01-01
        │     .lt  created_at 2027-01-01
        ▼
  rows ──▶ reduce in JS into maps:
        sourceStatsMap   {organic:170, ig:3, linkedin:1}
        mediumStatsMap   {direct:171, cv:3}
        chartDataMap     {2026-03-01:5, 2026-03-02:9, ...}
        countryStatsMap  {FI:{count:120}, US:{count:30}, ...}
        ▼
  IUTMAggregatedStats ──▶ cards + BarChart + PieChart + AreaChart
```

### C. Switching the period actually changes the numbers

```
Pick "March 2026"  ─▶ handleDateChange(2026, 3)
                       setSelectedMonth(3)
                       effect re-runs ─▶ selectDBUTMStatsAction({year:2026, month:3})
                       ─▶ DB returns ONLY March rows ─▶ cards/charts update

Pick "February 2026" ─▶ different created_at range ─▶ different counts
```

> Before the fix this step returned the same all-time blob every time
> (`totalVisits > 0 ? fullResponse : mock`), so every month showed identical numbers.
> Now the server filters by `created_at`, so each period shows its own data.

### D. Empty period (no visits that month)

```
Pick a month with zero rows
  ─▶ EMPTY_STATS (totalVisits:0, chartData:[])
  ─▶ DailyVisitsChart early-returns the "No data available" empty state
     (so recharts never renders with a -1 size)
```
