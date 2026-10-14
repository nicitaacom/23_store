# Plan 25 — Weekly Cypress checks against production services

**Target:** `plans/plan-25-cypress-weekly-tests.md`
**Executor:** GPT-6-luna, xhigh reasoning
**Branch:** `development`
**Schedule:** Monday, 03:23 UTC
**Workflow:** `.github/workflows/cypress-weekly.yml`

## Goal

Use Cypress in a real browser against the production URL. Click the real controls, send the real
application requests, and verify the results in Supabase and the real provider services. Do not
mock or replace API responses. A pass requires the user-visible result, successful actual requests,
and independent readback where the operation writes data.

The scope is every network request, provider operation, realtime subscription, and background job
found by `scripts/e2e/inventory-requests.mjs`, including every awaited call and returned promise that
reaches those operations. The inventory is regenerated from the current source on every run; do not
freeze the current operation count or declare a route covered from its source mapping alone. The
latest source inventory found 661 request/provider operations and 1,080 required network/provider
async expressions (1,311 total async expressions). The report must show runtime evidence for each
required operation id. An operation that is missing, skipped, blocked, mapped without execution, or
lacking independent verification keeps the run `INCOMPLETE`.

The suite must catch failures such as the supplied screenshots: translation errors that leave a
misleading toast, unsaved-change dialog controls disabled while another request is pending, and
buttons that become unusable during background work. It must also exercise quick repeated input at
about 250 ms between actions without waiting for animations or disabled states to finish.

## Rules the executor must follow

1. Target `NEXT_PUBLIC_PRODUCTION_URL`. Do not silently fall back to localhost. A local replay is
   allowed only when explicitly passed `E2E_BASE_URL`; it must still use the configured real Supabase,
   Stripe TEST, and real provider services.
2. Never mock an API response, AI result, provider result, database result, payment, or Pusher event.
   `cy.intercept` may observe a request and call `request.continue()`. It may delay the real response
   for a race test, but may not alter its status or body. `tests/e2e/no-mocked-responses.test.mjs`
   guards every weekly spec.
3. Keep provider keys in the deployed application's existing runtime configuration. Do not create a
   second E2E provider account or copy OpenAI, Resend, AWS, R2, Redis, Pinecone, Telegram, or Pusher
   server credentials into GitHub Actions. The already configured `NEXT_PUBLIC_PUSHER_APP_KEY` is
   sufficient for browser subscriptions; server publishing uses the deployed application's config.
4. The Actions runner needs only the existing production URL, Supabase URL/anon/service-role access,
   and a Stripe TEST secret key. The Stripe TEST key must match the deployed application's TEST
   Stripe account. The suite must stop before any payment or Stripe mutation if production reports
   live mode or if TEST-account readback fails.
5. Do not require an OpenAI dollar cap or ask the user to create one. The user controls OpenAI
   billing. The suite's call plan is finite: run each declared scenario once, keep inputs small, do
   not enable Cypress retries, and let application code perform only its bounded retries. Record
   actual provider request ids and attempts when the application exposes them. A missing spending
   limit is never a setup blocker. The run-owned image account must stay within the product's actual
   five-image daily cap; do not repeatedly generate images just to probe a blocked path.
6. Never read, source, copy, or otherwise access `.env.local`. Use variables already supplied by the
   runner or documented names from `.env.example`. Do not print or upload credentials.
7. Every disposable row, test account, uploaded object, Stripe TEST resource, support ticket, and AI
   memory resource must be registered under the current run id. Delete exact run-owned resources and
   verify absence before marking cleanup complete. Never delete by a broad prefix or reset shared
   customer data.
8. Do not call a journey covered merely because its spec exists. The report must show which real
   operations executed and which still lack runtime evidence. Production code must be deployed before
   claiming a production run tested that code.
