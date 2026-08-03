# Keys check — are the API keys still valid?

## 0. Why this exists

A third party revokes an API key and nothing tells you. Tinify resets a quota, Stripe rotates a key,
Google suspends a project, someone edits a value on Vercel and drops a character.

The first report you get today is a buyer hitting a 500.

Two runs now ask the question instead:

- **on push** — every 3 days, against the local dotenv file, before the code leaves your machine
- **weekly in prod** — against the real Vercel values, because those are a separate copy that drifts

## 1. How it looks

A run prints one line per name, with how long that name took:

```
checking 38 names — every "live" one sends a real request
   1/38      1ms  ✔ UPSTASH_REDIS_REST_URL
   6/38    288ms  ✔ NEXT_PUBLIC_SUPABASE_URL
   7/38    294ms  ✘ NEXT_PUBLIC_SUPABASE_ANON_KEY — 401 {"message":"Invalid API key"}
  38/38   2168ms  ✔ NEXT_PUBLIC_PRODUCTION_URL

1 name needs you:
  ✘ NEXT_PUBLIC_SUPABASE_ANON_KEY — 401 {"message":"Invalid API key"}
```

The elapsed column is there because a slow network and a revoked key look identical without it. A
revoked key answers in under a second; anything sitting at the timeout is the network, not the key.

### Files

| File | Holds |
| --- | --- |
| [app/utils/checkKeys.ts](../../../utils/checkKeys.ts) | the 3 CAPS consts, the registry of 38 names, every probe, `runKeyChecks()` |
| [app/ts/types/TKeyProbe.ts](../../../ts/types/TKeyProbe.ts) | one registry entry |
| [app/ts/types/TKeyCheckReport.ts](../../../ts/types/TKeyCheckReport.ts) | what a run answers |
| [app/libs/keysCheckRedis.ts](../../../libs/keysCheckRedis.ts) | the three Upstash keys the prod run remembers |
| [route.ts](route.ts) | the webhook Supabase pg_cron sends a request to |
| [tests/keys.test.mjs](../../../../tests/keys.test.mjs) | `pnpm test:keys` — one test per name + 3 drift tests |
| [tests/pushKeyCheck.mjs](../../../../tests/pushKeyCheck.mjs) | what `.githooks/pre-push` runs |
| [tests/alias-hook.mjs](../../../../tests/alias-hook.mjs) | teaches node the `@/` alias that tsconfig gives TypeScript |
| [app/utils/checkKeys.test.ts](../../../utils/checkKeys.test.ts) | vitest cases for the quiet rules and presence |

### Types

```ts
// app/ts/types/TKeyProbe.ts
type TKeyProbe = {
  name: string
  tier: "live" | "shape" | "skip"
  optionalWhen?: string
  check?: (value: string) => Promise<string | null> | string | null
}

// app/ts/types/TKeyCheckReport.ts
type TKeyCheckReport = {
  ok: boolean
  failures: { name: string; reason: string }[]
  liveCount: number
  shapeCount: number
  skipCount: number
  ranAt: string
}
```

### Where the state lives

```
.git/keys-check-stamp                  ISO timestamp of the last green push-time run
                                       inside .git, so no .gitignore line and no fresh clone
                                       inherits a stale one

Upstash (shared by 14/19/23/28/29)
  keys-check:23:last-run               ISO timestamp — the PROD_CHECK_EVERY_DAYS gate reads this
  keys-check:23:last-report            the whole last report, readable without a run
  keys-check:23:last-alert             { names, sentAt } — what was already reported

app/utils/checkKeys.ts
  PUSH_CHECK_EVERY_DAYS = 3            the pre-push gate
  PROD_CHECK_EVERY_DAYS = 7            the webhook gate
  REALERT_AFTER_DAYS   = 28            how often an unfixed name is repeated
```

