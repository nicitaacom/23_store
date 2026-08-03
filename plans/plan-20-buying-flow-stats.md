# plan-20 — Buying-flow stats: see where visitors leave before checkout

**Priority:** P1
**Screenshot:** none — asked for in chat with the /stats dashboard open. Goal in Nikita's words: know what users click, get an animated UI picture of what goes wrong in the buying flow (viewing but not buying, not adding to cart, searched a product, found nothing, left).
**Recommended model:** Opus · high — new table + capture pipeline + animated dashboard section, and the code must stay portable to other projects.
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** — (plan-19 is done; this reads the buttons it re-grouped)

## In a nutshell

- Today the dashboard proves people ARRIVE (735 visits). After landing, every click is invisible — there is zero data between "visited" and "ordered".
- Fix: record 6 small events (product_view, add_to_cart, cart_open, checkout_click + which button, order_placed, search_no_results) into one new `buying_flow_events` table, keyed by the same visitor id utm_stats already uses.
- Show them on /stats as an animated buying-flow strip: stage bars visits → viewed → added → cart → checkout with counts, % between stages, and a red pulse on the stage where most visitors leave. Plus a "searched, found nothing" list — the products people wanted but the store does not sell.
- Everything project-specific lives in ONE config file + ~7 one-line wire-ups, so the same plan ports to 26, 14 or any other project by redoing only the adapter section (§6).

## §0 Root cause / why this file exists

The capture side records one `utm_stats` row per device per day and then goes silent — by design ([dev_readme-utm.md](<../app/[locale]/dev_readme-utm.md>) §6: "Against tracking every page view"). Nothing anywhere records a click on a product, an add to cart, a cart open, or a press on the checkout buttons:

- Add to cart updates only the zustand store — `cartStore.increaseProductQuantity` at [cartStore.ts:102](../app/store/user/cartStore.ts), reached from 5 buttons, writes localStorage/DB cart, no stats row.
- The two goal clicks — `handleRequestBetterPrices` at [ProductsInCart.tsx:29](../app/components/ui/Modals/CartModal/ProductsInCart.tsx) and the 4 live `PayWith*Button` components in [PaymentButtons/components/](../app/components/ui/Modals/CartModal/PaymentButtons/components/) — send emails/sessions, record nothing.
- A search with zero hits renders [NoProductsFound.tsx](<../app/[locale]/(site)/search/NoProductsFound.tsx>) (branch at [search/page.tsx:36](<../app/[locale]/(site)/search/page.tsx>)) and the query is thrown away — the strongest "what to stock next" signal the store gets.

So the question "why do 735 visits produce so few orders" has no data to answer it. This plan adds the data and the picture.

## §1 Where it lives / what changes

Universal pieces (copy to any project as-is):

| Piece | New file (23_store paths; mirror the folder role in other projects) | Does |
| --- | --- | --- |
| Config | `app/config/buyingFlowConfig.ts` | stage list + labels, checkout kinds, PROJECT_URL_FRAGMENTS — the ONLY file with project-specific values |
| Client util | `app/utils/trackBuyingFlowEvent.ts` | session id (sessionStorage uuid), visitor id, sends the action, `.catch` keeps failures to a console line — same posture as UTMTracker |
| Server action | `app/actions/trackBuyingFlowEventAction.ts` | shape-checks every client value, rate limit, INSERT — never trusts the browser, same posture as trackVisitAction |
| Read action | `app/[locale]/(site)/stats/actions/selectDBBuyingFlowStatsAction.ts` | distinct visitors per stage in range, url-scoped like [selectDBUTMStatsAction.ts](<../app/[locale]/(site)/stats/actions/selectDBUTMStatsAction.ts>); search-miss list; checkout split |
| UI | `app/[locale]/(site)/stats/components/BuyingFlow.tsx` | the animated strip + lists; self-contained divs, no chart lib required — portable |
| Types | `app/ts/interfaces/IBuyingFlowStats.ts` + event union type | one shape for action ↔ UI |

23_store wire-ups (one line each, the adapter):

| Event | Where the line goes |
| --- | --- |
| product_view | [ProductDetailView.tsx](<../app/[locale]/(site)/products/[productId]/ProductDetailView.tsx>) mount effect |
| add_to_cart | per Open Question 2 — [cartStore.ts:102](../app/store/user/cartStore.ts) or the 5 button call sites |
| cart_open | [CartModal.tsx](../app/components/ui/Modals/CartModal/CartModal.tsx) mount effect |
| checkout_click kind=request_better_prices | [ProductsInCart.tsx:29](../app/components/ui/Modals/CartModal/ProductsInCart.tsx) `handleRequestBetterPrices` |
| checkout_click kind=stripe/paypal/metamask/solana | each `PayWith*Button` onClick in [PaymentButtons/components/](../app/components/ui/Modals/CartModal/PaymentButtons/components/) (Klarna stays commented out) |
| order_placed | [payment/page.tsx](<../app/[locale]/(site)/payment/page.tsx>) `status === "success"` branch, plus the wallet success paths if they skip that page |
| search_no_results | [NoProductsFound.tsx](<../app/[locale]/(site)/search/NoProductsFound.tsx>) mount effect with the query (page.tsx stays a server component) |

