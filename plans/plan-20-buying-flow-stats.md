# plan-20 — Buying-flow stats: see where visitors leave before checkout

**Priority:** P1
**Screenshot:** none — asked for in chat with the /stats dashboard open. Goal in Nikita's words: know what users click, get an animated UI picture of what goes wrong in the buying flow (viewing but not buying, not adding to cart, searched a product, found nothing, left).
**Recommended model:** Opus · high — new table + capture pipeline + animated dashboard section, portable to other projects.
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** — (plan-19 is done; this records clicks on the buttons it re-grouped)

## In a nutshell

- Today /stats proves people ARRIVE (735 visits). After landing, every click is invisible — zero data between "visited" and "ordered".
- Fix: record events — `product_view`, `add_to_cart`, `cart_open`, `checkout_click` + which button, `order_placed`, `search` with its results count — into a new per-project `23_buying_flow_events` table.
- Rows are keyed by the SAME visitor id `utm_stats` uses (the signed deviceId), so buying-flow rows join to campaign rows later.
- Show it on the existing /stats page as an animated "Buying flow" strip: stage bars visited → viewed → added → cart → checkout, % between stages, red pulse on the stage losing the most visitors.
- Under the strip: checkout-kind split (request better prices vs stripe vs wallets) and a search panel — missed searches by default, a toggle for top 10 searches.
- Project-specific values live in ONE config file + ~7 one-line wire-ups; §6 is the port checklist for 26/14/any project.
- All 6 decisions are locked in "Decisions made" below — do not re-open them.

## Read this first — the implementing chat may have zero context

This repo has rules that block writes and commits. Before coding:

1. Read `dev_readme-code-patterns.md` (all 15 rules — a hook BLOCKS files containing banned words) + `good-bad-examples.md` + `commit-patterns.md`.
2. Read [dev_readme-utm.md](<../app/[locale]/dev_readme-utm.md>) + [dev_readme-device-id.md](<../app/[locale]/(site)/stats/dev_readme-device-id.md>) — this feature inherits their identity and capture postures.
3. Read [CartModal/dev_readme.md](../app/components/ui/Modals/CartModal/dev_readme.md) + [stats/dev_readme-utm.md](<../app/[locale]/(site)/stats/dev_readme-utm.md>) (the read/chart side).
4. Rules that bite:
   - EVERY commit has a description; a 🚨 TODO block ONLY for steps Nikita alone reaches (Supabase SQL editor, `git push`). The SQL statement goes IN the commit body, never a pointer to a doc.
   - `git push` is denied here — commit locally, hand Nikita the push command.
   - Cypress binary fails on this machine — verify browser behaviour with the installed Playwright; still write the Cypress spec for CI.
   - Files named `*env*` are write-blocked; only `env.d.ts` declarations pass. This plan needs NO new env var.
   - `/stats` is admin-only and stays English (plan-08 decision) — NO locale keys for this UI, so `app/locales/*.ts` stay untouched.
   - No subagents. One plan per chat.

## §0 Root cause / why this file exists

The capture side records one `utm_stats` row per device per day and then goes silent — by design ([dev_readme-utm.md](<../app/[locale]/dev_readme-utm.md>) §6: "Against tracking every page view"). Nothing anywhere records a click on a product, an add to cart, a cart open, or a press on the checkout buttons:

- Add to cart updates only the zustand store — `cartStore.increaseProductQuantity` at [cartStore.ts:102](../app/store/user/cartStore.ts), reached from 5 buttons, writes localStorage/DB cart, no stats row.
- The two goal clicks — `handleRequestBetterPrices` at [ProductsInCart.tsx:29](../app/components/ui/Modals/CartModal/ProductsInCart.tsx) and the 4 live `PayWith*Button` components in [PaymentButtons/components/](../app/components/ui/Modals/CartModal/PaymentButtons/components/) — send emails/sessions, record nothing.
- A search with zero hits renders [NoProductsFound.tsx](<../app/[locale]/(site)/search/NoProductsFound.tsx>) (branch at [search/page.tsx:36](<../app/[locale]/(site)/search/page.tsx>)) and the query is thrown away — the strongest "what to stock next" signal the store gets.