`23` is in every Redis key because projects 14/19/23/28/29 share one Upstash database — the same
reason `utm:23:device-id` has it. Without the number, `14_portfolio`'s weekly run would overwrite this
project's timestamp and each project would read the other's state as its own.

None of the three Redis keys expire. A timestamp that quietly disappears restarts the 7-day clock and
hides a cron that stopped firing, which is the one thing they exist to make visible.

## 2. Terminology

**Presence runs first, for every name, whatever its tier.** An absent or empty value fails right
there and the probe below is never attempted. That is what catches a name declared in `.env.example`
and never set on Vercel.

| Tier | Runs after presence passes | Fails on |
| --- | --- | --- |
| **live** | A real request to the service | a 401 or 403 answer |
| **shape** | No service to ask, so the value's own format is read (length, prefix, hex) | a wrong format |
| **skip** | Nothing beyond presence | nothing |

- **live per index** — `TINIFY_API_KEY_ARR` holds several keys, and the report names the failing one:
  `TINIFY_API_KEY_ARR[2] — 401`.
- **`optionalWhen`** — for a pair where the code reads either one: an empty value passes while its
  partner holds one, and both empty fails on both lines. **No name uses it today.** It was written for
  `PINECONE_HOST` / `PINECONE_ENVIRONMENT`, since `getPineconeHost` in
  [app/libs/ai/chatMemory.ts](../../../libs/ai/chatMemory.ts) reads `PINECONE_HOST || PINECONE_ENVIRONMENT`,
  and then `PINECONE_HOST` was dropped from `env.d.ts` so `PINECONE_ENVIRONMENT` is simply required.
  The field and its two test cases stay for the next such pair — delete them if none turns up.

## 3. How it works

### The push run

```
git push
  │
  └─ .githooks/pre-push  →  tests/pushKeyCheck.mjs
       │
       ├─ .git/keys-check-stamp newer than PUSH_CHECK_EVERY_DAYS (3)?
       │    └─ yes → "keys checked 1d ago, next check in 3 days" → push continues
       │
       └─ no → run every probe
                ├─ all pass → write the stamp → push continues
                └─ any fail → print the names → push continues anyway
                              stamp NOT written, so the next push tries again
```

**It never stops a push.** Around 100 commits a day go through here, and a third party having a 500
for ten minutes is not a reason to block your work.

### The prod run

```
Supabase pg_cron 'keys_check'  '0 4 * * *'   (daily — the const decides)
  │
  └─ pg_net → POST /api/webhooks/check-envs
                Authorization: Bearer <CRON_SECRET from the Vault>
                │
                ├─ secret wrong                     → 401
                ├─ CRON_SECRET missing on Vercel    → 503
                ├─ last run inside 7 days           → 200 {"skipped":true}
                │
                └─ otherwise run every probe
                     ├─ SET keys-check:23:last-run + :last-report
                     ├─ all pass → 200 {"ok":true,"checked":38}
                     └─ any fail → shouldSendKeyAlert() decides
```

### When it breaks silence

`shouldSendKeyAlert` in `app/utils/checkKeys.ts`:

```
failing names            last alert                       →  what happens
───────────────────────────────────────────────────────────────────────────
[OPENAI]                 none                             →  SEND, that is news
[OPENAI]                 [OPENAI] 1 day ago               →  quiet
[OPENAI, TELEGRAM]       [OPENAI] 1 day ago               →  SEND, a new name joined
[OPENAI]                 [OPENAI, TELEGRAM] 1 day ago     →  SEND, the picture changed
[OPENAI]                 [OPENAI] 27 days ago             →  quiet
[OPENAI]                 [OPENAI] 29 days ago             →  SEND, the 28-day reminder
[OPENAI]                 [OPENAI] "not-a-date"            →  SEND, never stay quiet on bad state
```

Without the second row, one revoked key sends a message every single week until you fix it, and a
report you have already read teaches you to ignore the next one.

### One notification, not two

An alert goes to **Telegram first, and to email only when Telegram did not land**:

