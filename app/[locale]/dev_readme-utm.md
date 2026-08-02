# UTM tracking — dev readme (the capture side)

> Three docs cover UTM, split by what they answer:
>
> | Question                                  | Doc                                                                         |
> | ----------------------------------------- | --------------------------------------------------------------------------- |
> | **How is a visit captured and stored?**   | this one — [UTMTracker.tsx](UTMTracker.tsx) + the server action              |
> | Who is the visit attributed to?           | [(site)/stats/dev_readme-device-id.md](<(site)/stats/dev_readme-device-id.md>) |
> | How are the stored rows read and charted? | [(site)/stats/dev_readme-utm.md](<(site)/stats/dev_readme-utm.md>)           |

<br/>

## 0. Why this exists (the problem)

A campaign link is posted somewhere — a story, a newsletter, a QR code on a flyer. The question is
which of those actually brought someone to the store, and we answer it without paying an analytics
SaaS and without a third-party script on the page.

So one client component reads the `utm_*` params off the landing URL and hands them to a server action,
which writes at most one `utm_stats` row per device per day. Three things it has to get right:

- **fire once per page view** — a mounted `useEffect` with an empty deps array, not on every render
- **never trust the browser** — every value the client sends (`storedDeviceId`, `timezone`,
  `fingerprint`, the IP headers) is verified or shape-checked server-side before it reaches Redis or the DB
- **leave the address bar clean** — the params are stripped after the visit is sent, so a refresh or a
  shared link does not attribute the same visit twice

<br/>

---

## 1. How it looks

Nothing renders. `UTMTracker` returns `null` — the only visible effect is the `utm_*` params
disappearing from the address bar a moment after the page appears.

```
  BROWSER                                        SERVER                                SUPABASE
  ───────────────────────────────────────        ──────────────────────────────        ──────────────────────

  /fi?utm_source=ig&utm_medium=social
    │
    ▼
  app/[locale]/layout.tsx renders <UTMTracker />
    │
    ▼
  UTMTracker useEffect (once)
    ├─ params   = URLSearchParams(location.search)
    ├─ pageUrl  = location.href          ← read BEFORE the cleanup, so the utm params are in the row
    ├─ timezone = Intl...timeZone
    └─ storedDeviceId = useDeviceIdStore.getState()
         │
         │  trackVisitAction(storedDeviceId, params, pageUrl, timezone)
         ▼
                                     resolve the deviceId (4 layers)
                                     syncDeviceIdLayers  → cookie + Redis
                                     insertDBVisitOncePerDay
                                       ├─ row for this device since local midnight? ──► SELECT utm_stats
                                       │     found ──► skip the insert
                                       └─ none  ──► getVisitMetadata (geo headers)
                                                    insertDBUTMVisitAction ──────────► INSERT utm_stats
         ◄── { storedDeviceId }  or  { needsFingerprint: true }
    │
    ├─ setStoredDeviceId(...)  → localStorage "deviceIdStore"
    └─ history.replaceState    → /fi   (utm params gone, every other param kept)
```

### Where each piece of code lives

| Stage                              | File                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Mounted in the layout              | [layout.tsx](layout.tsx) — `<UTMTracker />`, no props                    |
| Read params, two-phase call, cleanup | [UTMTracker.tsx](UTMTracker.tsx)                                       |
| Resolve, write back, dedup, insert | [trackVisitAction.ts](../actions/trackVisitAction.ts)                    |
| The INSERT itself                  | [insertDBUTMVisitAction.ts](../actions/insertDBUTMVisitAction.ts)        |
| Geo + user-agent serialize/parse   | [utmVisitMetadata.ts](../utils/utmVisitMetadata.ts)                      |
| Fingerprint (only when asked)      | [computeFingerprint.ts](../utils/computeFingerprint.ts)                  |
| The visitor's own day              | [visitorDayBounds.ts](../utils/visitorDayBounds.ts)                      |
| Identity layers                    | [(site)/stats/dev_readme-device-id.md](<(site)/stats/dev_readme-device-id.md>) |

### Types

- [TTrackVisitResult](../ts/types/TTrackVisitResult.ts) — `{ needsFingerprint: true } | { storedDeviceId: string }`
- [IUTMVisitMetadata](../utils/utmVisitMetadata.ts) — `{ userAgent, countryCode, country, region, city }`