9. No provider, route, business flow, or error path is permanently exempted from acceptance. If a
   production-wide mutation cannot safely use run-owned data, add a real run-scoped application path
   or use a separate disposable destination with the same real provider integration. Keep the
   affected operation `INCOMPLETE` until its actual success path and cleanup have been verified.
10. Measure elapsed time for each observed browser request and provider operation. Publish per-route
    and per-provider p50/p95 and enforce reviewed, operation-specific budgets once successful real
    runs establish the baseline. Keep interaction responsiveness separate: the next user action must
    remain usable at the requested 250 ms cadence while network work is pending.

## Repository and runtime paths

- Cypress setup and tasks: `cypress.config.ts`
- Production URL, service checks, deployment SHA, and Stripe TEST gate:
  `scripts/e2e/preflight.mjs`
- Weekly runner, per-run password derivation, artifacts, and cleanup invocation:
  `scripts/e2e/run-weekly.mjs`
- Password derivation for run-owned accounts:
  `scripts/e2e/run-password.mjs`
- Temporary Supabase Auth users, product fixtures, database readback, and resource registry:
  `scripts/e2e/fixtures.mjs`
- One-time Supabase cleanup-journal SQL: `scripts/e2e/create-test-users.sql`
- Exact cleanup and recovery: `scripts/e2e/cleanup.mjs`
- AST request/await inventory: `scripts/e2e/inventory-requests.mjs`
- Reviewed scenarios and request mappings: `cypress/coverage/request-map.json`
- Provider action inventory: `cypress/coverage/provider-capabilities.json`
- Coverage report and repair handoff: `scripts/e2e/build-report.mjs`
- Weekly schedule: `.github/workflows/cypress-weekly.yml`
- Product translation retry and validation: `app/api/products/translate-field/route.ts`
- Product background worker invocation: `app/api/products/translate-insert/invokeTranslateProductLambda.ts`
- Real storage authorization, upload, and cleanup: `app/libs/storage/authorization.ts`,
  `app/libs/storage/uploads.ts`, and `app/api/storage/*/route.ts`
- Run-account-only Redis/Pinecone readback and cleanup:
  `app/api/e2e/ai-memory/route.ts`, `app/libs/e2e/runAccount.ts`, and
  `app/libs/ai/chatMemory.ts`
- AI image allowance and verified purchase reset:
  `app/api/ai/generate-image/route.ts`, `app/libs/ai/imageGenerationQuota.ts`,
  `app/api/e2e/ai-image-quota/route.ts`, `app/api/verify-payment/route.ts`, and
  `app/api/wallet-payment/verify/route.ts`
- Run-account-only Resend delivery readback: `app/api/e2e/resend-status/route.ts`
- Support persistence and realtime: `app/api/tickets/open/route.ts`,
  `app/api/message/send/route.ts`, and `app/libs/pusher.ts`
- Supplied upload fixture: `cypress/files/Sour Cream 30% Savya LITOVSKAYA.png`

## Setup and production safety

1. Confirm the checkout is on `development`. Do not switch branches. Read this plan, `plans/`,
   `dev_readme-eslint.md`, and `commit-patterns.md` before implementation.
2. Read only environment variable names and non-secret service identity. Do not inspect
   `.env.local`, even through build or test commands.
3. Apply `scripts/e2e/create-test-users.sql` once to the existing Supabase project. It creates the
   service-role-only `23_e2e_resource_registry` table. It does not seed permanent test users.
4. The weekly runner creates four uniquely named accounts per run through the Supabase Admin API,
   with `app_metadata.e2e_suite = "23-store"` and the exact run id. It derives the password from
   the existing Supabase service key and exact run id, so a later run can recover accounts if a
   runner stops before cleanup. If it finds an account from an older one-time-password run, cleanup
   first verifies the admin-controlled run marker, resets only that account's password, then signs
   in to remove its dependent provider data. The email domain is derived from the production host;
   no password or provider credential is committed or printed.
