# plan-01 — Language switcher: picking a language changes nothing

**Priority:** P1
**Screenshot:** `TODO/04.07.2026 at 16-47.png` — read it first
**Recommended model:** Sonnet · medium thinking — one-file fix, but task 1 verifies library internals before touching anything
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

Picking a language in the `LanguageDropdown` leaves the page in Finnish. Root cause candidate (unproven — task 1 proves it): `proxy.ts:37`

```ts
resolveLocaleFromRequest: () => "fi", // bybass default broser language settings to set default locale to be "fi"
```

This resolver returns `"fi"` on every request. The dropdown (`app/components/LanguageDropdown.tsx:51`) writes the `Next-Locale` cookie, then `router.replace` + `router.refresh` (`:57-58`) and expects the proxy to read that cookie on the next request. With `urlMappingStrategy: "rewrite"` (`proxy.ts:36`) the URL has no locale segment, so the cookie is the only signal — if the installed `next-international@^1.3.1` asks `resolveLocaleFromRequest` before (or instead of) the cookie, every request resolves back to `fi` and the switch is silently ignored.

## §1 Where it lives

| Piece | File |
| --- | --- |
| i18n middleware config (the suspect line) | `proxy.ts:33-38` |
| Dropdown that writes the cookie + navigates | `app/components/LanguageDropdown.tsx` |
| Locale definitions | `app/locales/config.ts`, `app/ts/types/i18n/TLocaleTag.ts` |
| i18n doc to update | `app/locales/dev_readme_i18n.md` |

## §3 Expected behavior

```
BEFORE                                     AFTER
[fi page] pick "English"                   [fi page] pick "English"
  cookie Next-Locale=en written              cookie Next-Locale=en written
  proxy resolves locale -> "fi" (forced)     proxy resolves locale -> cookie "en"
  page re-renders in Finnish  ✗              page re-renders in English  ✓
                                            first visit, no cookie -> "fi" (kept:
                                            browser language is still ignored)
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **Prove the cause.** Read the installed middleware source at `node_modules/next-international/dist/` (the `createI18nMiddleware` locale resolution) and report to Nikita: in `^1.3.1` with `urlMappingStrategy: "rewrite"`, is the `Next-Locale` cookie checked before or after `resolveLocaleFromRequest`? Quote the exact source lines. Do not change any file yet. STOP — show Nikita the finding and wait for his review.
2. **Fix per the finding.** Expected shape: the resolver reads the request cookie and returns its locale when it is one of `["fi","en","ru","se"]`, else `"fi"`:
   ```ts
   resolveLocaleFromRequest: request => {
     const cookieLocale = request.cookies.get("Next-Locale")?.value as TLocaleTag | undefined
     return cookieLocale && locales.includes(cookieLocale) ? cookieLocale : "fi" // default fi, browser language stays ignored
   }
   ```
   If task 1 shows the cookie already wins and the breakage sits elsewhere (e.g. the dropdown's `router.replace` path handling), report the corrected diagnosis first and agree the fix with Nikita before coding. STOP — show Nikita the diff and wait for his review.
3. **Docs.** Update `app/locales/dev_readme_i18n.md`: (a) how locale resolution works now (cookie first, `fi` fallback, browser language ignored); (b) write down the locale-line rule — all 4 locale files (`en/fi/ru/se.ts`) keep the same line count and every key sits on the identical line number in each file (they are 526 lines each today). STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- Fix lives in the proxy resolver ("Honor cookie in proxy") — the dropdown keeps writing the cookie; URLs stay unprefixed (`urlMappingStrategy: "rewrite"` stays).
- Default locale stays `fi` and browser language stays ignored — only the explicit cookie choice wins over it.

## Code patterns to follow

- `dev_readme-code-patterns.md` — all 15 rules (terminology bans incl. "can't"; no vague names).
- `good-bad-examples.md` — naming (`response` / `<fnName>Resp`), no 1-letter names (`request`, not `req`, exception: `e` for event).
- `app/locales/dev_readme_i18n.md` — the doc this plan updates.

Read them BEFORE coding; validate the final diff against them line-by-line before saying done; rewrite touched code to match where the file drifts.

➡️ Next plan: [plan-02-db-anonymous-tickets.md](plan-02-db-anonymous-tickets.md)