### What lands in which column

| URL param      | `utm_stats` column | Note                                                       |
| -------------- | ------------------ | ---------------------------------------------------------- |
| `utm_source`   | `source`           | `"organic"` when the URL carried no utm param at all        |
| `utm_medium`   | `medium`           | `"direct"` in the same case                                 |
| `utm_campaign` | `campaign`         | stays NULL when absent; the dashboard reads it as `no-campaign` |
| `utm_term`     | —                  | read and passed along, but the table has no column for it   |
| `utm_content`  | —                  | same                                                        |
| —              | `url`              | the full landing href, utm params included                   |
| —              | `user_id`          | the resolved deviceId                                       |
| —              | `user_agent`       | JSON of `IUTMVisitMetadata`, not just the UA string          |
| —              | `country_code` / `country` / `region` / `city` | from the edge headers below |

Geo comes from headers the platform adds, so locally they are all absent and the columns stay NULL:
`x-vercel-ip-country` (or `cf-ipcountry`), `x-vercel-ip-country-region`, `x-vercel-ip-city`.

**`url` is not decoration.** The dashboard scopes rows to this project with
`url ilike %://localhost:3023/%` and the three live hosts (`PROJECT_URL_FRAGMENTS` in
[selectDBUTMStatsAction.ts](<(site)/stats/actions/selectDBUTMStatsAction.ts>)), because `utm_stats` is
shared with projects 14/28/29. A row written with no `url` is stored but never charted.

<br/>

---

## 2. Terminology

| Term               | Means                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **visit**          | one `utm_stats` row. At most one per deviceId per visitor day.                              |
| **utm params**     | the 5 `utm_*` query params. Only source/medium/campaign have columns.                       |
| **organic / direct** | what a visit with no utm params is recorded as.                                           |
| **landing URL**    | `location.href` as it arrived, utm params included — the `url` column.                      |
| **visitor day**    | midnight-to-midnight in the visitor's own timezone, not UTC.                                |
| **phase 1 / 2**    | the two `trackVisitAction` calls. Phase 2 happens only when layers 1-3 all missed.          |
| **write-back**     | `syncDeviceIdLayers` — every identity layer is re-pointed at the winning deviceId.          |
| **the cleanup**    | `history.replaceState` stripping the 5 utm params, keeping every other query param.         |

<br/>

---

## 3. How it works (ASCII)

### A campaign link, end to end

```
  visit /fi?utm_source=ig&utm_medium=social&utm_campaign=summer&modal=CartModal

  params  = { utm_source: "ig", utm_medium: "social", utm_campaign: "summer", modal: "CartModal" }
  pageUrl = "https://jokik.fi/fi?utm_source=ig&utm_medium=social&utm_campaign=summer&modal=CartModal"

  ──► extractUTMParams  keeps only the 5 utm_* keys        (modal is ignored, not stored)
  ──► hasUTMParams = true                                  (so no organic/direct default)
  ──► INSERT { user_id: "23-…", source: "ig", medium: "social", campaign: "summer", url: pageUrl }
  ──► address bar becomes  /fi?modal=CartModal              (the modal still opens)
```

### No utm params at all

```
  visit /fi
  ──► hasUTMParams = false
  ──► INSERT { source: "organic", medium: "direct", campaign: null }
```

### Only utm_term arrived (nothing named a source)

```
  visit /fi?utm_term=running+shoes
  ──► hasUTMParams = true   (utm_term counts as "a utm param arrived")
  ──► INSERT { source: null, medium: null, campaign: null }   ← no organic/direct default
  ──► the dashboard reads a null source as "direct" (source || "direct" in selectDBUTMStatsAction)
```

### The same visitor, three times in one day

```
  09:00 local  ──► resolve 23-abc…  ──► no row since local midnight  ──► INSERT      ✅
  13:00 local  ──► resolve 23-abc…  ──► row found                    ──► skip        ⏭️
  21:00 local  ──► resolve 23-abc…  ──► row found                    ──► skip        ⏭️
  00:30 local, next day
               ──► resolve 23-abc…  ──► window restarted at midnight  ──► INSERT      ✅

  the write-back still runs on the skipped visits, so the cookie and the Redis keys
  keep their expiry moving with the visitor
```

