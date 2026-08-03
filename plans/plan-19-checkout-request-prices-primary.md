# plan-19 — Request Better Prices becomes the main checkout action

**Priority:** P1
**Screenshot:** none — reported from the running app. Pressing Stripe lands on
`http://localhost:3023/%22https:/checkout.stripe.com/c/pay/cs_test_a1lXwx...%22` instead of Stripe,
and PayPal does not go through either.
**Recommended model:** Sonnet · medium — two small defects with a known cause, plus one layout
change in one aside. No new architecture.
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** plan-18 (this re-groups the Solana button it added)

## §0 Root cause / why this file exists

Two separate defects, both live today.

### Defect 1 — the checkout URL is pushed as a quoted relative path

- `app/api/create-checkout-session/route.ts:43` returns `NextResponse.json(decodeURIComponent(session.url))`.
  `NextResponse.json` of a string writes the body **with the double quotes**: `"https://checkout.stripe.com/..."`.
- `app/sdk/ProductsSDK/ProductsSDK.ts:90` reads it with `postText`, and `postText` ends in
  `response.text()` (`app/sdk/BaseSDK.ts:89`), so the quotes stay in the returned string.
- `PayWithStripeButton.tsx:52` hands that string to `router.push`. A string that does not start with
  a scheme is a relative path, so Next builds `origin + "/" + encodeURIComponent(the whole thing)`.
- That is the pasted URL exactly: `%22` is `"`, and `https://` collapses to `https:/` under path
  normalization.

`app/api/create-paypal-session/route.ts:49` has the same `NextResponse.json(checkoutSession.url)` line
and `PayWithPaypalButton.tsx:52` the same `router.push`, so PayPal fails the same way.

### Defect 2 — the aside leads with the wrong action

