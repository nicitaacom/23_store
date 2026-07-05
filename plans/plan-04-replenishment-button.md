# plan-04 — RequestReplanishmentButton: email body is empty + request counter

**Priority:** P2
**Screenshot:** — (from code TODOs)
**Recommended model:** Sonnet · medium thinking — small surface, but task 1 must reproduce a React warning inside react-email rendering before any fix
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

`app/[locale]/(site)/components/Product/RequestReplanishmentButton.tsx`:

- `:17-31` — the email render is commented out behind `// TODO - fix error about keys in react here`, so the `html` state stays `""` forever and `:36-40` sends the owner an **empty email body** today.
- `:42` — `// 3. TODO - Add amount of requests about replanishment` (GitHub project item linked at `:43`): the owner has no signal how many buyers asked.
- Side notes for the fix: the effect at `:17-31` has an `eslint-disable exhaustive-deps`, and the toasts at `:26/:46/:48` are hardcoded English with typos ("onwer", "taht") — translating them belongs to plan-08, not here.

## §1 Where it lives

| Piece | File |
| --- | --- |
| The button + commented render + TODOs | `app/[locale]/(site)/components/Product/RequestReplanishmentButton.tsx` |
| Email template being rendered | `app/emails/` → `RequestReplanishmentEmail` (find exact file by import) |
| Send method | `app/sdk/EmailsSDK/EmailsSDK.ts` → `sendRequestReplanishmentEmail` |
| Email templates doc | `app/emails/dev_readme.md` |

## §3 Expected behavior

```
BEFORE                                    AFTER
click -> sendRequestReplanishmentEmail    click -> email body = rendered
         html: ""  (empty email) ✗                 RequestReplanishmentEmail ✓
owner sees no demand signal               owner/UI can read how many buyers asked
                                          for this product (counter increases per click)
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **Reproduce the keys warning.** Un-comment the `renderAsync` block locally, run `pnpm type-check` and render the template (a small node script or the existing email preview flow per `app/emails/dev_readme.md`), and capture the exact React warning text. Locate the array/list markup inside `RequestReplanishmentEmail` that misses a stable `key`. Report warning + file:line to Nikita. Do not fix yet. STOP — show Nikita the finding and wait for his review.
2. **Fix the render.** Add the missing `key` in the template markup (not a `key` on the top-level `renderAsync` call — that one does nothing there and gets removed). Restore the effect without the eslint-disable: the effect body only needs `product`, and per the deps rule any helper stays out of the deps array (ref pattern from `good-bad-examples.md` #10 if a local function is involved). Confirm the sent email now has the rendered body. STOP — show Nikita the diff and wait for his review.
3. **Request counter — propose storage first.** Two shapes, recommend (a):
   (a) column `replanishment_requests_count INTEGER NOT NULL DEFAULT 0` on `23_products`, increased in the same click handler via an SDK method following the verb table (`updateDB...`);
   (b) separate table with one row per request (needed only if per-user dedupe/history matters).
   Present both with the FOR/AGAINST to Nikita — schema changes only after his pick. STOP — wait for his decision.
4. **Implement the picked storage + show the number** (e.g. next to the button label), plus the SQL block for `dev_readme-supbase-sql.md` (copy-paste-ready, per the project's SQL-doc convention). Leave the toast strings untouched — plan-08 translates them. STOP — show Nikita the diff and wait for his review.
5. **Docs.** Update `app/emails/dev_readme.md` (if the template changed in task 2) and the product-components docs so the replenishment flow (render → send → counter) is written down and current. STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- Empty-email bug and the counter are fixed in this one plan (both TODOs sit in the same file).
- Toast/i18n strings here are NOT translated in this plan → plan-08.
- Counter storage shape is decided at task 3's STOP — a genuine ship-decision, kept open on purpose.

## Code patterns to follow

- `dev_readme-code-patterns.md` — rule 15/`good-bad-examples.md` #10 (no local functions in deps → ref), rule 13 (no 1-letter names), verb table for the SDK method name.
- `good-bad-examples.md` — `response` naming for the update call.
- `app/emails/dev_readme.md` — template conventions.

Read them BEFORE coding; validate the final diff line-by-line before saying done; rewrite touched code to match where the file drifts.

➡️ Next plan: [plan-05-ai-suggest-retrigger.md](plan-05-ai-suggest-retrigger.md)