### A repeated param

```
  /fi?utm_source=ig&utm_source=fb   ──► searchParams.utm_source = ["ig","fb"]  ──► "ig" is stored
```

<br/>

---

## 4. Tests

### Unit — `pnpm test:unit` (vitest "unit" project, node)

154 tests over 7 files. They exercise the real crypto, the real IP parsing and the real timezone
arithmetic; only Supabase, Redis, `next/headers` and the cookie store are replaced with recorders.

| File                                                                          | Covers                                                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [deviceId.test.ts](../utils/deviceId.test.ts)                                 | minting, the keyed check, 16 refusal cases, the transport form round trip                |
| [deviceIdKeys.test.ts](../utils/deviceIdKeys.test.ts)                         | key length/hex validation, the missing-env message, signing key derivation               |
| [deviceIdCookie.test.ts](../utils/deviceIdCookie.test.ts)                     | round trip, a flipped bit in iv / auth tag / ciphertext, a cookie from another key       |
| [requestIp.test.ts](../utils/requestIp.test.ts)                               | header order, forwarded chains, every private range, unparseable values                  |
| [visitorDayBounds.test.ts](../utils/visitorDayBounds.test.ts)                 | 6 timezones incl. 30/45-minute offsets, unknown zones, both summer-time transitions      |
| [deviceIdRedis.test.ts](../libs/deviceIdRedis.test.ts)                        | both key shapes, `exat` / `ex 600`, 9 values refused before becoming a key               |
| [trackVisitAction.test.ts](../actions/trackVisitAction.test.ts)               | layer order, phase 1 writing nothing, dedup, cookie flags, organic/direct, params        |

### End to end — `pnpm test:e2e`

[cypress/e2e/utm-visit-tracking.cy.ts](../../cypress/e2e/utm-visit-tracking.cy.ts), 9 tests against a
real dev server and the real Supabase table, through four tasks in
[cypress.config.ts](../../cypress.config.ts):

- `readUTMVisits` — decodes the transport form from localStorage into the signed id, since that is what
  `user_id` holds and the browser never sees it
- `readUTMVisitsForUserId` — proves no row was written under a hand-typed id
- `deleteUTMVisitsForUserId` — every test deletes the rows it created, since the table is shared with
  projects 14/28/29
- `resetVisitorFingerprints` — deletes `utm:device-id:by-fingerprint:*` in a `beforeEach`

**Why that last one is not optional.** Clearing cookies and localStorage between tests does not make a
new visitor: the machine keeps its fingerprint, so layer 4 hands every test the first test's deviceId,
and the once-per-day dedup then refuses the row a later test is looking for. Found by running it —
before the reset existed, the whole run resolved to **one** deviceId and the organic/direct test read the
campaign row from the first test. A test that needs a new visitor must clear that namespace first.

**Locale note.** `en` is the default locale and is served at `/`, so `/en` 307s to `/`. The path
assertion uses `/fi`, which keeps its prefix — otherwise the test asserts the locale redirect rather
than the cleanup keeping the path it was given.

| Test                                       | Proves                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| records one row with the campaign          | source/medium/campaign, the stored `url`, the metadata JSON, one row only     |
| strips the utm params                       | utm params gone, `modal=CartModal` kept, `/fi` path kept                      |
| cookie stays httpOnly and encrypted        | `httpOnly: true`, value is not the id, `document.cookie` has no `23_did`      |
| a second visit the same day                | same stored id, still one row, the first arrival is the one recorded          |
| no utm params                              | organic / direct / null campaign                                              |
| hand-typed localStorage id                 | refused, the real id written back, zero rows under the typed value            |
| tampered cookie                            | the visit is still recorded and the cookie is replaced                        |
| cleared localStorage                       | layer 2 re-identifies the visitor, still one row                             |
| cleared localStorage AND cookie            | layer 4 re-identifies the visitor inside its 10 minutes                       |

**Prerequisite:** `DEVICE_ID_ENCRYPTION_KEY` in `.env.local` (64 hex chars, `openssl rand -hex 32`) plus
the `UPSTASH_REDIS_*` pair. Without the key no visit resolves an id, so every e2e test fails on its
first assertion while every page still renders.

### What has actually been run