Docs: new `dev_readme-buying-flow.md` (capture side) + `dev_readme-ui-buying-flow.md` (viz recipes) + CLAUDE.md map rows + SQL block in `dev_readme-supbase-sql.md`.

## §2 Terminology

- **buying flow** — the path visit → product_view → add_to_cart → cart_open → checkout_click → order_placed.
- **event** — one row in `buying_flow_events`: one visitor did one thing once at one time. Raw rows; all math happens on read.
- **stage count** — DISTINCT visitors who sent that event inside the picked range. Distinct, so re-opening one product 20 times still counts one visitor.
- **leak** — the biggest percentage fall between two neighbouring stages. The animated strip pulses it red.
- **checkout kind** — which button: request_better_prices, stripe, paypal, metamask, solana. Goal metric = request_better_prices + order_placed.
- **search miss** — a search whose results list was empty; stored with the query text.
- **adapter** — the per-project part: config values + the wire-up lines. Everything else is copied unchanged.

## §3 Before / after

```
BEFORE (/stats)                              AFTER (/stats, new section under the cards)

 Total Visits 735                             BUYING FLOW            [Entire Year 2026 v]
 Unique Users 702                             ┌────────────────────────────────────────┐
 ...charts about ARRIVING...                  │ visited   viewed   added   cart  checkout│
                                              │ ████████  ██████   ███     ██    ▌      │
 (what happened after landing: no data)       │  702       310      88      61    9     │
                                              │      -56%     -72%🔴   -31%    -85%🔴    │
                                              │         animated: bars grow on mount,   │
                                              │         biggest leak pulses red         │
                                              ├────────────────────────────────────────┤
                                              │ Checkout clicks: better_prices 6 · st 2 │
                                              │ Searched, found nothing:                │
                                              │   "lol boost eu"  ×4   "cs2 knife" ×2   │
                                              └────────────────────────────────────────┘
```

## §4 Steps

> ONE tracker TODO row. Task 1 waits for Nikita's letters; after that run tasks 2-7 in one go and show the full diff at the end.

1. **Unblock.** Wait for the 6 letters below. Quote the answers verbatim into a "Decisions made (do not re-open)" section in this file.
2. **SQL.** Final CREATE below (adjust to answers 1/6). The implementing session puts this exact SQL in the commit body under 🚨 TODO — Supabase SQL editor is Nikita's, and mirrors utm_stats's RLS policies from `dev_readme-supbase-sql.md` before handing it over:

   ```sql
   CREATE TABLE buying_flow_events (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at timestamptz NOT NULL DEFAULT now(),
     user_id text NOT NULL,
     session_id text NOT NULL,
     event text NOT NULL,
     product_id text,
     checkout_kind text,
     search_query text,
     url text NOT NULL,
     locale text
   );
   CREATE INDEX buying_flow_events_created_at_idx ON buying_flow_events (created_at DESC);
   CREATE INDEX buying_flow_events_event_idx ON buying_flow_events (event);
   CREATE INDEX buying_flow_events_user_id_idx ON buying_flow_events (user_id);
   ALTER TABLE buying_flow_events ENABLE ROW LEVEL SECURITY;
   -- policies: copy utm_stats's insert/select pair verbatim (shared-table section of dev_readme-supbase-sql.md)
   ```

   `product_id` is text on purpose — other projects' ids are not all uuid. `url` is NOT decoration: it scopes rows per project exactly like utm_stats.
3. **Universal core.** Config + client util + server action + types. Validation refuses: unknown event names, kinds outside the config list, query/url over length caps, an id that fails the project's id check. Rate limit via `RATE_LIMITS` ([RATE_LIMITS.ts](../app/sdk/RateLimitSDK/consts/RATE_LIMITS.ts)); a project with no rate SDK ships the action with a per-user_id per-minute count on the table itself. Unit tests for validation + aggregation math with the project's runner.
4. **Wire the adapter.** The 7 lines from §1. Every wire-up is fire-and-forget — a thrown tracking error never blocks a click (`.catch` + console, UTMTracker posture).
5. **Read + UI.** `selectDBBuyingFlowStatsAction` (range picker input reused from the dashboard) + `BuyingFlow.tsx`: bars animate width on mount, count-up numbers, red pulse on the leak stage, checkout-kind split row, search-miss list sorted by count. Reuse the dashboard's framer-motion; the component keeps a CSS-transition fallback so a project without framer-motion renders the same strip.
6. **Verify.** Playwright against the dev server: land → open a product → add → open cart → press request better prices → see each row appear (select via the action), then /stats shows counts ≥ 1 per stage. Cypress spec written but its binary stays broken on this machine — CI runs it.
7. **Document.** The two dev_readmes + CLAUDE.md map rows + `dev_readme-supbase-sql.md` block + tracker status. Update [dev_readme-utm.md](<../app/[locale]/dev_readme-utm.md>) §6 with one line: per-page-view stats now live in buying_flow_events, the AGAINST there still holds for utm_stats itself.

