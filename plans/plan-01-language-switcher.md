# plan-01 — Language switcher: picking a language changes nothing

**Priority:** P1
**Screenshot:** `TODO/04.07.2026 at 16-47.png` — read it first
**Recommended model:** Sonnet · medium thinking — one-file fix, but task 1 verifies library internals before touching anything
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

**CORRECTED DIAGNOSIS (05.07.2026, proven via source + live production repro — see below). The original root-cause candidate below is DISPROVEN. Do not implement the original fix in §4 task 2 as originally written.**

Picking a language in the `LanguageDropdown` leaves the page on whatever locale it was already on before the click (confirmed inconsistent across repro attempts: landed on `ru` once, `fi` another time — never the newly picked locale, and not a fixed forced value either).

**Original candidate, partially disproven:** `proxy.ts:37`
```ts
resolveLocaleFromRequest: () => "fi", // bybass default broser language settings to set default locale to be "fi"
```
Read from the installed library source (`node_modules/next-international/dist/app/middleware/index.js:76-78`): the `Next-Locale` cookie is always checked *first*; `resolveLocaleFromRequest` only runs as a fallback when no cookie exists. **This line is not dead** — confirmed live: deleting the `Next-Locale` cookie then picking a language lands on `fi` every time, because with no cookie yet in flight, resolution falls straight through to this hardcoded resolver. So this line is the correct explanation ONLY for the no-cookie case (first-ever visit, or immediately after the cookie is cleared) — it is not, on its own, why the switch fails when a cookie already exists.

**Real root cause of the general case (cookie already exists, picking a different language): a client-side race between the cookie write and Next.js's own background prefetching.**