5. Use the deployed production runtime credentials for all actual provider calls. App-side E2E
   readback routes must authenticate a Supabase access token and verify the immutable admin-set
   `app_metadata` run marker before exposing or deleting the signed-in account's own data.
6. `GET /api/e2e/stripe-mode` is read-only. Preflight must confirm both the deployed app and runner
   use Stripe TEST before the browser starts. Never attempt a live payment.
7. The scheduled workflow uses the existing GitHub repository secrets for the production URL,
   Supabase, and Stripe TEST. Those runner credentials are already present; `NEXT_PUBLIC_PUSHER_APP_KEY`
   is also configured. Do not ask for a duplicate E2E account, provider key, or OpenAI spending cap.
   OpenAI, Yandex, AWS/Lambda, Resend, Pusher, Redis, Pinecone, S3-compatible storage, Telegram,
   PayPal, CoinMarketCap, and Turnstile calls must use the real credentials already configured in
   the deployed application. Do not copy server-side provider keys into Actions.
8. The real production run requires this checkout's deployed commit to match the production
   deployment. If not, report the deployment mismatch and stop before writes. Do not claim that
   unshipped local changes were exercised.

## Real request and retry requirements

- Inventory route calls and awaited provider/database calls, including returned promises,
  `Promise.all`, subscriptions, and background jobs. Use `scripts/e2e/inventory-requests.mjs` and
  keep each operation mapped to a real scenario in `cypress/coverage/request-map.json`.
- For each operation, capture the real response, status, correlation id, provider id when available,
  and independent state readback. A required operation without evidence keeps the report incomplete.
- Keep Cypress `retries.runMode = 0`. Do not repeat paid actions from the test runner to hide a
  failure. If application code has a documented retry, verify its actual attempt count and result.
- For every real user action, assert the displayed success state and, for writes, read the exact
  resource back through the application or provider. For real failures, assert the actionable message,
  preserved draft/current state, and absence of unintended writes. Cause failures only through
  genuine validation, authorization, quota, network, or provider conditions; never synthesize a
  status/body in Cypress. If a failure condition cannot safely be produced, report it as incomplete.
- For product title/description translation, parse and validate the actual provider JSON before
  updating Supabase. On malformed output or a transient provider failure, the application retries
  once with a larger timeout (45 seconds, then 90 seconds), respects bounded `Retry-After`, and
  disables hidden SDK retries. It must not retry invalid input, missing credits, or rejected
  credentials. Verify all four locale values after success and verify the stored value is unchanged
  after final failure. The user sees a specific, actionable error.
- The interactive text routes `/api/ai`, `/api/ai/sales-assistant`, `/api/ai/suggest-category`,
  `/api/ai/check-print-area`, and `/api/products/translate-field` use `gpt-6-luna` with `xhigh`.
  The sales assistant uses the OpenAI Responses API for real function tools because GPT-6 Luna's
  xhigh tool calling is supported there; preserve and test both its plain text reply and real tool-call
  flows (add-to-cart and image generation), including their real downstream writes and cleanup.
  Provider success and actual provider error/credit responses must produce specific UI states. Never
  exhaust the owner's OpenAI credit or invalidate production credentials to force an error.
- For background translation, wait for the translated product to appear in Supabase and the real
  Pusher event to arrive. A Lambda acceptance response alone is not completion. Do not require
  CloudWatch credentials in Actions; the persisted translated output and event are the application
  result being tested.
- For email, the actual send request returns a Resend id. Verify delivery through
  `/api/e2e/resend-status`, which uses the deployed runtime credential and checks the exact run
  account recipient, subject, and terminal provider event. Do not pass `NEXT_RESEND_SECRET` to CI.
- For storage, verify the exact downloaded public bytes and SHA-256 using the returned public URL.
  Delete through the real owner-authorized `/api/storage/delete` route. The runner must not need R2
  credentials. Cleanup signs in as the exact run account and uses a short-lived bearer token.
