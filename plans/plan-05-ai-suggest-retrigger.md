# plan-05 — AI suggest category: re-suggest after a manual dropdown change

**Priority:** P2
**Screenshot:** — (from `app/api/ai/suggest-category/dev_readme-ai-suggest-category.md` §5 TODO)
**Recommended model:** Sonnet · medium thinking — one state condition in one component, plus a doc update
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

Feature dev_readme §5 TODO: "Trigger suggest again if user manually changes the dropdown (currently once auto-assigned, changing title won't re-assign unless the key differs)."

Anchors in `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx`:
- `:221` — `const result = await aiSDK.suggestCategory({ title: trimmed })` (note: `result` also breaks the naming pattern — fix while here).
- `:235-245` — 800ms debounce keyed on the trimmed title; once a suggestion was applied for a given title key, the same key never re-runs — so after the admin manually picks another category, editing the title back (or a small edit producing the same key) leaves the manual pick frozen and no new suggestion happens.
- `:822` — "AI suggesting..." indicator.

## §1 Where it lives

| Piece | File |
| --- | --- |
| Suggest wiring (debounce, key check, apply) | `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx:100, 221, 235-245, 822` |
| SDK method | `app/sdk/AISDK/AISDK.ts` → `suggestCategory` |
| Rate limit for the endpoint | `app/sdk/RateLimitSDK/consts/RATE_LIMITS.ts` |
| Feature doc (§5 TODO to close) | `app/api/ai/suggest-category/dev_readme-ai-suggest-category.md` |

## §3 Expected behavior

```
BEFORE                                        AFTER
title typed -> AI assigns "Toys"              title typed -> AI assigns "Toys"
admin picks "Home" manually                   admin picks "Home" manually
admin edits title again                       admin edits title again (debounced 800ms)
  -> same title key -> no re-suggest ✗          -> re-suggest runs, dropdown updates ✓
                                              admin's manual pick is only overwritten
                                              AFTER a title edit that happened later
                                              than the pick (no surprise overwrite)
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **State condition.** Track "admin picked manually" (e.g. `manualCategoryPickRef` set by the dropdown's onChange, cleared by the next title edit). Re-suggest rule: a title edit AFTER a manual pick always re-runs suggest, even when the debounce key matches the previous one. Keep the 800ms debounce and the `:822` indicator untouched. Respect the deps rule (any local helper via ref, not in deps). STOP — show Nikita the diff and wait for his review.
2. **Pattern fix in passing.** Rename `const result` (`:221`) to `suggestCategoryResp` per `good-bad-examples.md` #9. STOP — show Nikita the diff and wait for his review.
3. **Docs.** Close §5's first checkbox in `dev_readme-ai-suggest-category.md` and describe the new rule in §3 (how it works) with a 3-line ASCII. STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- Re-suggest triggers on title edits that come after a manual pick — the manual pick itself never triggers a suggest (picking a category must not immediately fight the admin).
- Debounce stays 800ms; no new rate-limit budget (existing `RATE_LIMITS` entry covers it).

## Code patterns to follow

- `dev_readme-code-patterns.md` — rule 15 + deps-ref pattern, terminology bans.
- `good-bad-examples.md` — #9 (`<fnName>Resp` naming), #10 (deps ref pattern).
- `app/api/ai/suggest-category/dev_readme-ai-suggest-category.md` — the feature doc this plan updates.

Read them BEFORE coding; validate the final diff line-by-line before saying done; rewrite touched code to match where the file drifts.

➡️ Next plan: [plan-06-support-ui-overhaul.md](plan-06-support-ui-overhaul.md)
