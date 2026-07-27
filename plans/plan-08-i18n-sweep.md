# plan-08 — i18n sweep: every user-visible string gets a key in all 4 locales

**Priority:** P2
**Screenshot:** — (from code TODOs + Nikita: "not only this but also other stuff in this project that is not translated")
**Recommended model:** Sonnet · medium thinking — mechanical but wide; the risk is locale-file line discipline, not logic
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** plan-06 (it restyles the same support files; sweeping after avoids double-touching)

## §0 Why

Untranslated strings ship to users. Known anchors (the audit in task 1 finds the rest):

- `app/[locale]/(auth)/AuthModal/components/AuthForm.tsx:137` — button label fallback is literally `"TODO - contact support - ask to translate it - попросите поддержку перевести этот текст"`.
- `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx:164` — `// TODO - translate this`.
- `app/[locale]/(site)/components/Product/RequestReplanishmentButton.tsx` — English-only toasts with typos ("onwer", "taht") + button label.
- Support dashboard on-screen strings (current literals): "Support inbox", "Open tickets", "Customer", "No messages yet", `MarkTicketAsCompletedUser` overlay copy, and similar. Note: Nikita calls this page the support dashboard — at the audit STOP also propose renaming the on-screen "Support inbox" text to match his terms.
- Unused keys also exist: `category.backfill_button` (`app/locales/en.ts:524` + same line in ru/fi/se) — the backfill route and button are already deleted.

The locale-line rule (verified): all 4 locale files are exactly 526 lines; every key sits on the identical line number in `en.ts`, `ru.ts`, `fi.ts`, `se.ts`. Every add/remove must keep them aligned.

## §1 Where it lives

| Piece | File |
| --- | --- |
| Locale files (4, line-aligned) | `app/locales/{en,ru,fi,se}.ts` |
| Client/server helpers | `app/locales/{client,server}.ts` |
| i18n doc | `app/locales/dev_readme_i18n.md` |
| Known string anchors | see §0 |

## §3 Expected behavior

```
BEFORE                                   AFTER
fi user sees "Request replenishment"     fi user sees "Pyydä täydennystä"
auth edge case shows the TODO text ✗     every surface reads from t("...") ✓
4 locale files: 526/526/526/526 lines    4 locale files: still equal line counts ✓
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **Audit only.** Grep the app for user-visible string literals in JSX and toast calls (exclude: console.log, comments, keys already in `t(...)`, ADMIN-only debug output). Output a table grouped by surface: file:line → string → proposed key name. Mark the internal SUPPORT-role-only strings ("Support inbox" etc.) — Nikita decides include/skip per group at this STOP. No file edits yet. STOP — show Nikita the table and wait for his review.
2. **Translate per surface (one sub-task per surface group Nikita approved).** For each group: add the keys at identical line numbers in all 4 files, matching the tone of neighboring keys (e.g. the `support.*` block); replace the literals with `t("...")`; fix the source typos while replacing (the key value gets correct English). After each group: `grep -c "" app/locales/*.ts` must print four equal numbers; `pnpm type-check`. STOP after EACH group — show Nikita the diff and wait for his review.
3. **Remove unused keys.** Delete `category.backfill_button` (same line in all 4 files) and any other keys the audit finds with zero `t(...)` references. Line counts stay equal. STOP — show Nikita the diff and wait for his review.
4. **Docs.** If plan-01 has not shipped yet: write the locale-line rule into `app/locales/dev_readme_i18n.md` (otherwise verify it reads correctly and skip). STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- One sweep plan covers everything; plan-06 restyles without translating — no overlap.
- Nikita, verbatim: "and not only this but also other sutff in this project that is not translated" — the audit is project-wide, not just the quoted anchors.
- Whether internal SUPPORT-role strings get keys is decided at task 1's STOP (genuine ship-decision: those screens are seen only by Nikita's support role).

## Code patterns to follow

- `dev_readme-code-patterns.md` — terminology bans apply to KEY NAMES too (no `popup`, no `saving`); plainest accurate words.
- `good-bad-examples.md` — naming discipline.
- `app/locales/dev_readme_i18n.md` — setup + (post plan-01) the locale-line rule.

Read them BEFORE editing; validate every group diff line-by-line before saying done.

➡️ Next plan: [plan-09-utm-stats-hardening.md](plan-09-utm-stats-hardening.md)

## Audit result (project-wide grep, this session)

Translated now (buyer sees them):

- `app/components/ui/Modals/CartModal/ProductsInCart.tsx` - better-prices toasts
- `app/components/ui/Modals/UpdateAvatarModal.tsx` - 4 avatar toasts
- `app/components/ui/Modals/DoYouWantReceiveCheckModal.tsx` - 3 check toasts
- `app/components/ui/Modals/CartModal/PaymentButtons/components/PayWithMetamaskButton.tsx` - transaction error
- `app/components/ui/Modals/CartModal/PaymentButtons/components/PayWithClarnaButton.tsx` - session error
  (its text said "paypal session" inside the Klarna button - fixed while translating)
- `app/[locale]/(site)/components/AISearch/ChatInput.tsx` - composer placeholder
- `app/components/SupportButton/components/DragAndDropArea/*` - drop-zone labels + the 4 image
  warnings, which now reuse the `product.warning.*` keys the admin form already had
- `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx` - background translation toast
- `app/components/Product/RequestReplanishmentButton.tsx` - button + toasts
- `app/[locale]/(auth)/AuthModal/components/AuthForm.tsx` - the literal TODO string that could render

Left in English on purpose:

- Admin-only surfaces: `CategoriesForm.tsx`, `FormatImagesForm.tsx`, `DbBackupModal`, `UTMDashboard`.
  Only Nikita opens them.
- Support dashboard (`app/[locale]/(support)/...`): "Support inbox", "Open tickets", "Ticket", the
  empty states. Only the support role sees them.
- `app/global-error.tsx`: it renders outside the locale layout, so no i18n provider exists there.
- `app/emails/RequestBetterPricesEmail.tsx`: the mail goes to support, not to a buyer.
- `app/[locale]/error/*`: the auth-callback error screens are technical dead ends aimed at support.

Unused keys deleted: `category.backfill_button` (all 4 files). All 4 locale files hold the same key
set - checked by diffing the key lists, not by line count (prettier wraps long values, so the old
"same line number" rule only held while every value was short).
