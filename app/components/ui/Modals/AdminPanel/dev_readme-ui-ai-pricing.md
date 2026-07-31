# AI pricing and workspace UI

## 0. Why this exists

Owners need current-market price guidance without giving an AI permission to change customer-facing prices. The Pricing tab turns weekly research into bounded proposals, explains each recommendation in at most 300 characters, and leaves approval with the owner.

The same workspace also protects drafts from accidental closure and gives Edit/Delete one predictable product order.

## 1. UI and data

- Pricing UI: [components/PricingForm.tsx](components/PricingForm.tsx)
- Unsaved confirmation: [components/AdminPanelUnsavedChangesDialog.tsx](components/AdminPanelUnsavedChangesDialog.tsx)
- Shared sorting: [components/AdminPanelProductSort.tsx](components/AdminPanelProductSort.tsx)
- Storybook: `http://localhost:6006/?path=/story/admin-adminpanelmodal--ai-pricing`
- Supabase setup: [dev_readme-supbase-sql.md](../../../../../dev_readme-supbase-sql.md#ai-price-proposals)

```text
Monday 03:00 UTC
  Supabase pg_cron
    → POST /api/webhooks/prices
      → one gpt-5.4-mini response with web search
        → 23_ai_price_runs
        → 23_ai_price_proposals (pending)
          → Pricing tab → owner approves/rejects
            → Stripe Price + atomic Supabase approval
```

Switches:

```text
owner master switch OFF                       no products researched
owner master ON + product switch OFF          product excluded
owner master ON + product switch ON           product included
```

Product workspace ordering:

```text
products without a real image                 always first
then selected order                           newest/oldest, price, or localized name
then product id                               stable tie-break
```

## 2. Terms

- **Baseline** — the owner-controlled anchor. A proposal must stay between 87.5% and 112.5% of it.
- **Proposal** — an AI recommendation only; it is not a live price.
- **Master switch** — pauses or resumes research for all of one owner's selected products.
- **Dirty section** — a local AdminPanel draft or request that would be lost if the modal unmounted.

## 3. Behavior

- Enabling a product for the first time sets its baseline to the current price. Disabling and
  re-enabling preserves that baseline.
- A manual owner price edit resets the baseline and expires pending proposals.
- AI approvals never change the baseline, preventing weekly compounding beyond ±12.5%.
- Modal X, outside click, Escape, tab changes, links, Back, refresh, and tab close all use the same dirty registry.
- In-app exits show the application confirmation. Browser unload uses the browser-native warning.
- The category selector is an inner Escape layer: first Escape closes it, not AdminPanel.

## 4. Runtime setup

- Set `OPENAI_API_KEY` in the application runtime.
- Set `PRICE_WEBHOOK_SECRET` to the same long random value stored as
  `price_webhook_secret` in Supabase Vault.
- Run the **AI price proposals** block in `dev_readme-supbase-sql.md` after replacing its
  production-domain and secret placeholders.
- The scheduled endpoint accepts only `Authorization: Bearer <PRICE_WEBHOOK_SECRET>`.

## 5. Decided against

- **AGAINST automatic price updates.** Research remains proposal-only.
- **AGAINST selecting every product by default.** Both switches default off.
- **AGAINST weekly-relative limits.** A fixed baseline band prevents repeated 12.5% changes from compounding.
- **AGAINST long AI analysis.** The owner-visible reason is limited to 300 characters.
- **AGAINST making “without images first” optional.** Missing-image products always lead every workspace sort.
