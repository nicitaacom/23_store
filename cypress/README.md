# Cypress end-to-end tests

The suite tests customer and owner outcomes rather than page visibility alone. It covers:

- anonymous cart totals, better-price requests, and support messages;
- product create, read, update, and delete permissions;
- owner-only update/delete behavior and database deletion confirmation;
- optimistic price updates, server confirmation, and failure rollback;
- optimistic deletion and failure rollback;
- locale key parity, currency formatting, and language persistence;
- horizontal overflow at six supported viewport widths.
- Stripe and PayPal success paths through receipt sending, plus visible provider reasons when
  checkout session creation fails.

## Setup

Install packages and browser binaries:

```sh
pnpm install
pnpm cypress:install-browsers
```

The Cypress Node process requires these environment values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The Cypress setup reads values from the process environment and never loads `.env.local`. The
service-role key is read only by Cypress's Node process. Browser test code does not receive it.
Fixture products use the `cypress-e2e-` prefix, and test setup removes only rows with that prefix.

`prepareFixtures` in `cypress.config.ts` creates or refreshes the confirmed
`cypress-owner@joki.example` and `cypress-other@joki.example` accounts. Their
password is the `TEST_PASSWORD` constant in that file. Use the owner account in
the local Sign In modal to inspect authenticated customer and owner flows. The
fixture also clears `password_reset_required` after setting the test password,
so an account restored from a database backup can sign in. These accounts are
test data; do not reuse them for a real customer.

The regular push and pull request workflow no longer runs Cypress. The Plan 25 Cypress workflow runs
once monthly after its service and coverage checks pass. Its progress and remaining setup are
documented below.

## Run

```sh
pnpm test:e2e
pnpm test:e2e:all-browsers
```

Individual browser scripts are available for Electron, Chrome, Chromium, Edge, Firefox, and WebKit.
The Firefox script uses the modern Firefox binary downloaded by `pnpm cypress:install-browsers`
instead of relying on the host's potentially outdated Firefox package.

WebKit exercises the browser engine used by Safari; Cypress does not launch Apple's Safari application. Cypress WebKit support is experimental and its host needs Playwright's Linux browser libraries. Firefox 135 or newer is required. Edge must be installed on the runner that executes the Edge script.

The full browser matrix is best run in CI images that provide those host browsers and WebKit libraries. Local runs may use only the browsers installed on that machine.

## Monthly real-service checks

`pnpm e2e:monthly` is the scheduled production suite. It uses `NEXT_PUBLIC_PRODUCTION_URL`, checks that the
deployed commit matches this checkout, inventories runtime requests, and stops before browser writes
if a required service, budget, request mapping, or journey is missing. It never switches to local
server mode based on `NODE_ENV`.

The scheduled workflow is `.github/workflows/cypress-monthly.yml`. It runs once on the first day of
each month at 03:23 UTC. It has no push, redeployment, manual, or external trigger, so only that
monthly schedule starts this suite. Its browser job uses the real deployed website. Missing setup
produces an `INCOMPLETE` report and saved evidence; it does not count
as a successful test run. `pnpm e2e:replay --spec cypress/monthly/product-edit.cy.ts --seed 250` uses
the same real services and defaults to production. To replay against a local production build, set
`E2E_BASE_URL=http://localhost:3023` explicitly and start the build yourself; the runner only
connects to that server and still uses real backend/provider settings.

Run-owned browser accounts require `E2E_TEST_EMAIL_DOMAIN` with receiving test addresses and
`E2E_TEST_PASSWORD`. `scripts/e2e/create-test-users.sql` contains manual reproduction accounts and the
durable resource journal schema. Check this project's Supabase Auth schema before running the SQL;
the current Supabase endpoint was unavailable during setup, so the SQL has not been run or verified.
The runner journals exact account, product, file, support, AI-memory, worker, and Stripe TEST resource
IDs for cleanup. It does not delete by a broad product prefix or reset shared customer data.
Paid requests must reserve their estimated cost and downstream call count in the run's Supabase
ledger before starting. The same key cannot reserve a second call after a workflow retry. The report
shows actual provider cost only when it was observed; the configured estimate is not a billing cap.

`pnpm e2e:inventory` writes the AST request inventory to ignored `artifacts/e2e/`. Every operation
starts unmapped and untested. Only a reviewed mapping plus browser/request evidence, a real provider
or database ID, and an independent readback can count as passed. All 18 required journey files
are now authored: product create/edit/delete, background updates, races, catalog/cart, support with a real
uploaded PNG, account login/language/access checks, categories with account-scoped view counters,
replenishment email delivery to the run-owned account, AI tools and chat/memory, personalization storage,
Stripe TEST session creation, analytics/provider utilities, seeded navigation, a PayPal-method Stripe
TEST session, and signed-out backup/maintenance authorization checks.
The seeded navigation journey shuffles real product/cart, popular-catalog, and support-panel paths from
the recorded seed and saves the actual path sequence with its database checks.
The AI chat/memory journey checks a real assistant reply and the separate memory route, then reads the
conversation from Upstash and its vectors from that run-owned Pinecone namespace. It reserves one chat
call and three embedding requests before provider work. The product creation journey uses
`cypress/files/Sour Cream 30% Savya LITOVSKAYA.png`. All required spec files exist, but coverage is still
incomplete. The other-checkout spec leaves Klarna blocked because the current application route sends
requests to Klarna's production API host with credentials embedded in source; it has not been verified
against Klarna's sandbox and is never called by the suite. The backup/maintenance spec checks signed-out denials and records
the positive global operations as blocked until a separate database/storage target is available. The Stripe spec
currently verifies creation and rejection of an unpaid TEST session; successful, cancelled, and declined
card transactions still need coverage. Analytics currently verifies a real CoinMarketCap quote and one
run-owned demo import; admin stats, Turnstile, and remaining analytics operations still need coverage.
The authored account journey still needs signup, recovery, reset, avatar, and verification-email
coverage. The AI-tools spec checks category suggestions, price
research, AI price output, print-area analysis, and generated image bytes. The personalization-storage
spec uploads, reads and removes exact fixture bytes, checks a second account's denial, and verifies the
personalized-design insert. The app still has no owner-facing design read/delete route. No monthly
browser/service run has been performed.
The support journey also has a Playwright companion that keeps the customer and support accounts
open at the same time to check a live reply without reloading the customer page.

The latest local AST inventory finds 624 operations: 75 route handlers, 63 SDK operations, 446
service operations, and 40 realtime subscriptions. It maps all 624 operations and 1,216 async
expressions to reviewed scenarios; this is source mapping only, not runtime coverage. The expressions
include 1,078 awaits, 56 returned calls, 43 promise chains, 30 Promise.all groups, 4 fire-and-forget
calls, and 12 subscriptions. Lambda source and terminal execution evidence remain blocked by external
access, and the monthly preflight remains incomplete until its required real settings and services
are available.
Do not use the legacy Cypress suite as evidence for the real-service report; it keeps its existing
fixtures and local-server behavior.

Reports include request coverage, cleanup status, sanitized diagnostics, JUnit output, screenshots,
videos, and a repair handoff. The monthly Actions job sends the single report through Resend and records
whether Resend accepted it and whether its email-status API later showed delivery. Test/provider
spending requires `E2E_MAX_PROVIDER_COST_USD` and `E2E_MAX_PAID_OPERATIONS`; missing limits stop the
suite before any browser writes. Never read or upload `.env.local` or a full database export.