So "why do 735 visits produce so few orders" has no data to answer it. This plan adds the data and the picture.

## §1 Where it lives / what changes

Universal pieces (copy to any project as-is):

| Piece | New file (23_store paths; mirror the folder role elsewhere) | Does |
| --- | --- | --- |
| Config | `app/config/buyingFlowConfig.ts` | stage list + labels, checkout kinds, length caps — the ONLY file with project-specific values |
| Client util | `app/utils/trackBuyingFlowEvent.ts` | session id, visitor id via one `getVisitorId()` seam, sends the action; promise not awaited, `.catch` keeps failures to a console line |
| Server action | `app/actions/trackBuyingFlowEventAction.ts` | resolves the id server-side, shape-checks every client value, rate limit, INSERT |
| Read action | `app/[locale]/(site)/stats/actions/selectDBBuyingFlowStatsAction.ts` | stage counts + checkout split + search lists for the picked range |
| UI | `app/[locale]/(site)/stats/components/BuyingFlow.tsx` | the animated strip + panels; self-contained divs, no chart lib required |
| Types | `app/ts/types/TBuyingFlowEvent.ts`, `app/ts/interfaces/IBuyingFlowEventInput.ts`, `app/ts/interfaces/IBuyingFlowStats.ts` | one shape for util → action → UI (§5.1) |
| Tracker component | `app/[locale]/(site)/search/SearchTracker.tsx` | client, renders null; sends the `search` event with the results count from the server component |

23_store wire-ups (one line each — the adapter):

| Event | Where the line goes |
| --- | --- |
| product_view | [ProductDetailView.tsx](<../app/[locale]/(site)/products/[productId]/ProductDetailView.tsx>) mount effect |
| add_to_cart | [cartStore.ts:122-131](../app/store/user/cartStore.ts) — the `else` branch of `increaseProductQuantity` that creates a NEW cartKey record; the `if (product)` branch is a quantity bump, not an add |
| cart_open | [CartModal.tsx:20](../app/components/ui/Modals/CartModal/CartModal.tsx) area — its mount effect; the component mounts when `?modal=CartModal` opens (verify once with a console line; if it stays mounted, key the effect on the modal-open param) |
| checkout_click kind=request_better_prices | [ProductsInCart.tsx:29](../app/components/ui/Modals/CartModal/ProductsInCart.tsx) first line of `handleRequestBetterPrices` |
| checkout_click kind=stripe / paypal / metamask / solana | each `PayWith*Button` onClick in [PaymentButtons/components/](../app/components/ui/Modals/CartModal/PaymentButtons/components/) (Klarna stays commented out) |
| order_placed | [payment/page.tsx](<../app/[locale]/(site)/payment/page.tsx>) `status === "success"` branch — MetaMask and Solana also route here (`sendMoneyWithMetamask.ts:93`, `sendMoneyWithSolana.ts:74` both push `/payment?status=success`), so one wire-up covers all kinds; guard so one success sends ONE event (sessionStorage flag keyed by session id) |
| search | [search/page.tsx](<../app/[locale]/(site)/search/page.tsx>) renders `<SearchTracker query={query} resultsCount={products.length} />` in both branches; the page stays a server component |

Also changed:

| File | Change |
| --- | --- |
| [UTMDashboard.tsx](<../app/[locale]/(site)/stats/components/UTMDashboard.tsx>) | mount `<BuyingFlow />` as a new section under the stat cards, obeying the page's range picker |
| [RATE_LIMITS.ts](../app/sdk/RateLimitSDK/consts/RATE_LIMITS.ts) | new `buyingFlowEvent` entry (§5.3) |
| `app/ts/types_db.ts` | hand-add `23_buying_flow_events` mirroring the `utm_stats` entry at types_db.ts:364 |
| `dev_readme-supbase-sql.md` | the table's SQL block |
| CLAUDE.md map | rows for the two new dev_readmes |

