# Weekly Cypress production checks

The Plan 25 suite uses a real browser against `NEXT_PUBLIC_PRODUCTION_URL`, real production app
requests, real Supabase records, the deployed application's provider credentials, and Stripe TEST.
It does not mock API responses. The schedule is Monday at 03:23 UTC in
`.github/workflows/cypress-weekly.yml`.

## What Actions needs

The runner uses the existing GitHub configuration for:

- `NEXT_PUBLIC_PRODUCTION_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_STRIPE_SECRET_KEY`, which must be a Stripe TEST key matching the deployed app's TEST account

The deployed production app performs OpenAI, Resend, AWS/Lambda, storage, Redis, Pinecone, Telegram,
and Pusher work using its existing runtime configuration. Do not copy those credentials into Actions
or create a second provider account for E2E. `NEXT_PUBLIC_PUSHER_APP_KEY` is already configured;
the browser subscribes through the real deployed client and the server publishes through its runtime
configuration.

There is no OpenAI spending cap prerequisite. The suite runs its finite declared provider actions
once, Cypress retries are disabled, and retries are limited by application code. The local provider
action journal records operation, attempts, ids, and outcome; it does not estimate or cap dollars.

The workflow has no push, PR, deployment, manual, or external trigger. It checks out `development`,
compares the checkout SHA to the production deployment, performs read-only preflight, runs the
browser journeys, and uploads sanitized artifacts for 14 days. A repeated attempt of the same GitHub
run skips the job to avoid repeating provider actions.

## Supabase setup and run-owned data

Apply [scripts/e2e/create-test-users.sql](scripts/e2e/create-test-users.sql) once to create the
service-role-only `23_e2e_resource_registry`. It does not create permanent test accounts. The
runner creates four temporary Auth users for each run, tags each with admin-controlled
`app_metadata.e2e_suite = "23-store"` and the exact run id, and derives their password from the
existing Supabase service key plus that exact run id. This lets a later run recover an old test
account if the earlier runner stopped before cleanup. For accounts created with an older
one-time password, recovery first checks the immutable run marker, resets only that account's
password, and signs in to clean its dependent provider data. Cleanup deletes the users after
dependent resources are cleaned.

The resource registry records exact product, support, storage, AI-memory, worker, category, and
Stripe TEST ids. Cleanup uses exact owner/run markers and verifies absence. It refuses live or paid
Stripe sessions, keeps an Auth user while dependent cleanup remains, and fails the workflow when a
resource remains unresolved.

## Real provider verification and cleanup

- `GET /api/e2e/stripe-mode` is a read-only mode check. The runner and deployed app must both pass
  Stripe TEST checks before any write.
- Product translation completion is proved by actual translated Supabase values and the actual
  Pusher event. Actions does not need CloudWatch access.
- Email status is checked by `/api/e2e/resend-status`, which authenticates the run account and uses
  the deployed Resend key to verify exact provider id, recipient, subject, and delivery event.
- AI memory readback and cleanup use `/api/e2e/ai-memory`, which authenticates an account using its
  immutable run marker and uses the deployed Redis and Pinecone keys to inspect/clear only that
  account's key and namespace.
- Storage uploads return their public URL. Cypress verifies exact bytes and SHA-256 through the real
  URL, deletes through the owner-authorized `/api/storage/delete` route, and verifies public absence.
  Cleanup does not need R2 credentials in Actions.
- Stripe TEST product, price, and Checkout readback/cleanup continue through the runner's existing
  Stripe TEST key and exact run-owned ids.

All test routes make actual provider calls or read actual persisted provider state. They do not
return canned results. The `/api/e2e/*` app routes require a bearer session for a test account whose
admin-controlled suite and run markers match the request.

The provider matrix in `cypress/coverage/provider-capabilities.json` also covers Supabase, Turnstile,
Google OAuth, Stripe TEST, PayPal sandbox, wallet test networks, Yandex, OpenAI, Redis, Pinecone,
Lambda, Pusher, Resend, Telegram, S3-compatible storage, Google price research, and CoinMarketCap.
Each provider uses the deployed app's existing configuration. Any real operation without a verified
success path and independent outcome remains incomplete.

## Run locally

```sh
pnpm e2e:inventory
pnpm e2e:preflight
pnpm e2e:weekly
```

Commands use only environment variables already present in the invoking process; they never load
`.env.local`. A local replay is explicit:

```sh
E2E_BASE_URL=http://localhost:3023 pnpm e2e:replay --spec cypress/monthly/product-edit.cy.ts --seed 250
```

The local production build must be started separately and still contacts real Supabase and provider
services. Do not use local mocks as evidence for the weekly real-service report.

## Coverage status

The source inventory in `artifacts/e2e/request-inventory.json` records actual route/provider
operations and awaited expressions. The latest audit found 636 request/provider operations and
1,019 required network/provider async expressions; the inventory regenerates every run and counts
may change with source. Reviewed mappings live in `cypress/coverage/request-map.json`. The 19 current
journeys are under `cypress/monthly/`, but they are not full coverage by themselves. A source mapping
is not runtime proof; every required operation needs a real result and independent verification.
`pnpm test:e2e-infra` checks the infrastructure and rejects response stubs in weekly specs.

No real provider or business flow is permanently excluded. Backup, restore, maintenance, and
alternative payments must use real sandbox services and exact run-owned targets. Never change
shared customer data or use live payment credentials. If a safe real success path is unavailable,
keep it `INCOMPLETE` until the app has a run-scoped path or a real disposable destination.

## Deployment status

The production test routes and application fixes must be deployed before the scheduled job can
exercise them. Compare `summary.json` deployment SHA with the checkout SHA. No successful production
run should be claimed until the job contains real provider readbacks and a complete cleanup report.
