# plans — tracker

One plan file per feature/fix. This tracker is the ONLY place where statuses live — plan headers point here so the two never drift.

## Rules (apply to EVERY plan)

1. **ONE TASK AT A TIME.** The levels, so they never get confused:

   ```
   this tracker   ->  TODO   (one row per plan/feature)
     plan-NN-*.md ->  tasks  (the numbered steps in its §4)
       a big task ->  sub-tasks
   ```

   The rule gates **TODO rows**: one plan per chat, never wander into a different feature. Inside one
   plan, run every task and sub-task in one go and show the full diff at the end. Stop mid-plan only
   for a real blocking decision. A side quest that is a different feature gets its own chat and a
   hand-off prompt.
2. **Recommended model + thinking effort** are in each plan's header — start the implementing chat with that model.
3. **Every plan follows the code patterns**: read `dev_readme-code-patterns.md` (all 15 rules, incl. the banned-words list) + `good-bad-examples.md` BEFORE coding; validate the diff against them line-by-line before saying done; where a touched file drifts from the patterns, rewrite it to match.
4. **Deleted screenshot = done.** If a screenshot referenced by a plan is removed from `TODO/`, that task is finished — drop it without asking.
5. **UI plans** also create/update `dev_readme-ui-<feature>.md` (style recipes with examples) in the same sub-task as the styles it describes, + a row in the CLAUDE.md map.
6. **Every plan's final task documents the feature**: update the feature's dev_readme(s) so the docs match the shipped code — Nikita, verbatim: "AI in plan should be a step to document each feature with dev_readme and make sure that it's up to date".
7. Statuses update HERE only: `waiting` → `in progress` → `done` (or `blocked: <reason>`).

## Plans (build order: P0 storage migration first, then the existing plans)

| # | Plan | Priority | Model · thinking | Status | Depends on |
| --- | --- | --- | --- | --- | --- |
| 01 | [plan-01-supabase-and-cloudflare-r2-migration.md](plan-01-supabase-and-cloudflare-r2-migration.md) | P0 | GPT-6.1-sol · xhigh | waiting | completed work committed on its current branch before migration implementation |
| 02 | [plan-02-language-switcher.md](plan-02-language-switcher.md) | P1 | Sonnet · medium | done | — |
| 03 | [plan-03-db-anonymous-tickets.md](plan-03-db-anonymous-tickets.md) | P1 | Sonnet · medium | done - SQL sits in dev_readme-supbase-sql.md, Nikita schedules the pg_cron job | — |
| 04 | [plan-04-ecosystem-links-icon-utm.md](plan-04-ecosystem-links-icon-utm.md) | P2 | Sonnet · low | done | — |
| 05 | [plan-05-replenishment-button.md](plan-05-replenishment-button.md) | P2 | Sonnet · medium | done - counter column picked (option a); the ALTER waits for Nikita to run it | — |
| 06 | [plan-06-ai-suggest-retrigger.md](plan-06-ai-suggest-retrigger.md) | P2 | Sonnet · medium | done | — |
| 07 | [plan-07-support-ui-overhaul.md](plan-07-support-ui-overhaul.md) | P1 | Opus · high | done | — |
| 08 | [plan-08-support-prefilled-message.md](plan-08-support-prefilled-message.md) | P2 | Sonnet · low | done | plan-07 |
| 09 | [plan-09-i18n-sweep.md](plan-09-i18n-sweep.md) | P2 | Sonnet · medium | done for buyer-facing text - audit ran project-wide; admin-only and support-dashboard-only strings stay English on purpose (see the plan) | plan-07 (touches same files) |
| 10 | [plan-10-utm-stats-hardening.md](plan-10-utm-stats-hardening.md) | P3 | Opus · medium | done - geo columns + backfill SQL written (Nikita runs it), index already existed, task 3 closed AGAINST, task 5 deferred with a reason in dev_readme-utm.md | — |
| 11 | [plan-11-faceit-oauth.md](plan-11-faceit-oauth.md) | P3 | Opus · high | blocked: needs `FACEIT_CLIENT_ID` / `FACEIT_CLIENT_SECRET` from the faceit developer portal | — |
| 12 | [plan-12-backup-browser-only-bytes.md](plan-12-backup-browser-only-bytes.md) | P1 | Opus · high | in progress | — |
| 13 | [plan-13-cypress-authorization-optimistic.md](plan-13-cypress-authorization-optimistic.md) | P1 | Opus · high | done | — |
| 14 | [STORYBOOK-PLAN.md](../STORYBOOK-PLAN.md) | P1 | Opus · high | in progress | plan-13 |
| 15 | [plan-15-optional-variant-image.md](plan-15-optional-variant-image.md) | P2 | Sonnet · medium | done - all 5 steps; `Commerce/Product → VariantWithoutImage` covers the mixed row | — |
| 16 | personalization phase 3 - owner notification on a paid design (see `app/components/ui/Modals/PersonalizeModal/dev_readme-personalize.md` §4) | P2 | Sonnet · medium | waiting | — |
| 17 | [plan-17-ai-price-proposals-admin-workspace.md](plan-17-ai-price-proposals-admin-workspace.md) | P1 | GPT-5 · high | done | — |
| 18 | [plan-18-seasonal-themes-halloween-new-year.md](plan-18-seasonal-themes-halloween-new-year.md) | P2 | Sonnet · low | waiting | — |
| 19 | [plan-19-solana-payments.md](plan-19-solana-payments.md) | P1 | Sonnet · medium | done - steps 2-5 + 7; step 6 skipped by decision 4 (no server check, same trust model as MetaMask). Devnet path not run against a real Phantom wallet yet - see CartModal dev_readme §5.7 | — |
| 20 | [plan-20-checkout-request-prices-primary.md](plan-20-checkout-request-prices-primary.md) | P1 | Sonnet · medium | done - tasks 2-6; checkout redirects, verified PayPal webhook, and ordered receipt email steps | plan-19 |
| 21 | [plan-21-buying-flow-stats.md](plan-21-buying-flow-stats.md) | P1 | Opus · high | done - tasks 1-8; SQL is in the commit body; local Playwright reached all 5 capture stages, and rows + search toggle wait for that table | plan-20 (reads its buttons) |
| 22 | [plan-22-backup-storage-url-relink.md](plan-22-backup-storage-url-relink.md) | P1 | GPT-5 · high | done | plan-12 |
| 23 | [plan-23-storage-buckets-email-slug.md](plan-23-storage-buckets-email-slug.md) | P1 | Opus · high | done - both stages, all 10 steps. The 6-bucket SQL and the cleanup_guest_support_images pg_cron job wait for Nikita to run them (SQL is in commit 22a59a97 / f099368e and be863ef5). §5 holds the 4 image prompts - Nikita runs them through an image generator | plan-22 |
| 24 | [plan-24-project-5-and-browser-audit.md](plan-24-project-5-and-browser-audit.md) | P1 | GPT-6 · high | in progress - Project 5 cards and browser checks are tracked in the plan | — |