- For Redis/Pinecone AI memory, read back the exact run-account key and namespace through
  `/api/e2e/ai-memory`; cleanup clears only that authenticated account's namespace and verifies it is
  empty. Do not pass Upstash or Pinecone keys to CI.
- AI Shop Assistant image generation has two independent limits for registered users: at most five
  image-generation requests per UTC day, and at most 50 completed images between
  server-verified purchases. A paid Stripe Checkout session (including Stripe-hosted PayPal) or a
  verified wallet transfer resets only the 50-image purchase-cycle count; it does not bypass the
  five-per-day request limit. The daily slot is reserved before the provider call, so retries and
  provider failures cannot bypass the cost guard; a request denied at the limit does not change the
  count. Verify the daily boundary with five real image generations on its own run account and a
  sixth click on the actual AI Shop Assistant button rejected before OpenAI; the UI must show the
  server's actionable quota message in both its toast and conversation. Verify the 50-image boundary by calling the
  run-account-authenticated `/api/e2e/ai-image-quota` fixture action, which derives the current limit
  server-side and prepares only that disposable account at limit-minus-one; then make one real image
  generation and confirm the next request is rejected before OpenAI. Read Redis-backed state through
  the same app route. Cypress and Actions must not access Redis directly, alter ordinary accounts,
  or stub image results. Guests do not receive a registered-account quota. Cleanup clears the exact
  run-owned account's image quota before deleting its Auth account.
- For backup, restore, maintenance, and other wide-scope operations, create or use a run-owned target
  and verify only that target is affected. Exercise the actual authorized success path and the real
  authorization denials. Never change shared customer data to make a scenario pass. If the app has no
  safe run-owned path, keep that operation incomplete and add the necessary scoped path before
  acceptance; do not label it permanently blocked or count a denial as success-path coverage.

## Required browser journeys

Each spec below must use the production UI and real app endpoints. Keep the run id in unique test
values. Use `cy.wait(250)` or the rapid action helper only to create the requested user cadence; do
not wait for an animation or request spinner before the next click.