- ✅ `pnpm test:unit` — 154 passed
- ✅ `pnpm type-check`, `pnpm lint` — clean
- ✅ **all 9 scenarios above, in headless chromium against the dev server on 3023** — 42 checks passed,
  and the cleanup deleted 9 distinct deviceIds, which is what proves each scenario was a separate visitor
- ⛔ `pnpm cypress:run:electron` — the Cypress binary fails its own smoke test on this Kali machine
  (`bad option: --smoke-test`, a missing system library — see
  [required-dependencies](https://on.cypress.io/required-dependencies)). The spec is unrun **as a Cypress
  spec**; the behaviour it asserts is verified. CI installs those libraries, so it runs there.

<br/>

---

## 5. Edge cases

| Case                                                | What happens                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Visitor with no utm params                          | still tracked, as organic / direct                                              |
| Only `utm_term` / `utm_content`                     | source + medium stay NULL; the dashboard reads NULL source as "direct"           |
| Repeated param (`?utm_source=ig&utm_source=fb`)     | the first value wins                                                            |
| Other query params in the link                      | kept in the address bar, never stored                                           |
| Refresh after landing                               | no second row — the params are already gone from the URL, and the dedup holds anyway |
| localStorage hand-edited                            | refused by the keyed check, the real id is written back over it                  |
| `23_did` cookie hand-edited                         | auth tag fails, the layer behaves as though the cookie were missing              |
| Local dev / no reverse proxy (`127.0.0.1`)          | the IP layer is skipped entirely, so nobody inherits a stranger's id             |
| An unknown `timezone` argument                      | falls back to a 24h window instead of throwing out of `Intl`                     |
| Clocks go forward (spring)                          | the dedup window covers 25h that day — one hour too wide only ever skips a duplicate |
| Clocks go back (autumn)                             | the window covers 23h, so a visit in that first local hour can produce a second row |
| The cookie's last base64url character rewritten     | 15 of the alternatives decode to the identical ciphertext, so the same id is read back — the auth tag judges tampering, not the text |
| The action fails (no env key, Redis down)           | `UTMTracker` catches it, logs, and the URL cleanup still runs — the page is unaffected |
| Storybook                                           | the `VisitTracking` story renders the tracker with an msw handler, so no visit escapes |

<br/>

---

## 6. Decisions made AGAINST

- **Against tracking every page view.** One row per device per visitor day answers "where did this
  person come from", which is the question. Raw hit counts would need a different table and a different
  dashboard.
- **Against sending the tracker's own fetch.** It is a server action, so there is no API route to
  protect, no CORS and no client-side Supabase key.
- **Against `utm_term` / `utm_content` columns.** They are extracted and passed to the insert, and the
  table has nowhere to put them. Adding columns means a migration on a table shared with three other
  projects, and no campaign we run uses them yet — see the TODO.
- **Against reading the params from `useSearchParams`.** The cleanup rewrites the URL with
  `history.replaceState`, which the router hook does not observe, so the effect reads
  `window.location.search` directly and once.
- **Against clearing the whole query string.** Only the 5 utm params are deleted, since `?modal=…`
  drives the query-param modal pattern and dropping it would close a modal the visitor opened.
- **Against awaiting the tracker before the page is usable.** It runs in an effect after paint and
  renders nothing, so a slow Redis round trip never delays the store.
- **Against failing the page when tracking fails.** The `.catch` keeps a missing env var or an
  unreachable Redis to a console line plus a missing row.

### TODO

- [ ] Set `DEVICE_ID_ENCRYPTION_KEY` in the production environment. 🚨 Nikita — until then deployed
      visits are not recorded. It is already in `.env.local`.
- [ ] Install the Cypress system libraries on this machine (or run the spec in CI) so
      `pnpm cypress:run:electron --spec cypress/e2e/utm-visit-tracking.cy.ts` starts at all.
- [ ] Decide whether `utm_term` / `utm_content` are worth two nullable columns. Only add them when a
      campaign actually uses them; the ALTER goes in the shared-table block of `dev_readme-supbase-sql.md`.
- [ ] Consider deriving the dedup window from `Intl.DateTimeFormat().formatToParts` on the *date* rather
      than elapsed wall-clock seconds, which would remove the 23h/25h summer-time skew above. Not done:
      it costs a second `Intl` pass on every visit to fix one hour twice a year.