Docs: new `app/[locale]/dev_readme-user-flow.md` (capture + identity, same folder as dev_readme-utm.md) + root `dev_readme-ui-buying-flow.md` (viz recipes). The capture doc is named **user-flow** at Nikita's call — see Decisions §3.

## §2 Terminology

- **buying flow** — the path visit → product_view → add_to_cart → cart_open → checkout_click → order_placed. The feature/component name.
- **user-flow doc** — `dev_readme-user-flow.md`, the capture-side doc. Same feature, Nikita's chosen doc name — both names are on purpose, do not "fix" one to match the other.
- **event** — one row in `23_buying_flow_events`: one visitor did one thing once. Raw rows; all math happens on read.
- **stage count** — DISTINCT visitors who sent that event inside the picked range, so re-opening one product 20 times still counts one visitor.
- **leak** — the biggest percentage fall between two neighbouring stages. The strip pulses it red.
- **checkout kind** — which button: request_better_prices, stripe, paypal, metamask, solana. Goal metric = request_better_prices clicks + order_placed.
- **search miss** — a `search` event whose `results_count` is 0.
- **visitor id** — the signed deviceId `utm_stats.user_id` already holds; inherited from the utm widget, never minted by this feature.
- **session id** — `crypto.randomUUID()` in sessionStorage key `buying-flow:session-id`; groups one tab's sitting.
- **adapter** — the per-project part: config values + the wire-up lines. Everything else copies unchanged.

## §3 Before / after

```
BEFORE (/stats)                              AFTER (/stats, new section under the cards)

 Total Visits 735                             BUYING FLOW              (obeys page range picker)
 Unique Users 702                             ┌──────────────────────────────────────────┐
 ...charts about ARRIVING...                  │ visited  viewed   added   cart   checkout │
                                              │ ███████  █████    ███     ██     ▌        │
 (what happened after landing: no data)       │  702      310      88      61     9       │
                                              │     -56%     -72%🔴   -31%    -85%🔴      │
                                              │ bars grow on mount, numbers count up,     │
                                              │ biggest leak pulses red                   │
                                              ├──────────────────────────────────────────┤
                                              │ Checkout clicks  better_prices 6 · stripe 2│
                                              ├──────────────────────────────────────────┤
                                              │ [Missed searches] [Top 10 searches]  ← toggle
                                              │  "lol boost eu" ×4    "cs2 knife" ×2      │
                                              └──────────────────────────────────────────┘
```

## §4 Steps

> ONE tracker TODO row. Decisions are locked — run all tasks in one go, show the full diff at the end, then commit once. The commit body opens with the 🚨 TODO block from task 1.

1. **SQL** (goes VERBATIM in the commit body under 🚨 TODO — Supabase SQL editor is Nikita's; before committing, copy `utm_stats`'s insert/select policy pair from `dev_readme-supbase-sql.md` in place of the comment):

   ```sql
   CREATE TABLE "23_buying_flow_events" (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at timestamptz NOT NULL DEFAULT now(),
     user_id text NOT NULL,
     session_id text NOT NULL,
     event text NOT NULL,
     product_id text,
     checkout_kind text,
     search_query text,
     results_count int,
     url text NOT NULL,
     locale text
   );
   CREATE INDEX "23_buying_flow_events_created_at_idx" ON "23_buying_flow_events" (created_at DESC);
   CREATE INDEX "23_buying_flow_events_event_idx" ON "23_buying_flow_events" (event);
   CREATE INDEX "23_buying_flow_events_user_id_idx" ON "23_buying_flow_events" (user_id);
   ALTER TABLE "23_buying_flow_events" ENABLE ROW LEVEL SECURITY;
   -- policies: copy utm_stats's insert/select pair verbatim (dev_readme-supbase-sql.md)
   ```

   `product_id` is text on purpose — other projects' ids are not all uuid. How you know it worked: the Playwright pass in task 6 counts rows.