| Spec | Real actions and required readback |
| --- | --- |
| `cypress/monthly/product-create.cy.ts` | Create a product from the Admin Panel using the supplied image. Exercise category suggestion, compression, Stripe TEST product/price, signed upload, real translation worker, Supabase row, four locale translations, and Pusher event. Edit title/description while navigating back at 250 ms; keep the unsaved dialog controls enabled. Exercise stock, price, variant, image, and personalization updates, then delete and verify each exact resource is absent. |
| `cypress/monthly/product-background.cy.ts` | Run actual title and description translations. While title translation is pending, press Browser Back and verify “Keep editing” stays enabled and the independent description draft remains. Check actual response, retry evidence, and Supabase state. |
| `cypress/monthly/product-races.cy.ts` | Send older and newer stock updates about 250 ms apart while the real older response is delayed. The final UI and database must match the latest accepted value. |
| `cypress/monthly/product-edit.cy.ts` | Edit title, description, price, stock, variants, category, images, and personalization on a run-owned product. Confirm saved state after reload and reject cross-account edits. |
| `cypress/monthly/product-delete.cy.ts` | Cancel a delete, confirm a single delete, and delete selected run-owned products in bulk. Verify no unrelated row or Stripe TEST resource changes. |
| `cypress/monthly/catalog-cart.cy.ts` | Add real products and variants, hit stock limits, try a sold-out variant, update quantities rapidly, reload, verify Supabase cart/totals, clear cancellation, and confirmed clear. Report cart/business-rule defects instead of changing server data to make the test pass. |
| `cypress/monthly/support.cy.ts` | Open a ticket, attach the real PNG, send customer and support replies from two browser sessions, mark messages seen, close/rate, and verify rows, event delivery, exact file deletion, and account isolation. |
| `cypress/monthly/notifications.cy.ts` | Use a run-owned out-of-stock product. Click replenishment three times 250 ms apart; expect one actual send and one counter update. Read its Resend id and delivery event through the production app. |
| `cypress/monthly/pricing-categories.cy.ts` | Create/rename/delete a unique category, verify its product count, and test run-account category-view increment/synchronization with stale and fresh updates. Include a real price research result. |
| `cypress/monthly/auth-account.cy.ts` | Test login, signup, recovery/reset, confirmation, language persistence, avatar upload, session expiry, authorization denial, and account separation with real Supabase/Auth calls. |
| `cypress/monthly/ai-tools.cy.ts` | Exercise real category suggestion, price research, AI price estimate, and print-area analysis. On isolated run-owned accounts, generate five real images and assert a sixth click on the real assistant button is rejected before OpenAI with its specific error visible in the toast and conversation; prepare a second account through `/api/e2e/ai-image-quota`, generate its 50th image once, assert the next request is rejected, and independently read both counters from Redis through the app. Verify downloaded bytes and actual OpenAI request ids for every generated image. |
| `cypress/monthly/ai-chat-memory.cy.ts` | Sign in as the run-owned account, expand the chat panel if needed, type in `[data-cy="ai-chat-input"]`, click `[data-cy="ai-chat-send"]`, and observe the real Responses API request. Assert the assistant reply is visible, then independently read the exact Redis/Pinecone messages and vectors through the production app route. Exercise both model tool calls from the UI (add-to-cart and image generation), verify their real downstream writes, and remove exact run-owned resources. |
| `cypress/monthly/personalization-storage.cy.ts` | Upload the exact fixture bytes, list and download them, verify byte size/hash, reject another account, create/read the real personalization row, and remove exact resources. |
| `cypress/monthly/checkout-stripe.cy.ts` | Create an actual Stripe TEST Checkout session from a run-owned cart. Verify product, price, image, address, amount, and `livemode === false`; retain the unpaid-session rejection case. Complete one provider TEST payment on an account with existing image usage, call the real payment verification route, independently verify its 50-image cycle count resets to zero, and refund/archive only that exact TEST payment resource during cleanup. |
| `cypress/monthly/checkout-other.cy.ts` | Exercise Stripe TEST checkout with each configured alternative method, including PayPal, and verify actual session state and exact run-owned item metadata. Complete PayPal only through its real Stripe TEST sandbox flow and verify the same account quota reset. Use only provider sandbox behavior; never call a live payment endpoint. Any configured method without a real sandbox success/readback stays incomplete. |
| `cypress/monthly/address-geocoding.cy.ts` | Type an address at about 250 ms per key, call the real Yandex suggestion/geocoder routes, select a result, and verify address/coordinates in an actual Stripe TEST session. Exercise bounded retry and malformed/unavailable provider responses through real service conditions only. |
| `cypress/monthly/analytics-other.cy.ts` | Call real CoinMarketCap data and import only one run-owned demo row. Verify provider response and exact row cleanup. Never mutate global statistics or customer rows. |
| `cypress/monthly/seeded-navigation.cy.ts` | Use a recorded seed to vary real catalog, cart, popular products, and support-panel navigation. Save the actual path sequence and assert requests/UI remain usable during rapid navigation. |
| `cypress/monthly/backup-maintenance.cy.ts` | Verify real signed-out and non-admin denials, then exercise each authorized operation against an exact run-owned backup/restore/maintenance target. Check before/after state and clean up the exact target. If a safe target does not exist, report the positive route as incomplete and implement scoped support before acceptance. |

### Explicit route-gap review

For every route in `cypress/coverage/request-map.json`, record the HTTP method, real UI action or
provider callback that reaches it, expected user-visible result, state readback, and cleanup. In
particular, keep explicit scenarios for routes that are easy to miss in a happy-path browser journey:

- Auth: `/api/auth/register`, `/api/auth/recover`, `/api/auth/reset`, and
  `/api/auth/sync-public-user` use run-owned accounts and real Supabase Auth.
