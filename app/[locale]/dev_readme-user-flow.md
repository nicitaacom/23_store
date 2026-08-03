# 🛒📊 User-flow event capture

## 🎯🧾 0. Why this exists

`utm_stats` records arrival. `23_buying_flow_events` records what a visitor does before checkout.

- Product views show browsing.
- First cart adds show buying intent.
- Cart opens and checkout clicks show later stages.
- Searches with `results_count = 0` show products visitors did not find.

## 👀📁 1. How it looks and where data lives

The capture components render no visible UI.

```text
browser click
  -> trackBuyingFlowEvent
  -> trackBuyingFlowEventAction
  -> 23_buying_flow_events
  -> selectDBBuyingFlowStatsAction
  -> /stats BuyingFlow
```

**Files**

| Part | Path |
| --- | --- |
| Client utility | `app/utils/trackBuyingFlowEvent.ts` |
| Server action | `app/actions/trackBuyingFlowEventAction.ts` |
| Search component | `app/[locale]/(site)/search/SearchTracker.tsx` |
| Read action | `app/[locale]/(site)/stats/actions/selectDBBuyingFlowStatsAction.ts` |
| Dashboard UI | `app/[locale]/(site)/stats/components/BuyingFlow.tsx` |

**Types**

- `app/ts/types/TBuyingFlowEvent.ts`
- `app/ts/interfaces/IBuyingFlowEventInput.ts`
- `app/ts/interfaces/IBuyingFlowStats.ts`

**Table row**

```text
23_buying_flow_events
  id, created_at
  user_id, session_id
  event
  product_id, checkout_kind
  search_query, results_count
  url, locale
```

## 🧩📖 2. Terminology

- **Buying flow:** visited → viewed → added → cart → checkout.
- **Event:** one action row.
- **Stage count:** distinct `user_id` values for one event in the selected period.
- **Session id:** one browser-tab session, stored under `buying-flow:session-id`.
- **Search miss:** a search row with `results_count = 0`.

## 🔐🔄 3. Identity and capture

### 🔑🧾 Identity inherited from UTM

This feature inherits device identity from `UTMTracker`.

- Full identity rules: `app/[locale]/(site)/stats/dev_readme-device-id.md`.
- Client: `getVisitorId()` reads `useDeviceIdStore.getState().storedDeviceId`.
- The client sends the stored transport form, not the signed id.
- Server: the `23_did` cookie wins when it decrypts to a valid signed id.
- Without that cookie, the server decodes and verifies the sent transport form.
- With neither valid value, the action returns `{ skipped: true }` and writes no row.
- `23_buying_flow_events.user_id` therefore joins `utm_stats.user_id`.
- `UTMTracker` owns id creation. This feature never creates one.

### 🖱️➡️ Event path

```text
visitor action
  -> utility adds storedDeviceId, sessionId, pageUrl, locale
  -> server checks event, optional fields, URL, sizes, and results count
  -> 60 events per minute per visitor
  -> INSERT one row
  -> tracking failure stays in the console and the visitor action continues
```

**Adapter calls**

- `ProductDetailView.tsx`: `product_view` on mount.
- `cartStore.ts`: `add_to_cart` only for a new cart key.
- `CartModal.tsx`: `cart_open` on mount.
- Checkout handlers: `checkout_click` with the pressed kind.
- `payment/page.tsx`: one `order_placed` per session.
- `search/page.tsx`: one `search` with the result count.

## 🚨✅ 4. TODO, checks, and decisions

**TODO**

- Run the SQL from the plan-20 commit body in the Supabase SQL editor.

**Reproduce**

1. Open a product and confirm a `product_view` row.
2. Add it once and confirm one `add_to_cart` row.
3. Increase quantity and confirm no second add row.
4. Open the cart and press Request Better Prices.
5. Search for text with zero matches.
6. Open `/stats` and switch Missed searches → Top 10 searches.

**Decisions made against**

- No feature-owned visitor id.
- No client event queue.
- No shared cross-project table.
- No locale keys for the admin-only dashboard.