2. **Types + config + util + action** per §5.1–§5.3. Hand-add the table to `types_db.ts` mirroring the `utm_stats` entry so `supabaseServer().from("23_buying_flow_events")` type-checks.
3. **Wire the adapter** — the 8 rows of §1's wire-up table. Every wire-up is one line calling `trackBuyingFlowEvent(...)`; a thrown tracking error never blocks a click (promise not awaited, `.catch` → console, UTMTracker posture).
4. **Read action** per §5.4.
5. **UI** per §5.5 — `BuyingFlow.tsx` mounted in `UTMDashboard.tsx` under the stat cards.
6. **Verify with Playwright** against the dev server: land → open a product → add to cart → open cart → press Request Better Prices → each press lands a row (assert via a select with the service client or the read action) → /stats shows every stage ≥ 1, toggle switches the search panel. Report counts as facts. Write the Cypress spec mirroring [utm-visit-tracking.cy.ts](../cypress/e2e/utm-visit-tracking.cy.ts) (cleanup task deletes the rows it created); it runs in CI, the local binary stays broken.
7. **Unit tests** per §5.6 with `pnpm test:unit`; then `pnpm type-check` + `pnpm lint`. Report warns/errs counts.
8. **Document.** `app/[locale]/dev_readme-user-flow.md` (capture side, docs-structure 0→4, incl. the identity-inheritance section — see Decisions §3) + root `dev_readme-ui-buying-flow.md` (style recipes with copy-paste class strings) + 2 CLAUDE.md map rows + `dev_readme-supbase-sql.md` block + one line in [dev_readme-utm.md](<../app/[locale]/dev_readme-utm.md>) §6: per-click stats live in `23_buying_flow_events`, the AGAINST there still holds for `utm_stats` itself. Update the tracker row.

## §5 Build spec

### 5.1 Types (signatures — implementer writes the bodies)

```ts
// app/ts/types/TBuyingFlowEvent.ts
export type TBuyingFlowEvent = "product_view" | "add_to_cart" | "cart_open" | "checkout_click" | "order_placed" | "search"

// app/config/buyingFlowConfig.ts
export const CHECKOUT_KINDS = ["request_better_prices", "stripe", "paypal", "metamask", "solana"] as const
export type TCheckoutKind = (typeof CHECKOUT_KINDS)[number]
export const BUYING_FLOW_STAGES: { event: "visited" | TBuyingFlowEvent; label: string }[]  // ordered: visited, product_view, add_to_cart, cart_open, checkout_click
export const BUYING_FLOW_CAPS = { searchQuery: 200, url: 2000, productId: 100 }

// app/ts/interfaces/IBuyingFlowEventInput.ts — what the util sends to the action
export interface IBuyingFlowEventInput {
  event: TBuyingFlowEvent
  storedDeviceId: string | null   // transport form from useDeviceIdStore — NOT the signed id
  sessionId: string
  pageUrl: string                 // location.href
  locale: string
  productId?: string
  checkoutKind?: TCheckoutKind
  searchQuery?: string
  resultsCount?: number
}

// app/ts/interfaces/IBuyingFlowStats.ts — what the read action returns
export interface IBuyingFlowStats {
  stages: { stage: string; label: string; visitors: number }[]   // ordered, "visited" first
  checkoutKinds: { kind: TCheckoutKind; clicks: number }[]
  searchMisses: { query: string; count: number }[]               // results_count = 0, top 10 by count
  topSearches: { query: string; count: number }[]                // all searches, top 10 by count
}
```

### 5.2 Identity — inherited from the utm widget, never minted here

- Client: `getVisitorId()` inside the util returns `useDeviceIdStore.getState().storedDeviceId` ([useDeviceIdStore.ts](../app/store/user/useDeviceIdStore.ts) — the persisted transport form, localStorage name `deviceIdStore`).
- Server: the action resolves the REAL id the same way `trackVisitAction` does — the `23_did` cookie first, else verify the sent transport form with the same deviceId utils. Import those utils; write no new crypto.
- Both missing/refused ⇒ skip the INSERT, return `{ skipped: true }`, console line. UTMTracker on layout mount owns minting; within ~1s of landing every visitor has an id, so skipped rows stay rare.
- `dev_readme-user-flow.md` gets its own section stating exactly this: the feature inherits the deviceId logic from the utm widget (link [dev_readme-device-id.md](<../app/[locale]/(site)/stats/dev_readme-device-id.md>)), which layer the client reads, what the server verifies, and that `user_id` therefore joins `utm_stats.user_id`.

