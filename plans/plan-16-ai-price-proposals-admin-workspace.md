# plan-16 — AI price proposals and product workspace improvements

## Summary

- Weekly AI pricing is proposal-only. Owners must approve every live price change.
- A global owner switch and a per-product switch must both be enabled before a product is researched.
- Every proposed price stays within ±12.5% of the owner-set baseline, so weekly changes cannot compound beyond the band.
- AI returns `id`, `name`, `price`, and a short reason of at most 300 characters in one researched request.
- AdminPanel warns before discarding drafts, product workspace lists gain consistent sorting, and catalogue/dropdown regressions are fixed.

## Implementation

1. Add documented Supabase SQL and matching manual TypeScript types for AI settings, weekly runs, and owner-reviewed proposals. Schedule `POST /api/webhooks/prices` for Monday at 03:00 UTC with a Vault-held bearer secret.
2. Use one `gpt-5.4-mini` Responses API request with web search and structured output. Research the previous seven days of China trade/manufacturing/logistics/macroeconomic news and USD/JPY. Validate all output, store sources, and clamp prices to the baseline band.
3. Add an owner Pricing tab with global and per-product switches plus approve/reject controls. Apply variant changes proportionally and synchronize approved prices with Stripe and Supabase.
4. Add a shared Edit/Delete sort control: created newest/oldest, base price low/high, and localized name A–Z/Z–A. Products with no real product image always stay first.
5. Add a shared AdminPanel dirty registry and guard tab changes, modal dismissals, navigation, refresh, and tab close. Use the application confirmation dialog in-app and native `beforeunload` for browser unloads.
6. Make the category selector close on the first Escape without closing AdminPanel. Remove the catalogue list animation state that can leave cards invisible and refresh catalogue server data after `product:created`.

## Interfaces

```ts
type AIPriceResearch = {
  products: Array<{
    id: string
    name: string
    price: number
    reasoning: string // 1–300 characters
  }>
}
```

- `POST /api/webhooks/prices` — secret-authenticated weekly proposal generation.
- `PATCH /api/products/ai-pricing` — owner global/per-product switch updates.
- `POST /api/products/price-proposals/[proposalId]/approve` — owner approval.
- `POST /api/products/price-proposals/[proposalId]/reject` — owner rejection.

## Acceptance

- No cron or AI response directly changes a live product price.
- Repeated approvals remain within ±12.5% of baseline; manual owner edits reset the baseline.
- Global off pauses all research without losing per-product selections.
- Reasons over 300 characters, malformed responses, stale proposals, and unauthorized actions are rejected.
- Missing-image grouping and all six sort orders work in Edit and Delete; search and bulk selection remain correct.
- Dirty drafts warn on all close/leave paths, while untouched or successfully saved forms close normally.
- Product cards remain visible after creation, filtering, reordering, and pagination.
