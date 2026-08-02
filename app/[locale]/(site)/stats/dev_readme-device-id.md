# Visitor identity — the 5 layers behind one `utm_stats` row

> Companion to [dev_readme-utm.md](dev_readme-utm.md). That doc covers the dashboard at
> `/[locale]/stats`; this one covers **who** a visit gets attributed to.

<br/>

## 0. Why this exists (the problem)

Every visit is attributed to one `deviceId`, and `utm_stats.user_id` holds that id. One person
visiting twice must produce one row, not two — otherwise "500 visits" means nothing.

The hard part is that the browser is free to forget. A visitor clears site data, opens a private
window, switches from Chrome to Firefox on the same machine, or comes back after the cookie expired.
Each of those wipes a different subset of what identifies them, so **one** storage mechanism is never
enough.

So identity is resolved through 5 layers, tried in order, each one surviving a failure the one above
it does not. The first layer that answers wins and the rest are skipped.

| Layer | Where it lives                     | Survives                              | Gone when                         |
| ----- | ---------------------------------- | ------------------------------------- | --------------------------------- |
| 0     | Redis, keyed by the account uuid   | everything below, on any machine      | signed out, 30 days since a visit |
| 1     | localStorage (`deviceIdStore`)     | cookie expiry, IP change              | site data cleared, private window |
| 2     | httpOnly cookie (`23_did`)         | localStorage cleared by page JS       | end of day, site data cleared     |
| 3     | Redis, keyed by IP                 | all browser storage cleared           | IP changes, next day              |
| 4     | Redis, keyed by device fingerprint | a switch to a different browser       | 10 minutes, different machine     |

**Layer 0 is the only exact one.** Layers 1-4 each guess: they read something the visitor's machine
happens to still hold. The Supabase session already proved who this is, so when someone is signed in
their account decides the answer and the four guesses below are skipped.

**Before this existed:** `UTMTracker` sent `userId || getCookie("anonymousId") || setAnonymousId()`.
The `anonymousId` cookie is written by page JS, readable and editable in devtools, and 7 days long —
so clearing site data made the same person a brand new visitor, and typing a value into that cookie
wrote `utm_stats` rows under any id you liked.

<br/>

---

## 1. Where the data lives

```
  BROWSER                                    SERVER (trackVisitAction)          REDIS / SUPABASE
  ─────────────────────────────────────      ────────────────────────────       ────────────────────────────────

  layer 0  supabase session  ─────────────► getSessionUserId ───────────────► utm:23:device-id:by-user-id:<uuid>
           (read server-side, never sent)          │                            ex = 30 days
                                                   │
  layer 1  localStorage "deviceIdStore"  ──► storedDeviceId ─┐
           { storedDeviceId: "<transport>" }                 │
                                                            ├─ resolveDeviceIdBeforeFingerprint
  layer 2  cookie "23_did"  (httpOnly)  ───► decryptDeviceId ─┤
           aes-256-gcm(deviceId)                             │
                                                            └─► redis.get ──► utm:23:device-id:by-ip:<ip>
  layer 3  request IP  (x-real-ip)  ──────► getRequestIp ────────────────────    exat = midnight, visitor's tz

           ── all four missed → server answers { needsFingerprint: true } ──

  layer 4  computeFingerprint()  ─────────► resolveDeviceIdFromFingerprint
           sha256 of machine signals              └─► redis.get ──────────────► utm:23:device-id:by-fingerprint:<sha256>
                                                                                 ex = 600 (10 min)
           still nothing → createDeviceId()

                                            syncDeviceIdLayers writes all of them back
                                            + one utm_stats row per deviceId per visitor day
```

### Where each piece of code lives