## §6 Port checklist (26, 14, any project)

The universal pieces copy unchanged. In the target project the implementing session:

1. Runs nothing in SQL if answer 1 = A (the shared table already exists) — otherwise re-runs §4.2 with that project's prefix.
2. Writes `buyingFlowConfig.ts`: its url fragments, its checkout kinds (26: its order button; 14: contact/hire click), its stage labels.
3. Finds the adapter points by role, not by filename — grep targets: the cart store action every add-button funnels into; the cart/order modal or page mount; every checkout/goal button handler; the zero-results branch of search; the order-success screen.
4. Identity: reuse whatever id the project already writes into `utm_stats.user_id` (23: the 5-layer signed deviceId via [useDeviceIdStore](../app/store/user/useDeviceIdStore.ts) / [trackVisitAction.ts](../app/actions/trackVisitAction.ts)); a project with no utm capture mints a localStorage uuid inside the client util — the util exposes one `getVisitorId()` seam for exactly this swap.
5. Labels go through the project's i18n when it has one, else the config strings render as-is.
6. Tests follow the project's rules — 26 has NO test runner by Nikita's call: skip unit tests there, verify with playwright only.
7. The /stats section mounts behind that project's existing stats gate, whatever it is.

## Open Questions

Answer with a letter each. Nothing starts until all 6 are answered.

### 1️⃣ One shared table or one per project?

- **A (recommended)** — one unprefixed `buying_flow_events` shared by all projects, rows scoped by `url` — exactly the utm_stats pattern, SQL runs once ever, every project's dashboard reads the same way.
- **B** — per-project table (`23_buying_flow_events`, …). Cleaner isolation, but new SQL + new policies every port, and cross-project reads need N queries.

### 2️⃣ Where is add_to_cart recorded?

- **A (recommended)** — one line inside `cartStore.increaseProductQuantity` (cartStore.ts:102) with a first-add flag: every current AND future add button is covered by one line; ports find the store action once.
- **B** — a line in each of the 5 button call sites. No store coupling, but 5 lines that drift as buttons come and go.

### 3️⃣ Which visitor id keys the events?

- **A (recommended)** — the same id utm_stats uses (23: the signed deviceId). Funnel rows join to utm rows, so the dashboard later answers "which campaign brings BUYERS, not visitors".
- **B** — a standalone localStorage uuid minted by the util. Fewer moving parts, works in any project instantly, and the campaign join is gone.

### 4️⃣ How do events travel?

- **A (recommended)** — one server action per event with the rate limit. Same shape as trackVisitAction, nothing new to learn, events land instantly; volume at this store's traffic is trivial.
- **B** — client queue + `sendBeacon` batch flush. Fewer invocations at scale the store does not have yet, and a queue + flush path to test.

### 5️⃣ Where does the picture live?

- **A (recommended)** — a "Buying flow" section on the existing /stats page under the stat cards, sharing its range picker and admin gate.
- **B** — its own /stats/buying-flow page. More room, second place to gate and link.

### 6️⃣ Which searches are recorded?

- **A (recommended)** — only zero-result searches (query + url). The actionable list — what people wanted and left without — with no noise from every keystroke-y search.
- **B** — every search with a `results_count` column too. Full search analytics, ~10× the rows, and the miss list needs a WHERE anyway.

## Not in this plan

- Heatmaps, scroll depth, session replay recordings — different tool class, revisit only if the funnel numbers raise questions the stages answer poorly.
- Bot filtering beyond the rate limit + id check. utm_stats lives with the same exposure today.
- A consent banner change: events hold no personal data — the visitor id is the one utm_stats already stores, queries and urls are the only payloads.
- Fixing anything the numbers reveal (pricing, stock, copy) — separate plans once data exists.

## Code patterns to follow

- `dev_readme-code-patterns.md` — all 15 rules, incl. early returns and the banned-words list.
- `good-bad-examples.md` — §3 SDK/action shape, §4 response types, §9 naming.
- `commit-patterns.md` — the SQL from §4.2 goes IN the commit body under 🚨 TODO.
- [dev_readme-utm.md](<../app/[locale]/dev_readme-utm.md>) + [dev_readme-device-id.md](<../app/[locale]/(site)/stats/dev_readme-device-id.md>) — the capture/identity postures this plan mirrors.
- [CartModal/dev_readme.md](../app/components/ui/Modals/CartModal/dev_readme.md) — the directory the checkout wire-ups touch.
- `app/locales/*.ts` — one line per key, same relative position, NEVER prettier on them.

Read them BEFORE coding; validate the final diff line-by-line before saying done.

➡️ Next plan: — (back to [plan-00-tracker.md](plan-00-tracker.md))