- Payment: `/api/webhooks/paypal`, `/api/payment/success`, and `/api/verify-payment` are reached
  through a real Stripe TEST/PayPal sandbox checkout and verified against actual provider state.
  Verify that Stripe, Stripe-hosted PayPal, and each supported wallet route associate a completed
  purchase with the signed-in account and reset its 50-image cycle exactly once. The daily five-image
  quota remains unchanged. A wallet success requires the actual on-chain transaction/signature and
  server-side confirmation; an intent or client redirect alone is not a purchase. Never spend mainnet
  funds for E2E: if the production checkout does not support a safe real test network, report the
  wallet success/reset branch as `INCOMPLETE` instead of faking a transaction.
- Account/storage: `/api/account/avatar`, `/api/storage/usage`, `/api/customer`, and every
  `/api/storage/*` method use an authenticated run account and exact object/resource readback.
- Pricing/admin: GET/PATCH `/api/products/ai-pricing` and each price-proposal approve/reject route
  operate only on a run-owned product/proposal; verify Supabase and Stripe TEST values.
- Human verification: `/api/turnstile/verify` uses the configured Turnstile service and a real
  challenge/verification result. Do not fabricate a token or intercept the provider response.
- Preflight: `/api/e2e/stripe-mode` is observed as an actual production request before any Stripe
  write; a live-mode result stops the suite before mutations.

This list supplements the generated request inventory. It does not limit it: new routes and SDK or
provider calls discovered later also require a real scenario and evidence.

Keep the support Playwright companion only for the actual concurrent customer/support session. It must
open the deployed site and observe live changes; it cannot replace the Cypress API or provider checks.

## Fast-click and UI behavior cases

- Use the shared helper in `cypress/support/rapidActions.ts` for clicks close to 250 ms apart.
- After the first click, continue with the next user action even if the request or animation is still
  pending. A test may wait for the final response after issuing the rapid sequence.
- Capture whether a control was visible, enabled, and actionable at each click. A disabled control is
  a failure when the action should remain available during background work.
- Test double-click and triple-click on add-to-cart, delete confirmation, replenishment, save, and
  send-message controls. Assert one intended mutation where the product behavior requires
  idempotency; assert quantity changes exactly when the product behavior allows repeated adds.
- Exercise navigation away/back while a save is in flight, modal close during a request, Escape,
  refresh, expired session, transient 429/5xx, malformed JSON, empty JSON, and response timeout.
  Do not fabricate these network responses with Cypress. Use a real service response or mark the
  branch untested when a safe real condition cannot be produced.
- On every failed write, compare the exact row before and after. Preserve the user's draft and show a
  specific next action. A failed optimistic update must roll back only its own change, not overwrite
  newer user input.

## Cleanup and recovery

1. Register each resource immediately after the app/provider returns its exact id. Include the run id,
   owner id, resource type, exact resource id, and only the details needed to clean it.
2. Clean resources in dependency order: storage and AI memory first; then personalization/support
   rows; then product rows and Stripe TEST resources; test Auth accounts last.
3. Use the application storage-delete endpoint for R2 and Supabase Storage. Use the authenticated
   app memory endpoint for Redis/Pinecone. Use Supabase service-role access only for exact run-owned
   rows and Auth users. Use Stripe TEST API only for TEST resources and verify `livemode === false`
   before mutation.
4. Expire only open, unpaid TEST Checkout sessions. Refuse cleanup of a paid or live-mode session.
   Deactivate only the exact run-owned TEST product/price.
5. Read each object/row back after deletion. Keep unresolved cleanup records as `cleanup_required`;
   fail the job and retain the account needed to finish cleanup. Never delete an owner account while
   its dependent resources remain.
6. Retry transient cleanup requests in code with a bounded, increasing timeout. Do not ask the user
   to rerun a cleanup command before the workflow has attempted the application-supported retry.

## Workflow and reporting