- [LanguageDropdown.tsx:51](../app/components/LanguageDropdown.tsx#L51) writes the new locale via a bare `document.cookie = "Next-Locale=..."` assignment, then immediately calls `router.replace()` + `router.refresh()` (lines 57-58).
- Live production repro (`pnpm start`, DevTools Network tab) showed **30+ simultaneous `_rsc=` requests** fire off a single dropdown click (pagination/modal prefetches, all initiated by the same client bundle).
- Any of those in-flight/prefetched requests that reads the cookie *before* the fresh `document.cookie` write is visible to it gets a response resolved against the **old** locale. Per the library's `addLocaleToResponse` (`middleware/index.js:95-102`), that response's `Set-Cookie: Next-Locale=<old>` header then overwrites the just-written cookie back to the old value.
- Confirmed directly: cookie jar (Application → Cookies) showed only one `Next-Locale` row (`Path=/`, no stale duplicate) whose value flipped back to the *pre-click* locale after switching — and the matching response's `Set-Cookie` + `X-Next-Locale` headers both showed that same pre-click locale, not the new pick. This is the server actively reverting the choice, not merely ignoring it.

This means the fix needs to make the locale switch atomic/authoritative (e.g. set the cookie via a server response so no concurrent client-side fetch can win the race and clobber it), not a change to `resolveLocaleFromRequest`.

## §1 Where it lives

| Piece | File |
| --- | --- |
| i18n middleware config (the suspect line) | `proxy.ts:33-38` |
| Dropdown that writes the cookie + navigates | `app/components/LanguageDropdown.tsx` |
| Locale definitions | `app/locales/config.ts`, `app/ts/types/i18n/TLocaleTag.ts` |
| i18n doc to update | `app/locales/dev_readme_i18n.md` |

## §3 Expected behavior

```
BEFORE                                          AFTER
[ru page] pick "Svenska"                        [ru page] pick "Svenska"
  cookie Next-Locale=se written (client-side)      cookie Next-Locale=se written
                                                     (authoritatively, server response)
  ~30 background _rsc= prefetches fire in            no concurrent fetch can read/write
  parallel, some still holding the old "ru"           Next-Locale before this one lands
  cookie in flight
  one of those responses' Set-Cookie:                page re-renders in Swedish  ✓
  Next-Locale=ru overwrites the fresh "se"
  page re-renders in Russian (or whatever the      first visit, no cookie -> "fi"
  pre-click locale was)  ✗                          (kept: browser language ignored)
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. ~~Prove the cause.~~ **DONE (05.07.2026).** Read the installed middleware source (`node_modules/next-international/dist/app/middleware/index.js:76-78`): the `Next-Locale` cookie is checked before `resolveLocaleFromRequest` — confirmed via source. Live production repro (`pnpm start`) then confirmed the real cause is the client-side prefetch race described in §0, not the resolver. No file changed during this task.
2. ~~Fix the race.~~ **DONE (05.07.2026), shipped differently than originally proposed here.** Instead of hand-rolling an authoritative server-side cookie write, `LanguageDropdown.tsx` now uses `next-international`'s own `useChangeLocale()` hook (`app/locales/client.ts:9`, exported but previously unused). That hook navigates via `push("/${newLocale}${path}")` and never touches `document.cookie` itself — the middleware's own `addLocaleToResponse` sets the `Next-Locale` cookie from the URL segment on the resulting request. Removing the hand-written `document.cookie` assignment removes the race entirely (there is no longer a separate client-side write for a background prefetch to clobber). `stripLocalePrefix` and the manual `router.replace`/`router.refresh` calls were deleted as dead code once `useChangeLocale` replaced them.
3. **Docs.** Update `app/locales/dev_readme_i18n.md`: (a) how locale switching actually works now (`useChangeLocale()` pushes a locale-prefixed URL; middleware sets the cookie from that URL; no client-side cookie write); (b) the race-condition bug this replaced, for anyone who finds a hand-rolled cookie write again in the future; (c) write down the locale-line rule — all 4 locale files (`en/fi/ru/se.ts`) keep the same line count and every key sits on the identical line number in each file (they are 526 lines each today). STOP — show Nikita the diff and wait for his review.
4. ~~Hover contrast fix.~~ **DONE (05.07.2026).** Added 05.07.2026 per `public/docs/i18n/LanguagesDropdown.png` — the non-active row hover state at `LanguageDropdown.tsx:78` (`hover:bg-foreground/10`) was barely visible against the dark dropdown panel. Tried `hover:bg-foreground/45` (DropdownItem.tsx's convention) — still invisible, because `--foreground` is only 16% lightness in dark mode, barely lighter than the 7% panel background regardless of opacity. Landed on `hover:bg-foreground-accent` (25% lightness in dark mode), matching the existing convention in `HamburgerMenu.tsx:108/122` and `PayWithMetamaskButton.tsx:223` for row/item hover on a dark panel. Also added a hover state to the *selected* row (previously had none): `hover:bg-brand/25`, a deeper shade of the same brand tint used for the selected state (`bg-brand/15`), following the base→hover step-up convention already used in `Button.tsx:16` (`bg-brand/12` → `hover:bg-brand/18`).

## Decisions made (do not re-open)

- ~~Fix lives in the proxy resolver ("Honor cookie in proxy")~~ — **SUPERSEDED 05.07.2026**: disproven by source + live repro, see §0. Fix now lives in how `LanguageDropdown.tsx` writes the cookie (must become race-proof against background prefetches), not in `proxy.ts`.
- `urlMappingStrategy: "rewrite"` stays; the dropdown keeps writing a `Next-Locale` cookie (mechanism of the write changes per task 2, the cookie itself does not go away).
- Default locale stays `fi` and browser language stays ignored — only an explicit, successfully-applied cookie choice wins over it.

## Code patterns to follow

- `dev_readme-code-patterns.md` — all 15 rules (terminology bans incl. "can't"; no vague names).
- `good-bad-examples.md` — naming (`response` / `<fnName>Resp`), no 1-letter names (`request`, not `req`, exception: `e` for event).
- `app/locales/dev_readme_i18n.md` — the doc this plan updates.

Read them BEFORE coding; validate the final diff against them line-by-line before saying done; rewrite touched code to match where the file drifts.

➡️ Next plan: [plan-02-db-anonymous-tickets.md](plan-02-db-anonymous-tickets.md)