```
alertOwner()
  │
  ├─ sendTelegramMessage()  →  ok        →  done, no email  { telegramSent: true,  emailSent: false }
  │                            refused   ─┐
  │                            threw     ─┤
  │                                       │
  └─ resend.emails.send() ────────────────┘  →  sent      { telegramSent: false, emailSent: true  }
                                              →  failed   { telegramSent: false, emailSent: false }
```

- Telegram, via `sendTelegramMessage` in [app/utils/sendTelegramMessage.ts](../../../utils/sendTelegramMessage.ts)
- email to `NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL`, sent from `NEXT_PUBLIC_SUPPORT_EMAIL`

**Why not both.** One broken key is worth one notification. A second copy of a message you already
read is noise, and two channels saying the same thing is what teaches you to stop opening either. The
email is not a duplicate — it is the way through for the case Telegram itself is the thing that is down.

Nothing throws out of `alertOwner`. A failed send must not answer the cron with a 500, because the run
itself succeeded and its result is already in Redis. The JSON answer reports which channel was used.

### The drift triangle

Three files have to agree on which names exist. Each edge is enforced:

```
        env.d.ts
        ╱      ╲
       ╱        ╲   eslint local-rules/envs-order
      ╱          ╲
.env.example ──── the registry in app/utils/checkKeys.ts
             ╲   ╱
              ╲ ╱   the 3 drift tests in tests/keys.test.mjs
```

Add a name to `.env.example` and forget the registry → `pnpm test:keys` fails with
`declared in .env.example but missing from app/utils/checkKeys.ts`. Add it to `env.d.ts` only →
`envs-order` warns. There is no way to add a variable and leave it unchecked.

## 4. TODO and decisions made AGAINST

### Reproduction steps

**Prove the push guard works:** `git push` twice in a row. The second prints
`keys checked today, next check in 3 days` and pushes without a single request.

**Prove a revoked key is caught:** change one character of `OPENAI_API_KEY` in the local dotenv file,
run `pnpm test:keys` → `✘ OPENAI_API_KEY — 401 Incorrect API key provided`. Put the character back.

**Prove the prod gate works:** send the curl twice. First answers `{"ok":true,"checked":38}`, second
answers `{"skipped":true,"daysSinceLastRun":0}`.

### Decisions made AGAINST

- **Cypress** — it drives a browser for UI flows. Asking Stripe "is this key valid" is one HTTP
  request from node. It also needs `env -u ELECTRON_RUN_AS_NODE` on this machine.
- **A vitest test for the live run** — `vitest.config.ts:48` globs `app/**/*.test.ts`, so a
  live-network file would run on every `pnpm test:unit`. The live run is `node --test` and lives in
  `tests/`, outside that glob. Only the pure logic is under vitest.
- **The `dotenv` package** — `node --env-file` reads the same format, built into node since 20.6.
- **A Supabase table for the run history** — the three Upstash keys need no migration and no
  `types_db.ts` edit, and every project already holds Upstash names.
- **A weekly `'0 4 * * 1'` cron string** — then the cadence lives in two places and they drift.
  The cron fires daily and `PROD_CHECK_EVERY_DAYS` is the only gate.
- **A weekly "all good" message** — silence is the healthy state. 52 messages a year that always say
  the same thing train you to stop reading them.
- **Stopping a push on a failing key** — see the push run above.
- **Pinning the exact success status in a probe** — probes that send a deliberately incomplete request
  key off `401`/`403` instead, through `passUnlessRejected`. A Tinify key that used up its monthly
  compressions answers `429` and is still a valid key.

### Known gaps

- **A stopped cron is invisible.** Nothing yet reads `keys-check:23:last-run` and complains that prod
  has not reported in over 10 days. The plan is for the pre-push run to check it and print a warning.
- **`19_spotify-clone` and `26_hot-delivery` are parked.** `19_spotify-clone` has no Telegram names
  declared, so it needs `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` before its alerts work.
