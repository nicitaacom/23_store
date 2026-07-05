# plans — tracker

One plan file per feature/fix. This tracker is the ONLY place where statuses live — plan headers point here so the two never drift.

## Rules (apply to EVERY plan)

1. **ONE TASK AT A TIME.** Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves. Review phrase from Nikita: **"approved - continue"**.
2. **Recommended model + thinking effort** are in each plan's header — start the implementing chat with that model.
3. **Every plan follows the code patterns**: read `dev_readme-code-patterns.md` (all 15 rules, incl. the banned-words list) + `good-bad-examples.md` BEFORE coding; validate the diff against them line-by-line before saying done; where a touched file drifts from the patterns, rewrite it to match.
4. **Deleted screenshot = done.** If a screenshot referenced by a plan is removed from `TODO/`, that task is finished — drop it without asking.
5. **UI plans** also create/update `dev_readme-ui-<feature>.md` (style recipes with examples) in the same sub-task as the styles it describes, + a row in the CLAUDE.md map.
6. **Every plan's final task documents the feature**: update the feature's dev_readme(s) so the docs match the shipped code — Nikita, verbatim: "AI in plan should be a step to document each feature with dev_readme and make sure that it's up to date".
7. Statuses update HERE only: `waiting` → `in progress` → `done` (or `blocked: <reason>`).

## Plans (build order: small fixes first, then the arcs)

| # | Plan | Priority | Model · thinking | Status | Depends on |
| --- | --- | --- | --- | --- | --- |
| 01 | [plan-01-language-switcher.md](plan-01-language-switcher.md) | P1 | Sonnet · medium | done | — |
| 02 | [plan-02-db-anonymous-tickets.md](plan-02-db-anonymous-tickets.md) | P1 | Sonnet · medium | waiting | — |
| 03 | [plan-03-ecosystem-links-icon-utm.md](plan-03-ecosystem-links-icon-utm.md) | P2 | Sonnet · low | done | — |
| 04 | [plan-04-replenishment-button.md](plan-04-replenishment-button.md) | P2 | Sonnet · medium | waiting | — |
| 05 | [plan-05-ai-suggest-retrigger.md](plan-05-ai-suggest-retrigger.md) | P2 | Sonnet · medium | waiting | — |
| 06 | [plan-06-support-ui-overhaul.md](plan-06-support-ui-overhaul.md) | P1 | Opus · high | done | — |
| 07 | [plan-07-support-prefilled-message.md](plan-07-support-prefilled-message.md) | P2 | Sonnet · low | waiting | plan-06 |
| 08 | [plan-08-i18n-sweep.md](plan-08-i18n-sweep.md) | P2 | Sonnet · medium | waiting | plan-06 (touches same files) |
| 09 | [plan-09-utm-stats-hardening.md](plan-09-utm-stats-hardening.md) | P3 | Opus · medium | waiting | — |
| 10 | [plan-10-faceit-oauth.md](plan-10-faceit-oauth.md) | P3 | Opus · high | waiting | — |

Priority note: no screenshot appears twice in `TODO/`, so the duplicate-screenshot rule (2 = P1, 3+ = P0) sets nothing — P1 here means "blocks users or is the main asked-for work".

## Screenshot map (`TODO/`)

| Screenshot | Goes to |
| --- | --- |
| `04.07.2026 at 16-36.png` (support UI broken, no image fallback) | plan-06. Note: navbar overlap, sidebar hover, UUID titles and the refresh race were already fixed in the session of 05.07.2026 — the fallback + overall look remain. |
| `04.07.2026 at 16-47.png` (changing languages does nothing) | plan-01 |
| `07.04.2026 at 18-41.jpg` (white icon box + add UTM) | plan-03 — code+docs done; delete this screenshot once you confirm the transparent icon on the page. |
| `07.06.2026 at 21-54.png` (save button should be disabled without changes) | **Nikita-owned**: code already has `disabled={isSaving \|\| !hasChanges}` at `app/[locale]/(site)/products/[productId]/manage/ManageProductView.tsx:537` — verify on the page, then delete the screenshot. |
| `make-it-so-I-can-change-db.jpg` (import blocked by sender_id constraint) | plan-02 |

## Nikita-owned tasks (no plan file — test-only / assets / decisions)

- [ ] Verify the manage-page save button stays disabled until a change is made, then delete `TODO/07.06.2026 at 21-54.png`.
- [ ] Verify the transparent Jotion icon + UTM links on the hamburger menu, then delete `TODO/07.04.2026 at 18-41.jpg`.
- [ ] Screenshots promised in docs: categories dev_readme §1.1/§1.4, category-views rows, UTM `./img/` placeholders.
- [ ] After each implemented plan: run the app and check the affected pages (styles compile per page request — reload the page once after a dev-server restart before judging).

## TODO — considering (no FOR/AGAINST decision yet — not planned)

- Subcategory with multiple parents → many-to-many join table (categories dev_readme §5). Blocked by: name UNIQUE constraint.
- Count clicks on subcategory buttons too, not only root category buttons (category-recommendations dev_readme §7).
- "Reset preferences" in user settings (category-recommendations dev_readme §7, low priority).

## DEV_README inconsistencies audit (found 05.07.2026, fixes assigned to plans)

| Doc claim | Reality | Fixed by |
| --- | --- | --- |
| `dev_readme-backup.md:137` — "23_messages.sender_id … no auth FK, so they always restore" | Live DB rejects import with `23_messages_sender_id_fkey` (screenshot) | plan-02 task 4 |
| `dev_readme-backup.md` `BACKUP_TABLES` lists 5 tables | `dev_readme-supbase-sql.md:323` restore order lists 7 (incl. `23_categories`, `23_category_views`) | plan-02 task 4 (docs aligned; code change = Nikita's call) |
| `app/[locale]/(support)/support/tickets/components/dev_readme.md` documents `TicketsList.tsx` | No such file exists | plan-06 docs sub-task |
| `app/locales/dev_readme_i18n.md` — locale-line rule is not written down | All 4 locale files are exactly 526 lines; keys sit on identical line numbers | plan-01 task 3 |
| `app/api/admin/backfill-categories/route.ts` + backfill button (categories dev_readme §5 says "delete after run") | Both already deleted; only the unused `category.backfill_button` locale keys remain (`app/locales/en.ts:524`) | plan-08 task 3 |