### 5.3 Validation + rate limit (server action, never trusts the browser)

- Refuse: `event` outside the union; `checkoutKind` outside `CHECKOUT_KINDS`; `checkout_click` without a kind; `search` without a query; strings over `BUYING_FLOW_CAPS`; `resultsCount` negative or > 10000; a `pageUrl` that does not parse with `new URL`.
- On refusal: return `{ skipped: true }` + console line — same quiet posture as the utm insert; nothing user-visible.
- [RATE_LIMITS.ts](../app/sdk/RateLimitSDK/consts/RATE_LIMITS.ts) new entry, same shape as `categoryViewIncrement`:

  ```ts
  buyingFlowEvent: {
    windowSec: 60,
    maxAllowed: 60, // 60 events/min per visitor — a fast human browses ~1 click/sec
    key: (userId: string) => `buying-flow:event:${userId}`,
  },
  ```

### 5.4 Read action — `selectDBBuyingFlowStatsAction`

- Takes the same range input `selectDBUTMStatsAction` takes, so the section obeys the page's picker unchanged.
- `visited` stage = the distinct `utm_stats.user_id` count the dashboard already computes (reuse, scoped by `PROJECT_URL_FRAGMENTS` there).
- Other stages = distinct `user_id` per `event` from `23_buying_flow_events` where `created_at` in range. Per-project table ⇒ no url scoping filter needed.
- Checkout split = row counts of `event = 'checkout_click'` grouped by `checkout_kind`.
- Search lists = `event = 'search'` grouped by `lower(search_query)`, count DESC, limit 10; misses add `results_count = 0`.
- Follow the existing pattern: select rows, aggregate in TS (traffic is small; leave a one-line note that a SQL view takes over if volume grows).
- Leak math lives client-side in `BuyingFlow.tsx`: for neighbouring stages `(prev - next) / prev`, largest wins the red pulse; a 0-visitor stage shows "—" instead of a percentage (no divide by zero).

### 5.5 UI — `BuyingFlow.tsx`

- English text, NO locale keys (/stats is admin-only, plan-08 decision).
- Section card styled like the existing dashboard cards (border, rounded, dark surface). Title "Buying flow".
- Stage strip: 5 columns from `BUYING_FLOW_STAGES`; per column a bar whose height/width animates from 0 with framer-motion (`initial` → `animate`, stagger ~120ms — framer-motion is already a dashboard dependency), the distinct-visitor number counting up, the stage label under it.
- Between columns: the % fall badge; the biggest leak gets `bg-danger`-family styling + a framer pulse loop; others stay muted.
- Checkout row: one line per kind with count, `request_better_prices` first and visually strongest (it is the goal button).
- Search panel: default list = missed searches ("searched, found nothing"); toggle buttons swap to top 10 searches with `AnimatePresence`; each row shows query + ×count.
- Empty state: every stage 0 ⇒ one sentence: "No buying-flow events yet — rows appear after the SQL in the commit body runs and visitors click."
- `data-cy`: `buying-flow-section`, `buying-flow-stage-<event>`, `buying-flow-leak`, `buying-flow-toggle-misses`, `buying-flow-toggle-top`.
- Every style recipe used lands in `dev_readme-ui-buying-flow.md` with copy-paste class strings.

### 5.6 Unit tests (vitest "unit" project, node — pattern of [trackVisitAction.test.ts](../app/actions/trackVisitAction.test.ts))

- Action: refuses each §5.3 case; inserts on a valid input; resolves cookie before transport form; skips with neither; rate-limit branch.
- Aggregation: distinct visitors per stage; checkout grouping; miss vs top-10 lists; leak picks the right stage; zero-stage divide guard.
- Store wire-up: `increaseProductQuantity` sends on a NEW cartKey, stays silent on a quantity bump and on the sold-out early return ([cartStore.ts:108-109](../app/store/user/cartStore.ts)).