| File                                                                                      | Owns                                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [useDeviceIdStore.ts](../../../store/user/useDeviceIdStore.ts)                            | layer 1 — the persisted transport form                        |
| [deviceId.ts](../../../utils/deviceId.ts)                                                 | minting a signed deviceId, verifying one, the transport form   |
| [deviceIdKeys.ts](../../../utils/deviceIdKeys.ts)                                         | the encryption key + the signing key derived from it          |
| [deviceIdCookie.ts](../../../utils/deviceIdCookie.ts)                                     | layer 2 — encrypt/decrypt, the cookie name                    |
| [visitorDayBounds.ts](../../../utils/visitorDayBounds.ts)                                 | midnight behind / ahead of the visitor, in their own timezone |
| [requestIp.ts](../../../utils/requestIp.ts)                                               | layer 3 — reading the IP and deciding it is usable            |
| [computeFingerprint.ts](../../../utils/computeFingerprint.ts)                              | layer 4 — the signal list and the sha256                      |
| [deviceIdRedis.ts](../../../libs/deviceIdRedis.ts)                                        | layers 0 + 3 + 4 — the four Redis key shapes and their expiry |
| [getUser.ts](../../../actions/getUser.ts)                                                 | layer 0 — the account uuid, read from the verified session    |
| [trackVisitAction.ts](../../../actions/trackVisitAction.ts)                                | resolve order, write-back, the daily dedup, the row insert    |
| [UTMTracker.tsx](../../UTMTracker.tsx)                                                     | the two-phase call and the URL cleanup                        |

### Types

- [TTrackVisitResult](../../../ts/types/TTrackVisitResult.ts) — `{ needsFingerprint: true } | { storedDeviceId: string }`
- [TCookieName](../../../ts/types/TCookieName.ts) — gained `"23_did"`

### Env var

`DEVICE_ID_ENCRYPTION_KEY` — 64 hex characters (32 bytes), `openssl rand -hex 32`. Declared in
[env.d.ts](../../../../env.d.ts). Set it in `.env.local` **and** in the production environment;
without it no visit is tracked (see the decisions below).

<br/>

---

## 2. Terminology

| Term             | Means                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| `userId`         | the Supabase account uuid, read from the verified session. Layer 0.                     |
| `deviceId`       | `23-<body>-<check>`. The identity itself, signed — see section 3.                        |
| `storedDeviceId` | the transport form of that id — the only shape localStorage and the browser see.         |
| `clientDeviceId` | what layer 1 sent this request, decoded. `null` when localStorage was empty.             |
| `fingerprint`    | sha256 of machine signals. `null` = not computed yet, `""` = computed and empty.         |
| trustworthy IP   | a parseable public address — not loopback, not a private range. See layer 3.             |
| write-back       | `syncDeviceIdLayers` — after resolving, every layer is re-pointed at the winning id.     |
| visitor day      | midnight-to-midnight in the visitor's own timezone — the window the dedup uses.          |

<br/>

---

## 3. How it works (ASCII)

### The deviceId itself

```
  23-Xk29vBq7mTz4LpR8nWc1s-7QF3KMBH
  ^^ ^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^
  |  body: 21 chars of      check: 8 chars of Crockford base32,
  |  [0-9a-zA-Z]            each one a byte of HMAC-SHA256(signing key, body) mod 32
  project prefix
```

Layer 1 is the only layer a visitor owns outright — a localStorage value their own devtools edit —
and its value becomes the `user_id` on a `utm_stats` row. Without the check, typing `23-whatever`
into localStorage was enough to invent visitors or write rows under someone else's id.

The check closes that. Deriving it takes one HMAC **with the signing key**; without the key the only
route is trying all 32⁸ combinations. `isValidDeviceId` re-derives the check from the body it was
handed and compares with `timingSafeEqual`, so a hand-typed id is refused and the visit falls through
to layers 2–4 as though localStorage had been empty.

The signing key is derived from `DEVICE_ID_ENCRYPTION_KEY` through its own HMAC rather than being a
second env var, so the encrypting use and the signing use never share raw key material.

Every deviceId goes through the check, not only layer 1's — the cookie and Redis values pass by
construction, and running them through as well is what retires the older `anonymousId_<uuid>` and
unsigned ids instead of letting them stay valid forever.

**This is a keyed check, not a character substitution table.** A fixed table would be readable off a
handful of real ids, and every visitor holds one of those in their own localStorage.

### Transport form — what localStorage actually holds

The check refuses a hand-typed id, but on its own it leaves the _shape_ on display: open devtools,
see `23-<21 chars>-<8 chars>`, and you know exactly what the server expects. So the value written to
localStorage is not the id — every character steps 3 places back through `TRANSPORT_ALPHABET`
(`0-9a-zA-Z-`, 63 characters) and the whole string is then reversed:

```
  signed id, server side   23-3gNLK4sp9SVtVHhyHDJmf-YK7332SS
  step 1  (-3 places)      -0X0dKIH1pm6PSqSEevEAGjcXVH400-PP    ← per character, wrapping at the alphabet ends
  step 2  (reverse)        PP-004HVXcjGAEveESqSP6mp1HIKd0X0-    ← what devtools shows
```

Note the `-` separators move: `-` sits at index 62, so the character that lands on it is whatever was
at index 2 (`"2"`), and the real separators step elsewhere. Nothing in the stored value marks where
the prefix, body and check begin.

`decodeDeviceId` undoes both steps before `isValidDeviceId` runs. The signed id never reaches the
browser: `trackVisitAction` answers with `{ storedDeviceId }`, the transport form, and that is the
only shape `useDeviceIdStore` ever holds.

**The step and the reversal are a fixed pair — two sample ids give them away.** They hide the
structure so there is nothing obvious to copy; they are not what makes an id unforgeable. The keyed
check is still the thing that accepts or refuses.

### Layer 0 — the signed-in account

Redis `utm:23:device-id:by-user-id:<account uuid>` → deviceId, `ex` 30 days, refreshed on every visit.

This layer goes **first** because it is the only exact signal here: the Supabase session already
proved who this is, while localStorage, the cookie, the IP and the fingerprint each only suggest it.

```
  someone clears site data on every single visit, but stays signed in
    layer 0 HIT every time ──► the same deviceId, one row per day, forever

  the same account signs in on a laptop it has never used
    layer 1 miss, layer 2 miss, layer 3 miss (a new address)
    layer 0 HIT ──► the same deviceId — not a second visitor
```

The account uuid is read server-side inside the action, through `getUser()`. It is never an argument
the browser sends — otherwise anyone could type someone else's uuid and write `utm_stats` rows under
their identity, which is exactly the hole the old `anonymousId` cookie left open.

30 days, refreshed on every visit, because an account is exact rather than a guess. The IP gets one
visitor day and the fingerprint 10 minutes, because both are guesses.

#### One device belongs to one account

Redis `utm:23:device-id:owner:<deviceId>` → the account uuid that claimed it, same 30 days.

Layer 0 is written back on every signed-in visit, and that write is what needed a guard. Two people
signing in on one shared laptop both resolve the **same** deviceId through layer 1 — which is right,
a machine is one visitor. Without the guard, the second account was mapped to that deviceId too, and
then carried it to their own phone through layer 0.

```
  shared family laptop, no owner check          shared family laptop, with the owner check
  ────────────────────────────────────          ──────────────────────────────────────────
  A signs in  ─► layer 1 gives X                A signs in  ─► layer 1 gives X
                 account A → X                                 owner of X = A,  account A → X
                                                               ✅ one visitor for the laptop
  B signs in  ─► layer 1 gives X                B signs in  ─► layer 1 gives X
                 account B → X                                 owner of X is A, so nothing is mapped
                 ✅ laptop is one visitor                       ✅ laptop is still one visitor
                                                               ✅ account B keeps no mapping
  B on their own phone
              ─► layer 0 gives X                B on their own phone
                 ❌ B's phone reports as A                  ─► layer 0 misses
                                                               ─► their own layers answer
                                                               ✅ B's phone is B
```

`claimDeviceIdForAccount` writes the owner key and the account mapping only when the device is
unclaimed, or already claimed by this same account.

The owner key expires 30 days after the owner's last visit, so a laptop the first person stopped
using becomes claimable by whoever actually uses it. Nothing has to be cleaned up by hand.

### Layer 1 — localStorage

`useDeviceIdStore`, a zustand store with `persist`, localStorage key `deviceIdStore`.

`UTMTracker` reads it with `.getState()` and sends it as the first argument of `trackVisitAction`. If
the server resolves a different id, the store is set to the returned transport form so the next visit
hits layer 1 again.

This is the only layer the browser itself owns, and the only one that survives across days without a
server round trip agreeing to it.

### Layer 2 — cookie

`23_did`, set by the server, never read by page JS:

- `httpOnly` — page JS has no access, so a script clearing localStorage leaves this intact
- `sameSite: "lax"`, `secure` in production
- value is `aes-256-gcm` over the deviceId, packed as `iv | authTag | ciphertext` in base64url
- expires at **midnight in the visitor's own timezone**, not 24h from now — so it ends at the same
  moment the daily dedup window does