Priority note: no screenshot appears twice in `TODO/`, so the duplicate-screenshot rule (2 = P1, 3+ = P0) sets nothing — P1 here means "blocks users or is the main asked-for work".

## Screenshot map (`TODO/`)

| Screenshot | Goes to |
| --- | --- |
| `04.07.2026 at 16-36.png` (support UI broken, no image fallback) | plan-07. Note: navbar overlap, sidebar hover, UUID titles and the refresh race were already fixed in the session of 05.07.2026 — the fallback + overall look remain. |
| `04.07.2026 at 16-47.png` (changing languages does nothing) | plan-02 |
| `07.04.2026 at 18-41.jpg` (white icon box + add UTM) | plan-04 — code+docs done; delete this screenshot once you confirm the transparent icon on the page. |
| `07.06.2026 at 21-54.png` (save button should be disabled without changes) | **Nikita-owned**: code already has `disabled={isSaving \|\| !hasChanges}` at `app/[locale]/(site)/products/[productId]/manage/ManageProductView.tsx:537` — verify on the page, then delete the screenshot. |
| `make-it-so-I-can-change-db.jpg` (import blocked by sender_id constraint) | plan-03 — **Nikita-owned now**: the FK is gone from the live DB, so delete this screenshot after one import test. |

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
| ~~`dev_readme-backup.md:137` — "23_messages.sender_id … no auth FK, so they always restore"~~ | ~~Live DB rejects import with `23_messages_sender_id_fkey` (screenshot)~~ | **closed by plan-03** — the live read shows no such FK; `dev_readme-backup.md` now states TEXT/no-FK as settled |
| ~~`dev_readme-backup.md` `BACKUP_TABLES` lists 5 tables~~ | ~~`dev_readme-supbase-sql.md:323` restore order lists 7 (incl. `23_categories`, `23_category_views`)~~ | **closed by plan-12** — `dev_readme-backup.md` fully rewritten with `backupConfig.ts`'s 7-table list as the source of truth |
| `app/[locale]/(support)/support/tickets/components/dev_readme.md` documents `TicketsList.tsx` | No such file exists | plan-07 docs sub-task |
| `app/locales/dev_readme_i18n.md` — locale-line rule is not written down | All 4 locale files are exactly 526 lines; keys sit on identical line numbers | plan-02 task 3 |
| ~~`app/api/admin/backfill-categories/route.ts` + backfill button (categories dev_readme §5 says "delete after run")~~ | ~~Both already deleted; only the unused `category.backfill_button` locale keys remain~~ | **closed by plan-09 task 3** — the 4 unused keys are deleted |
