# plan-03 — HamburgerMenu ecosystem links: transparent Jotion icon + UTM params

**Priority:** P2
**Screenshot:** `TODO/07.04.2026 at 18-41.jpg` — read it first
**Recommended model:** Sonnet · low thinking — an asset swap and three URL strings
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** Nikita provides the transparent `J.png` (tracker → Nikita-owned tasks)

## §0 Why

Screenshot annotations on the HamburgerMenu quick-links panel: "fix this white thing with .png" — the Jotion icon (`/projects/J.png`) renders as a white box on the dark panel because the image file has a white background; and "add utm for these" — the three outbound ecosystem links send no UTM params, so the receiving projects record those visits as organic instead of "sent by 23_store".

## §1 Where it lives

| Piece | File |
| --- | --- |
| Menu items (labels, hrefs, icon paths) | `app/components/Navbar/components/HamburgerMenu.tsx:17-39` |
| Jotion icon asset | `public/projects/J.png` |
| UTM meaning on the receiving side | `app/[locale]/(site)/stats/dev_readme-utm.md` (source/medium/campaign columns) |

## §3 Expected behavior

```
BEFORE                                   AFTER
[⬜ J] Jotion  -> https://jotion.jokik.fi  [🟦 J] Jotion (transparent icon)
                                          -> https://jotion.jokik.fi?utm_source=23_store
                                             &utm_medium=hamburger_menu&utm_campaign=ecosystem
(same for music.jokik.fi and jompanion.jokik.fi)
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **Icon.** After Nikita drops the transparent `J.png` into `public/projects/` (his tracker task): verify the menu rendering; if the transparent icon's edges look hard on the dark row, add `rounded` to the icon's `Image` className — nothing else. STOP — show Nikita the result and wait for his review.
2. **UTM.** Append `?utm_source=23_store&utm_medium=hamburger_menu&utm_campaign=ecosystem` to the three hrefs at `HamburgerMenu.tsx:20`, `:27`, `:34`. Keep them plain strings in the `menuItems` array (three URLs are readable as-is; a builder function would be more code than the data). STOP — show Nikita the diff and wait for his review.
3. **Docs.** Update `app/components/Navbar/components/dev_readme.md`: one line on the ecosystem quick links — where they live, that every link sends the UTM params above, and that icons are transparent PNGs in `public/projects/`. STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- UTM values, from the answered question: `utm_source=23_store`, `utm_medium=hamburger_menu`, `utm_campaign=ecosystem` — same three params on all three links.
- The icon fix is an asset replacement, not CSS masking.

## Code patterns to follow

- `dev_readme-code-patterns.md` — rule 9 (no exported className consts), rule 1 (concise).
- `good-bad-examples.md` — no throwaway const aliases (write the full URLs in place).

Read them BEFORE coding; validate the final diff line-by-line before saying done.

➡️ Next plan: [plan-04-replenishment-button.md](plan-04-replenishment-button.md)