- `.github/workflows/cypress-weekly.yml` runs only on the Monday 03:23 UTC schedule. No push,
  deployment, pull-request, manual, or external trigger. Serialize runs and skip repeated GitHub
  attempts so paid actions are not automatically repeated.
- Check out `development`; compare the target production deployment SHA before any writes.
- Generate the AST inventory, run read-only preflight, then run the production browser journeys only
  if URL, Supabase, deployed Stripe TEST, schema/journal, and deployment checks pass.
- Upload sanitized JSON, JUnit, screenshots, videos, coverage, cleanup, and repair handoff as a
  14-day GitHub Actions artifact. Do not email a report or require another Resend key.
- Distinguish `PASS`, `FAIL`, and `INCOMPLETE`. Missing mappings, skipped journeys, production SHA
  mismatch, no runtime evidence, or pending cleanup cannot be reported as a pass.
- Include exact scenario/spec, route/source path, current and expected values, run-owned resource id,
  request correlation id, observed response, independent readback, and reproduction sequence in the
  repair handoff. Redact access tokens, cookies, passwords, signed URLs, and secret values.

## Acceptance checklist

- [ ] The scheduled workflow runs against the configured production URL and verifies its deployed
      SHA before creating disposable resources.
- [ ] All weekly specs are guarded against mocked API responses; provider and application calls are
      real and use deployed runtime credentials.
- [ ] Every mapped request/provider operation has real runtime evidence or is explicitly listed as
      incomplete with a reason; no blocked or skipped operation is counted as passing.
- [ ] Stripe operations prove TEST mode and `livemode === false`; no live payment is attempted.
- [ ] A real paid Stripe TEST checkout and Stripe-hosted PayPal sandbox checkout each reset the
      run-owned account's 50-image cycle once; the daily five-image allowance remains independent.
      Wallet reset coverage uses a real safe test network or is explicitly `INCOMPLETE`.
- [ ] Rapid 250 ms interactions exercise enabled controls, optimistic rollback, races, and request
      failures without waiting for animations to finish.
- [ ] Redis, Pinecone, Resend, R2, Lambda, and Pusher checks use the deployed app's real runtime
      configuration; CI does not require copies of those provider credentials.
- [ ] Every run-owned Supabase, storage, provider, and Stripe TEST resource is deleted and verified;
      unresolved cleanup fails the job and preserves a recovery path.
- [ ] Reports and CI artifacts contain no secrets and state honestly which production revision ran.
- [ ] The report includes every generated request/provider operation and awaited network expression;
      the report remains `INCOMPLETE` while any required operation lacks passing runtime evidence.
- [ ] All configured real provider families have success-path checks, including actual AWS/Lambda
      completion, Resend delivery, OpenAI, Yandex, Stripe TEST/PayPal sandbox, Telegram, Pusher,
      Redis/Pinecone, S3-compatible storage, CoinMarketCap, and Turnstile.
- [ ] The run records observed latency by route/provider and compares it with reviewed operation
      budgets; the fast-click scenarios also prove controls remain actionable during pending work.

## Current implementation status

The workflow and 19 journey specs exist in the repository. They are a partial implementation, not
coverage completion: the latest source audit found 661 request/provider operations, 539 service
requests, and 1,080 required network/provider async expressions, with no passing runtime evidence yet
for this worktree. The app-side AI memory and Resend readback routes, scoped
cleanup changes, and fixes must be deployed before production can exercise those changes. The
production suite has not been verified against a matching deployed revision. Do not claim passing
weekly checks until a production run records evidence for every required operation and verifies
cleanup. The AI image spec now exercises the real five-per-day boundary and the 50th/51st
purchase-cycle boundary on isolated run accounts. Positive paid-purchase reset coverage for Stripe
TEST, Stripe-hosted PayPal, and a safe wallet test network remains incomplete until those real
payment paths produce runtime evidence and independently read back the reset.