Encrypted rather than stored as the readable id, because the cookie is the one layer a visitor pulls
off their own machine and hand-edits. `decryptDeviceId` returns null on a bad auth tag, so a tampered
cookie falls through to layer 3 and the edited value never reaches `utm_stats`.

### Layer 3 — IP

Redis `utm:23:device-id:by-ip:<ip>` → deviceId, expiring at midnight in the visitor's timezone.

Reached when both browser layers are empty — a visitor who cleared site data, or opened a private
window. It is also what catches the browser-switch case in production, since both browsers send the
same IP.

The address has to earn its way into a key. `getRequestIp` reads `x-real-ip` then `x-forwarded-for`,
both of which arrive with the request, so `isTrustworthyIp` refuses anything `net.isIP` will not
parse — otherwise a hand-written `x-forwarded-for: pick-me` becomes a key any number of people aim
at. Loopback and the private ranges (`10.`, `192.168.`, `172.16–31.`, `169.254.`, `fc00::/7`,
`fe80::`) are refused too: everyone behind one router shares them, so they name a household rather
than a visitor.

**This layer is a heuristic, not proof.** Two people behind the same NAT / CGNAT / office wifi can
receive the same deviceId if one clears storage right after the other visited. Accepted deliberately:
over-merging two visitors into one row is a smaller error than counting one visitor as a new person
every day.

### Layer 4 — fingerprint

Redis `utm:23:device-id:by-fingerprint:<sha256>` → deviceId, TTL **600s**.

The hash covers machine/OS/display signals only:

```
  screen.width x screen.height x screen.colorDepth
  Intl timezone
  navigator.language + navigator.languages
  navigator.hardwareConcurrency
  navigator.deviceMemory
  WEBGL_debug_renderer_info → UNMASKED_RENDERER_WEBGL
  canvas render hash (a fixed string drawn to a 220x30 canvas, toDataURL)
  navigator.platform
```

**No `navigator.userAgent`, deliberately.** This layer exists specifically to survive a visitor
switching browsers on the same machine — including a browser-level signal would change the hash the
moment the browser changes and defeat the one case it is for.

It is the last resort and the only layer that is not sent on every visit. See the flow below.

The value has to match `^[0-9a-f]{64}$` before it becomes a key. `computeFingerprint` only ever
returns a sha256 hex digest, but the value reaches the server as an action argument, so without the
shape check a caller sends a megabyte of text and has it written to Redis as a key.

### The two-phase request

The browser has no way to tell whether layers 0, 2 and 3 hit: the account and IP mappings sit in
Redis and the cookie is `httpOnly`. So the server asks for the fingerprint only when it needs one.

```
  visit
    │
    ├─ 1. trackVisitAction(storedDeviceId, params, url, timezone)   ← fingerprint arg omitted → null
    │        │
    │        ├─ layer 0/1/2/3 hit ► { storedDeviceId }  ─────────► done, one round trip
    │        │
    │        └─ all missed ──────► { needsFingerprint: true }
    │                                     │
    └─ 2. computeFingerprint()  ◄──────────┘     canvas + WebGL reads happen ONLY here
              │  .catch(() => "")
              │
              └─ trackVisitAction(..., fingerprint)   ← "" means tried and empty
                       │
                       ├─ layer 4 hit ──► { storedDeviceId }
                       └─ layer 4 miss ─► deviceId = createDeviceId()
```

The `null` vs `""` distinction on the `fingerprint` parameter is what ends the exchange: `null` means
"not computed yet, ask me", `""` means "computed and the browser gave nothing", so the server mints a
new id instead of asking a second time.

`TTrackVisitResult` is written out as `{ needsFingerprint: true } | { storedDeviceId: string }` rather
than inferred — an inferred union gives the first shape an optional `storedDeviceId?: undefined`, and
`"storedDeviceId" in trackVisitResp` then tells the client nothing about which shape it got.

### Write-back and dedup

Once an id is resolved, `syncDeviceIdLayers` re-points every layer at it:

- account key → deviceId, `ex` 30 days (skipped for a signed-out visitor, and for a device another
  account already claimed — see "One device belongs to one account" above)
- owner key → the account uuid, `ex` 30 days (written on the same condition)
- IP key → deviceId, `exat` midnight in the visitor's timezone (skipped for an untrustworthy IP)
- fingerprint key → deviceId, `ex` 600 (skipped when no fingerprint was sent — i.e. on every hit path)
- cookie re-set, but only when the existing one decrypts to a different id