## §6 Port checklist (26, 14, any project)

Decision 1B: every project gets its OWN table and its OWN dashboard. In the target project the implementing session:

1. Re-runs §4.1's SQL with that project's prefix (`26_buying_flow_events`, …) — commit-body 🚨 TODO there too.
2. Copies the universal pieces unchanged; writes that project's `buyingFlowConfig.ts` (its checkout kinds — 26: its order button; 14: contact/hire click — its stage labels, its caps).
3. Finds the adapter points by ROLE, not filename — grep targets: the cart store action every add-button funnels into; the cart/order surface's mount; every checkout/goal button handler; the zero-results branch of search; the order-success screen.
4. Identity: reuse whatever id that project writes into `utm_stats.user_id`; a project with no utm capture mints a localStorage uuid inside `getVisitorId()` — that seam exists for exactly this swap, and its dev_readme-user-flow.md says which path it took.
5. Builds that project's own dashboard section behind its existing stats gate, reusing `BuyingFlow.tsx`; framer-motion missing there ⇒ the component's CSS-transition fallback renders the same strip.
6. Tests per that project's rules — 26 has NO test runner by Nikita's call: skip unit tests there, verify with Playwright only.
7. Labels through that project's i18n only where the surface is buyer-facing; admin dashboards stay English.

## Decisions made (do not re-open)

Nikita's answers, verbatim:

1. **Table:** "B - per project with it's own dashboard" ⇒ `23_buying_flow_events` here; each port re-runs the SQL with its own prefix and builds its own dashboard section.
2. **add_to_cart point:** "A" ⇒ one line inside `cartStore.increaseProductQuantity`, new-cartKey branch only.
3. **Visitor id:** "A but document it - you need to have dev_readme-user-flow.md that explains that it "inherate" this deviceId logic from another widget "utm"" ⇒ reuse the signed deviceId; the capture doc is NAMED `dev_readme-user-flow.md` and holds the inheritance section (§5.2).
4. **Transport:** "A" ⇒ one server action per event + rate limit; no client queue.
5. **Placement:** "yes on existing /stats page" ⇒ section in `UTMDashboard.tsx` under the stat cards.
6. **Searches:** "both - zero searches and other toggle button to show top 10 searches" ⇒ record EVERY search with `results_count`; UI defaults to misses, toggle shows top 10.

## Not in this plan

- Heatmaps, scroll depth, session replay recordings — different tool class; revisit only if the stage numbers raise questions they answer poorly.
- Bot filtering beyond the rate limit + id check — `utm_stats` lives with the same exposure today.
- A consent banner change — events hold no personal data; the visitor id is the one `utm_stats` already stores, queries and urls are the only payloads.
- A `BuyingFlow` Storybook story — story coverage belongs to the storybook arc (tracker row 13).
- Acting on what the numbers reveal (pricing, stock, copy) — separate plans once data exists.

## Code patterns to follow

- `dev_readme-code-patterns.md` — all 15 rules, incl. early returns and the banned-words list (a hook blocks writes containing them).
- `good-bad-examples.md` — §3 action/SDK shape, §4 response types, §9 naming.
- `commit-patterns.md` — the §4.1 SQL goes IN the commit body under 🚨 TODO; every run-it-yourself result is reported as a fact.
- [dev_readme-utm.md](<../app/[locale]/dev_readme-utm.md>) + [dev_readme-device-id.md](<../app/[locale]/(site)/stats/dev_readme-device-id.md>) — the postures §5.2/§5.3 mirror.
- [CartModal/dev_readme.md](../app/components/ui/Modals/CartModal/dev_readme.md) — the directory the checkout wire-ups touch.

Read them BEFORE coding; validate the final diff line-by-line before saying done.

➡️ Next plan: — (back to [plan-00-tracker.md](plan-00-tracker.md))
