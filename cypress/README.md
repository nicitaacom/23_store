# Cypress end-to-end tests

The legacy suite under `cypress/e2e/` covers customer and owner outcomes, including product create,
edit, delete permissions, optimistic updates, locale behavior, cart totals, checkout, and responsive
layout. Do not use its fixtures or mocked responses as evidence for Plan 25 production coverage.

## Legacy local suite

Install packages and browser binaries:

```sh
pnpm install
pnpm cypress:install-browsers
```

The legacy Cypress Node process requires `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. It receives them from the invoking
process and never loads `.env.local`. The service-role key stays in Node and is not exposed to the
browser. The legacy suite has its own fixed fixtures and local-server behavior.

Run it with:

```sh
pnpm test:e2e
pnpm test:e2e:all-browsers
```

WebKit exercises the browser engine used by Safari; Cypress does not launch Apple's Safari
application. WebKit support is experimental and needs Playwright's Linux browser libraries. Firefox
135 or newer is required. Edge must be installed on the runner. Local runs may use the browsers
installed on that machine.

## Weekly real-service suite

`pnpm e2e:weekly` targets `NEXT_PUBLIC_PRODUCTION_URL` and never switches to localhost based on
`NODE_ENV`. The scheduled workflow is `.github/workflows/cypress-weekly.yml`; it runs Monday at
03:23 UTC with no push, PR, deployment, manual, or external trigger. It checks production SHA and
read-only service health before any browser writes. A configuration, deployment, mapping, or
cleanup failure produces an incomplete/failed result and saved evidence.

The runner uses the existing production URL, Supabase URL/anon/service-role access, and matching
Stripe TEST key. Provider operations use the deployed application's existing runtime credentials.
Do not configure a second E2E provider account or copy OpenAI, Resend, AWS, R2, Redis, Pinecone,
Telegram, or Pusher server credentials into Actions. `NEXT_PUBLIC_PUSHER_APP_KEY` is already
configured. No OpenAI dollar limit is required; the suite runs a finite set of declared actions once
with application-bounded retries and records observed provider operation ids/outcomes.

Run-owned accounts use a password derived from the existing Supabase service key and exact run id,
plus unique addresses based on the production host. This lets a later cleanup recover test accounts
after an interrupted run without another secret. Apply
[scripts/e2e/create-test-users.sql](../scripts/e2e/create-test-users.sql) once to install the
exact-resource cleanup journal. The runner then creates and removes temporary Supabase Auth
accounts through the real Admin API.

The workflow currently has 19 specs in `cypress/monthly/`: product creation/edit/delete, background
translations and races, catalog/cart, support with uploaded PNG, real Resend notification, account
and authorization paths, category and provider pricing, AI tools/chat/memory, personalization
storage, Stripe TEST, Yandex address lookup, analytics, seeded navigation, and backup/maintenance.
This is partial coverage until every generated request/provider operation and awaited network call
has real runtime evidence. Alternative payment methods and wide-scope operations use their actual
sandbox or exact run-owned destination; if a safe success path is missing, the report stays
`INCOMPLETE` until the application supports one.

The actual requests and responses must be used. `cy.intercept` may observe a request and continue it,
or delay the unchanged response for a race test; it may not return a fixture or alter the response.
`pnpm test:e2e-infra` rejects API-response stubs in weekly specs.

Redis/Pinecone and Resend readbacks use authenticated `/api/e2e/*` routes and deployed runtime
credentials. Storage bytes are checked through their real public URL and deleted through the
owner-authorized storage route. Stripe TEST resources and exact run-owned Supabase rows are read back
and cleaned. The app routes verify admin-controlled account metadata and reject other accounts.

`pnpm e2e:inventory` writes the AST request inventory to ignored `artifacts/e2e/`. Every operation
begins unmapped and untested. Only a reviewed mapping plus real runtime evidence and independent
readback can pass it. Reports include request coverage, awaited-work coverage, cleanup status,
diagnostics, JUnit, screenshots, videos, and a repair handoff. GitHub artifacts are retained for 14
days; the job does not email reports.

Use the production site for a replay:

```sh
pnpm e2e:replay --spec cypress/monthly/product-edit.cy.ts --seed 250
```

For an explicit local production build, set `E2E_BASE_URL=http://localhost:3023` and start that
build yourself. It must still use real Supabase and real provider services. Never read or upload
`.env.local` or a full database export.

No production run should be described as passing until the production commit matches the runner,
runtime provider readbacks are present, and the cleanup report confirms no run-owned resources remain.