Then one row per deviceId per visitor day: `utm_stats` is queried for a row with this `user_id`
created since `getVisitorDayStart(timezone)`, and the insert is skipped if one exists. Missing UTM
params default to `source: "organic"`, `medium: "direct"`. Finally `UTMTracker` strips the utm\_\*
query params with `history.replaceState` so a refresh does not re-attribute the visit.

<br/>

---

## 4. Decisions made AGAINST

- **Against putting the account uuid in `utm_stats.user_id`.** The account resolves *which deviceId*
  the visit belongs to (layer 0); the column keeps holding a signed deviceId. Writing the uuid there
  instead would count one person twice — once signed out, once signed in — and the uuid fails
  `isValidDeviceId`, so every layer would refuse it on the next visit and churn a fresh id each time.
  One id shape means the keyed check still guards the column.

  Consequence, unchanged: the dashboard's "Unique Users" card counts **devices**, not accounts — one
  person on a phone and a laptop is 2 while they are signed out. Once they sign in on both, layer 0
  merges them onto one deviceId and they become 1.

- **Against layer 0 being anywhere but first.** It was tempting to try localStorage first as the
  cheapest read. But then a person who clears site data every visit, or signs in on a borrowed
  machine, gets a new id even though the server already knew exactly who they were.

- **Against minting a fresh deviceId for the second account on a shared browser.** That was the first
  shape of the owner check, and it splits one laptop into two visitors — which contradicts the whole
  point of layer 4, where one machine is one visitor whatever browser it runs. Claiming only when the
  device is unclaimed keeps the laptop at one visitor and still stops the id spreading to the second
  person's own devices.

- **Against a reverse index of every device an account has used.** One owner per device answers the
  only question being asked — "may this account map itself to this device" — in one Redis read. A
  full account → devices set would need pruning and answers nothing extra.

- **Against unprefixed Redis keys.** Projects 14/19/23/28/29 are one group and share a single Upstash
  database, the same way they share `utm_stats`. Every key here therefore starts `utm:23:device-id`.
  Without the `23`, all five projects wrote the same `utm:device-id:by-ip:<ip>` — and because each
  project mints ids under its own prefix, each one read a value `isValidDeviceId` refuses and
  immediately overwrote it. Layers 0, 3 and 4 would have missed for every project on every visit.

  Nothing to migrate: the old unprefixed keys are simply never read again and expire on their own,
  the longest after 30 days.

- **Against trusting a `userId` argument from the browser.** It is read from the verified session
  inside the action, through `getUser()`. As a client argument, anyone could type someone else's uuid
  and write rows under it.

- **Against sending the fingerprint on every visit.** Canvas and WebGL reads cost real time on the
  main thread, and a returning visitor resolves on layer 1 without the value ever being read. It is
  computed only on the `needsFingerprint` path.

  Known consequence: the fingerprint key is written only on the miss path, so it expires 10 minutes
  after the last visitor who actually needed it. In production the IP layer covers the browser-switch
  case, so layer 4 is genuinely a last resort.

- **Against keeping the fingerprint in localStorage.** The fingerprint → deviceId mapping belongs in
  Redis alone, since the browser never reads it back for anything.

- **Against trusting `127.0.0.1` / `::1` as a key.** A VPS `next start` with no reverse proxy in front
  of it never sets `x-real-ip` / `x-forwarded-for`, so `getRequestIp` returns the same literal string
  for everyone. Keying Redis on it would hand every storage-wiped visitor whichever stranger's
  deviceId last wrote there.

- **Against a day-long TTL on the fingerprint mapping.** A fingerprint match is a probability — a
  different browser on similar hardware tells the server nothing definite. 10 minutes means a
  coincidental match bridges one short session rather than claiming someone else's deviceId for the
  rest of the day. The IP and cookie layers get the day-long expiry because they are stronger
  evidence.

- **Against `navigator.userAgent` among the signals.** See layer 4 — it would break the exact case the
  layer is for.

- **Against an unencrypted cookie.** It is the one layer the visitor hand-edits; the auth tag makes a
  tampered value fall through instead of being trusted.