`ProductsInCart.tsx` puts Request Better Prices and Clear cart in the actions block and (since
plan-18's fix at `a6284ca4`) renders all 4 payment buttons above them. Nikita's call: Request Better
Prices is the action he wants pressed. The payment options stay reachable, not first.

## §1 Where it lives / what changes

| Piece | File | Change |
| --- | --- | --- |
| Stripe route | `app/api/create-checkout-session/route.ts:43` | stop wrapping the url in JSON quotes |
| PayPal route | `app/api/create-paypal-session/route.ts:49` | same |
| Response types | `app/ts/namespaces/api.d.ts` | add the response type the two routes now return |
| SDK | `app/sdk/ProductsSDK/ProductsSDK.ts:89-101` | read the url the way the route sends it |
| Stripe button | `PaymentButtons/components/PayWithStripeButton.tsx:52` | push a real absolute url |
| PayPal button | `PaymentButtons/components/PayWithPaypalButton.tsx:52` | same |
| Cart aside | `CartModal/ProductsInCart.tsx:71-90` | Request Better Prices first, payment options second |
| Copy | `app/locales/en.ts` / `fi.ts` / `ru.ts` / `se.ts` | any new label the grouping needs |
| Docs | `CartModal/dev_readme.md` | §1 order of the aside, §5.4 flow, new TODO entries |

## §2 Terminology

- **Checkout session url** — the `https://checkout.stripe.com/...` address Stripe returns once a
  session is created. The buyer is sent there to enter card details.
- **Relative push** — `router.push("foo")` with no scheme. Next resolves it against the current
  origin, which is what turns a full url into `localhost:3023/%22https:/...%22`.
- **Primary action** — the one button in the aside styled to be pressed. Everything else is an
  option, not a rival.

## §3 Before / after

```
BEFORE                                      AFTER
route.ts                                    route.ts
 NextResponse.json(session.url)              the url is sent with no quotes around it
   -> body is "https://..."                    -> body is https://...

PayWithStripeButton.tsx                     PayWithStripeButton.tsx
 router.push('"https://..."')                router.push("https://...")
   -> localhost:3023/%22https:/...%22          -> checkout.stripe.com

cart aside (ProductsInCart.tsx)             cart aside (ProductsInCart.tsx)
 ORDER SUMMARY                               ORDER SUMMARY
 [MetaMask]                                  [ Request Better Prices ]  <- primary, filled
 [Solana]                                    [ Other ways to pay  v  ]  <- opens the 4 buttons
 [PayPal]                                    [ Clear cart ]
 [Stripe]
 [Request Better Prices]  <- outline
 [Clear cart]
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Review
> phrase: "approved - continue".

1. **Unblock.** Wait for the answers to the Open Questions below. They decide how the routes send the
   url, what "optional" means in the aside, and whether the PayPal button stays. STOP — no diff.
2. **Fix the quoted url.** Both routes, the two `api.d.ts` types, both SDK methods, both buttons.
   Reproduce first: add a product, press Stripe, confirm the `%22` address. Then confirm the fix
   lands on `checkout.stripe.com`. STOP.
3. **PayPal retest.** With step 2 in, press PayPal. If Stripe rejects `payment_method_types:
   ["paypal"]` for this account, the existing `payment.error.creating_provider_session` toast has to
   show the real reason instead of a silent failure. Write down what Stripe answered. STOP.
4. **Aside layout.** Request Better Prices becomes the filled primary at the top of the actions
   block. The 4 payment buttons move behind whatever Open Question 2 picked. Clear cart stays last.
   STOP.
5. **Copy.** Any new label goes into all 4 locale files, one line per key, same relative position.
   Do NOT run prettier on `app/locales/*.ts` — all 4 already fail `prettier --check` at HEAD on
   purpose, because the same-line-count rule in their header beats prettier's wrapping. STOP.
6. **Document it.** `CartModal/dev_readme.md` — update §1 to describe the new aside order, §5.4 for
   the Solana entry point, and close the matching TODO lines. STOP.

## Open Questions

Answer with a letter each. Nothing starts until all 4 are answered.

### 1️⃣ How do the two routes send the checkout url?

- **A (recommended)** — route returns `{ url }` as JSON, SDK returns `respJson.url` via `postJson`.
  Matches the SDK pattern written down in `good-bad-examples.md` §3, gives both routes a typed
  `API.*` response, and leaves the error branch as it is. Costs 2 new types in `api.d.ts`.
- **B** — route returns the bare url as text (`new NextResponse(session.url)`), SDK keeps `postText`.
  Smallest diff, no new types. Costs: the success body is untyped text, unlike every other route.

### 2️⃣ What does "optional" mean for the 4 payment buttons?

- **A (recommended)** — one "Other ways to pay" toggle in the aside that opens the 4 buttons. The
  aside stays short and Request Better Prices has nothing competing with it.
- **B** — keep all 4 visible, just smaller and below the primary. No new state, but 6 buttons stack
  in a 300px aside and the primary stops standing out.

### 3️⃣ How strongly is Request Better Prices styled?

- **A (recommended)** — filled success button, full width, top of the actions block. It reads as the
  one thing to press.
- **B** — keep today's outline style and only change the order. Lower risk, weaker signal.

### 4️⃣ Does the PayPal button stay?

- **A (recommended)** — keep it, fix the url first, then retest. PayPal through Stripe needs the
  method enabled on the Stripe account and only works for some currencies and countries, so the
  answer might be a dashboard setting rather than code.
- **B** — remove the button until PayPal is confirmed working on the Stripe account. The cart stops
  offering something that fails.

## Not in this plan

- **Guests get no check offer on Solana.** `DoYouWantReceiveCheckModal.tsx:57` calls
  `sendMoneyWithMetamask` hard-wired. Already written up in `CartModal/dev_readme.md` §5.7.
- **Server-side check of a Solana signature.** Settled AGAINST in plan-18 decision 4.
- **Klarna.** `{/* <PayWithKlarnaButton /> */}` stays commented out in `PaymentButtons.tsx:16`.

## Code patterns to follow

- `dev_readme-code-patterns.md` — all 15 rules, incl. early returns and the banned-words list.
- `good-bad-examples.md` — §3 for the SDK method shape, §4 for the `api.d.ts` response type, §9 for
  `<fnName>Resp` vs `response`.
- `commit-patterns.md` — every commit description opens with the 🚨 TODO block.
- `CartModal/dev_readme.md` — the directory this plan changes.

Read them BEFORE coding; validate the final diff line-by-line before saying done.

➡️ Next plan: — (back to [plan-00-tracker.md](plan-00-tracker.md))