- **Against a bare `anonymousId_<uuid>` / unsigned id.** The random part alone proves nothing about
  where the id came from, and layer 1 hands the server whatever localStorage holds. The check is what
  makes the id say "this server minted me". Cost of the change: every `anonymousId` cookie already in
  a visitor's browser fails the check once, so returning visitors are re-identified through layers
  2–4 or given a new id, and existing `utm_stats` rows keep their old `user_id` values.

- **Against a fixed character mapping.** The obvious cheap version of the same idea — map each body
  character to a check character through a lookup table — is readable off a handful of real ids, and
  every visitor holds one in their own localStorage. Only a keyed derivation keeps working after
  someone has seen valid examples.

- **Against letting one edited argument end the visit.** `timezone`, `fingerprint` and the IP headers
  all reach the server action from the browser. An unknown timezone threw a `RangeError` out of `Intl`
  before any row was written; `visitorDayBounds` now falls back to a 24h window. The other two are
  shape-checked before becoming Redis keys.

- **Against reading `DEVICE_ID_ENCRYPTION_KEY` at module import.** The action module is imported while
  the locale layout renders, so a throw at import over a missing env var would answer every page with
  a 500 instead of only stopping visit tracking. `deviceIdKeys.ts` reads the key on first use and
  `UTMTracker` catches the rejected action, so a missing key costs the `utm_stats` row and nothing
  else. The URL cleanup still runs.

- **Against `setAnonymousId` for UTM attribution.** The `anonymousId` cookie stays — `getUserId`,
  `useSender` and the rate limiter still use it — but it names a browser, not a device, and page JS
  writes it. It no longer decides who a visit belongs to.

### TODO

- [ ] Set `DEVICE_ID_ENCRYPTION_KEY` in the production environment. 🚨 Nikita — until then, deployed
      visits resolve no id and no `utm_stats` row is written.
- [ ] Backfill nothing. Rows written under the old `anonymousId_<uuid>` / account ids stay as they
      are; the dashboard counts them as their own visitors, so numbers before and after the switch are
      not comparable device-for-device.
- [ ] Consider a 5th layer keyed on `<ip>+<accept-language>` if NAT over-merging shows up as
      suspiciously round visit counts. Not done: no evidence yet, and it merges more, not less.

<br/>

---

## 5. Reproduction steps

```
  A0. signed in, on any machine, in any browser, with any storage state
     layer 0 HIT ──► the deviceId the account was last mapped to ──► 1 round trip
     the mapping is refreshed to 30 days on every visit

  A. returning visitor, signed out
     localStorage has storedDeviceId ──► layer 1 ──► 1 round trip, no fingerprint computed
     utm_stats: no new row if one already exists for this visitor day

  B. cleared site data, same IP, same day, signed out
     layer 1 miss (localStorage gone)
     layer 2 miss (cookie gone)
     layer 3 HIT  (utm:23:device-id:by-ip:<ip> still set until midnight in the visitor's timezone)
     ──► same deviceId, still 1 round trip, no fingerprint computed

  C. switched Chrome → Firefox, same machine, IP untrustworthy (local dev)
     layer 1 miss, layer 2 miss, layer 3 skipped (127.0.0.1)
     ──► { needsFingerprint: true }
     ──► computeFingerprint() ──► layer 4 HIT if Chrome's visit went through this same path
                                  within the last 10 min, else a NEW deviceId

  D. brand new visitor
     all 4 miss ──► deviceId = createDeviceId()  →  23-<body>-<check>
     ──► written to all layers, 1 utm_stats row inserted

  E. localStorage hand-edited to anything at all
     decodeDeviceId steps it back  ──► isValidDeviceId REFUSES
        "23-mine"                        wrong shape after decoding
        a copied real shape              check does not match its own body
        a real body + invented check     same
        one character of a real id       same
     ──► resolves through layers 2-4 exactly as in B/C/D
     ──► utm_stats never sees the typed value, and the real id is written back over it

  F. cookie hand-edited
     one character changed ──► aes-256-gcm auth tag fails ──► decryptDeviceId returns null
     ──► layer 2 behaves as though the cookie had been missing
```

The pure parts of A–F (mint, check, transport form, cookie encrypt/decrypt, IP refusals, visitor-day
bounds across 4 timezones) were exercised in node against the compiled modules — 50+ checks, all
passing. The Redis and Supabase steps need a running app and were not exercised here.
