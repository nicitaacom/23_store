# Plan 25 — Production Cypress tests with real services and monthly reports

**Target file:** `plans/plan-25-cypress-weekly-tests.md`
**Recommended executor:** GPT-6-luna · xhigh
**Priority:** P1
**Status:** maintain only in `plans/plan-00-tracker.md`
**Depends on:** existing plan-13 Cypress infrastructure

## 1. Objective and settled requirements

Test the production website through a real browser and real application requests. Exercise every
application request operation, including the awaited server-to-server work behind a button. Verify
both the visible result and the actual stored/provider result. Discover blocked UI, broken services,
incorrect optimistic updates, request races, and errors such as the two supplied screenshots.

The primary destination is `NEXT_PUBLIC_PRODUCTION_URL`, currently `https://www.jokik.fi/`. The full
suite runs against that deployed site once per month. Localhost is for reproducing defects and collecting additional
source execution evidence; localhost must also use real Supabase and real external services.

These decisions replace the earlier simulation-based version of this plan:

- **Real API requests throughout the acceptance suite.** No canned responses, fake server success,
  mocked AI, fake payments, direct store updates standing in for UI behavior, or synthetic Pusher
  completion events. Existing mocked tests earn no real-service coverage.
- **Real Supabase and disposable real records.** Create test-owned products through the actual
  application creation flow; edit titles, descriptions, prices, stock, variants, and images; delete
  them through the actual application flow. Clean disposable resources immediately after each
  scenario finishes and background work settles, including when assertions fail.
- **Stripe TEST environment.** Use real Stripe test-mode API requests, products, prices, Checkout
  sessions, and test payments. Confirm the deployed app uses test mode before issuing payment or
  Stripe product mutations. The user's authorization covers Stripe TEST, not charges to live cards.
- **Every awaited request is accounted for.** Inventory source operations and their dependencies;
  connect each to an executable real-service scenario and outcome evidence. Missing coverage makes
  the report incomplete instead of disappearing behind a passing browser test count.
- **Click approximately every 250 ms.** Keep interacting while real requests and animations run.
  Measure that cadence; ordinary Cypress waiting must not hide disabled or obstructed controls.
- **All AI capabilities use real AI.** Remove the previous two-request cap. Keep costs low with small
  inputs, few disposable products, one minimal case per distinct capability/required branch, and no
  automatic paid retries. Cover product translation, price assistance, category suggestion, image
  generation, print-area checks, sales chat, memory/embeddings, and price research.
- Implement **tests, account setup, evidence, cleanup, and CI reporting**. Report application defects
  for a subsequent AI chat. Fix the test infrastructure in this plan; do not rewrite application
  behavior merely to make its tests pass.
- Run the full suite once per month to stay within the GitHub Actions free-tier allowance. The user
  reported 1,807 of 2,000 included minutes used (90%) and asked to reduce runs to one per month.
  Schedule it for the first day of the month at 03:23 UTC. Do not add manual, external, push, pull
  request, or deployment triggers. A redeployment must not start this suite.
- Report email: **`e2e-test-23-store@nicitaa.com` → `support@nicitaa.com`**, using `NEXT_RESEND_SECRET`.
  Include a copyable repair request with exact reproduction steps and evidence.
- Repository instructions prohibit reading `.env.local`, including through test runners. Supply
  credentials to local commands through exported environment variables and to GitHub Actions through
  secrets/variables. Keep actual credentials out of Git and evidence.
- Work on `development`. Resolve prerequisites in one upfront setup phase, then execute the entire
  plan without routine confirmation requests between tasks.

Generated inputs and expected business rules are necessary: unique titles, prices selected by the
test, and known initial quantities are valid. Assertions must compare actual requests, actual
responses, UI state, and readbacks against those inputs. Never manufacture a provider result to
satisfy an assertion or compare unpredictable AI prose with a hardcoded answer.

### Grounding from the repository

- `cypress.config.ts` uses Cypress 15.18.1, but previously used `NODE_ENV` to choose the target and
  reused fixed test accounts/IDs. The monthly suite uses an explicit production URL and run-owned
  accounts. It must receive environment values from its caller and never read `.env.local`.
- `cypress/e2e/` has useful journeys, but several replace API responses; migrate their relevant
  behavior to real calls. Cart/checkout hydration exceptions are currently suppressed in places.
- A source text scan found **947 lines containing `await` under `app/`**, excluding test/story files.
  This is a discovery count, not an accurate request count. Build an AST inventory before claiming
  coverage; include promise-returning calls without an explicit `await` too.
- `FormatTitleForm.tsx` and `FormatDescriptionForm.tsx` set global `useLoading`;
  `AdminPanelModal.tsx` and `AreYouSureModalContainer.tsx` use it to disable controls. Reproduce the
  reported blocked confirmation while a real translation request is pending.
- `app/api/products/translate-field/route.ts` contains the screenshot's `AI returned invalid JSON`
  error. Test the actual route and provider output, including persisted four-language translations.
- `app/functions/createProductFn.tsx` and `createProductHelpers.ts` invoke compression, pricing,
  Stripe, storage, Supabase, and Lambda. Initial insertion is not final translation completion.
- `app/api/products/translate-insert/invokeTranslateProductLambda.ts` can return after a 20-second
  handoff timeout while Lambda continues. A 200 response alone does not establish completion.
- `app/api/webhooks/prices/route.ts` considers all eligible products and deduplicates by week. Backup
  APIs also operate beyond one owner's rows. These need real isolated resources when operation scope
  cannot be restricted to disposable data; do not run global destructive cases over customer data.
- `.github/workflows/ci.yml` had obsolete release branches; the separate monthly suite has no
  deployment trigger.

## 2. Resolve prerequisites upfront

Before implementation, read `AGENTS.md`, the plans tracker, plan 13, this plan,
`dev_readme-eslint.md`, `dev_readme-code-patterns.md`, `good-bad-examples.md`, and
`commit-patterns.md`. Inspect existing code and available access before asking the user anything.

### One consolidated setup handoff

Perform all available checks and collect all remaining external requirements in one message:

1. Confirm `development`, current changes, Node/pnpm compatibility, browser binaries, Linux libraries,
   GitHub authentication, workflow-write access, secret access, and dispatch access. Use the existing
   installed Playwright dependency for extra browser contexts where needed. If OS setup needs sudo,
   resolve it now through the user's interactive terminal; never request a password in chat.
2. Inspect the environment already supplied to the process. Validate names and connectivity, showing
   only variable names and non-secret environment identity. Never read `.env.local`; do not replace
   missing real credentials with dummy values, a mock service, or a passing skip.
3. Identify the actual production deployment and commit. Compare configured Supabase project,
   provider accounts, storage, Pusher, and Lambda destinations with the deployed application's values.
   Changing runner credentials does not reconfigure a remote Next.js server or its Lambda.
4. Verify deployed Stripe mode using the actual server configuration and a provider read. Before any
   mutation, establish that it uses a test key; afterwards assert `livemode === false` on returned or
   retrieved resources. Product IDs alone do not identify Stripe mode. Runner-only `sk_test_*` is
   insufficient. Existing catalog products may reference live Stripe resources; create fresh test-mode
   products for all cases. If production uses live Stripe, report that mismatch upfront and arrange
   an explicitly approved deployment configuration/test target; do not silently change a working
   store's payment mode or redirect live cases to mocks.
5. Verify Supabase tables, columns, policies, roles, service access, real storage CRUD, Redis/Pinecone
   access, Pusher subscription/publishing, and Lambda invoke/log access. Audit the Lambda's real
   Supabase/Pusher/Stripe destinations, because its credentials may differ from this repo.
6. Collect the SQL needed for manual accounts and missing schema in a copyable handoff. Verify the
   Auth schema before finalizing it; supply SQL directly, then verify real login after execution.
7. Provision a routable test mailbox/aliases and a way to read verification/reset links for the
   authentication journeys. SQL-confirmed `.example` accounts below are only manual-reproduction
   accounts; use actual receiving addresses for signup, recovery, confirmation, and receipt tests.
8. Verify Resend authorization for the sender domain and real delivery to the agreed support inbox.
   Verify the dedicated test destinations needed for support/replenishment/Telegram notifications.
   Send test messages only to the user's agreed inbox or test-owned accounts/channels.
9. Gather PayPal/Klarna sandbox credentials, callback configuration, real provider test accounts,
   webhook registration, and wallet test-network credentials needed by payment cases. Use Stripe TEST
   as agreed. Other providers must also use their actual sandbox/test network APIs, with provider mode
   recorded. Get a separate explicit transaction budget before any live-money test; never infer it
   from the authorization to test the site.
10. For OAuth, human checks, wallet extensions, or third-party interactive login, resolve unattended
    access now. Do not fabricate a successful callback, set a verification cookie to bypass the
    behavior under test, or claim provider coverage from a manually created Supabase session.
11. For global backup/restore, storage cleanup/migration, key checks, and price research, arrange a
    real isolated database/storage/cache/provider destination with the same schema and application
    code. Set it up as an additional deployed target whenever possible. Record exact override names
    and target identities. Ordinary production product/support tests remain on the real production
    services. If required isolation/access is missing, report those rows as incomplete.
12. Calculate a minimal real-provider operation count and estimated cost/time for the entire mapped
    suite. Obtain any missing budget/settings once. Include image generation, embeddings, search,
    compression, Lambda, SDK retries, and provider resource cleanup; remove the old two-AI-call limit.
13. Establish any needed push/deployment authorization now. Finish reviewable implementation before
    the actual deployment/push step. GitHub admin access does not by itself prove token workflow scope.

### Configuration checklist

Keep this list synchronized with the source inventory; it is a starting checklist, not an excuse to
omit additional dependencies discovered in code.

| Purpose | Actual settings/access to check |
| --- | --- |
| Target/auth/DB | `NEXT_PUBLIC_PRODUCTION_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; deployed values and schema |
| Stripe | `NEXT_STRIPE_SECRET_KEY` on the deployed server, test account, provider test resources and callback URLs |
| AI | `OPENAI_API_KEY`, configured model access, provider budget; every AI feature enabled for the dedicated test accounts |
| Translation worker | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_AWS_REGION`, `23-ai-translate` configuration and terminal execution evidence |
| Realtime | `NEXT_PUBLIC_PUSHER_APP_KEY`, `PUSHER_APP_ID`, `PUSHER_SECRET`, real subscriptions in two browser sessions |
| Files/compression | `STORAGE_PROVIDER`, relevant R2/Supabase credentials and buckets, `NEXT_PUBLIC_R2_PUBLIC_URL`, `TINIFY_API_KEY_ARR`, storage usage/analytics access |
| Memory/rate limits | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `PINECONE_ENVIRONMENT`, `DEVICE_ID_ENCRYPTION_KEY` |
| Email | `NEXT_RESEND_SECRET`, existing support addresses; new `E2E_REPORT_FROM`, `E2E_REPORT_TO`, test mailbox retrieval access |
| Other integrations | Actual PayPal/Klarna test configuration, wallet test networks, `NEXT_COINMARKETCAP_SECRET`, Turnstile, OAuth, `TELEGRAM_BOT_TOKEN`, dedicated `TELEGRAM_CHAT_ID` |
| Maintenance | `PRICE_WEBHOOK_SECRET`, `CRON_SECRET`, actual credentials checked by maintenance routes; real isolated targets for global operations |
| Runner | New `E2E_SUITE`, `E2E_BASE_URL`, `E2E_RUN_ID`, `E2E_SEED`, `E2E_TEST_PASSWORD`, `E2E_MAX_PROVIDER_COST_USD`, `E2E_MAX_PAID_OPERATIONS` |

Default `E2E_BASE_URL` to `NEXT_PUBLIC_PRODUCTION_URL`; select localhost only explicitly. There is no
flag that disables required real AI while preserving a full PASS. Budget exhaustion produces an
INCOMPLETE report listing unfinished operations. CI receives allowlisted real settings through GitHub
Secrets; `.env.local` is never an artifact.

### Continue until the plan is implemented

Once setup is ready, execute all numbered tasks. An application error becomes a failing case and
repair report; keep implementing/running independent cases. Fix runner problems without asking the
user to do terminal work the AI can do. Maintain one prerequisite ledger so resolved permissions and
SQL are not requested repeatedly. A genuinely new unavailable external capability must be reported
honestly, with independent work continuing; unavailable coverage is never replaced with a fake pass.

## 3. What “every await request” means and how to prove it

Create `scripts/e2e/inventory-requests.mjs` with the TypeScript compiler API and a reviewed mapping in
`cypress/coverage/request-map.json`. Generate both machine-readable and Markdown inventories.

Scan the tracked runtime source: `app/`, root request middleware/proxy if present, server actions,
SDKs, provider wrappers, startup/configuration used by requests, and operational scripts invoked by
maintenance features. Inventory external worker code separately, including the Lambda source/version
and its requests. If worker source/log access is unavailable, state the precise evidence gap.

For every `AwaitExpression`, and for returned promises, `.then()` chains, `void` background promises,
`Promise.all`/`allSettled` children, async loops, subscriptions, and provider wrapper calls:

- Record file, line, enclosing function, expression fingerprint, operation kind, and dependency IDs.
  Stable IDs should survive unrelated line insertions; regenerate line references at the tested SHA.
- Classify network/DB/storage/auth/payment/AI/realtime operations separately from local async work
  such as body parsing, file decoding, timers, imports, and rendering. Account for local work and its
  parent scenario; do not label every `await` a separate API endpoint.
- Expand dynamic destinations and branch conditions: each supported update field, provider, HTTP
  method, authenticated role, and alternate business operation needs its own mapping. One successful
  `/api/products/update` stock request does not cover title, image, price, or variant updates.
- Track fixture setup, verification readbacks, and cleanup separately. Inserting a product with the
  service-role key during setup does not cover creating a product through the application's UI/API.
- Map each operation to a scenario, required configuration, disposable resources, expected success
  or negative behavior, evidence source, and cleanup. Also map protected/validation failure paths to
  real denied/invalid requests without triggering unrelated provider side effects.
- Resolve wrappers including `app/sdk/BaseSDK.ts`, Supabase query builders, Stripe/OpenAI SDKs, Redis,
  Pinecone, S3 commands, native fetch, streams, and worker callbacks. A grep result is not completion.

### Runtime evidence and coverage gate

Each mapped operation has a runtime status: `passed`, `failed`, `not_exercised`, or
`blocked_by_configuration`. Non-request/deleted/unreachable classifications require a source-based
reason; they remain visible in the inventory. Never exclude a difficult feature just to reach 100%.

A passed business operation requires:

1. A browser action or genuine authenticated route/webhook request reached the deployed app.
2. The real downstream provider/DB call executed; record request/resource IDs or correlated trace
   events. An initial 200/202 or an optimistic card is insufficient.
3. Its intended result was independently verified: DB readback, provider retrieval, object bytes,
   delivered message, confirmed test payment, or actual worker completion.
4. UI state, persistence after reopening/reloading, and cleanup match the operation's contract.

Record `operationId`, tested commit/deployment, target, scenario, run/test IDs, start/end time, request
or provider ID, outcome, and verification references. Capture pending operations at teardown. For
Supabase responses that resolve with `{ error }`, HTTP 200 error bodies, ignored `allSettled` failures,
and fire-and-forget promises, a resolved JavaScript promise alone is not success.

Use browser request observation plus server/worker/provider logs and readbacks. Where existing logs
leave a branch ambiguous, add minimal **observational** operation-start/completion/error tracing at
the relevant call site, retaining arguments, return values, authentication, error propagation, and
concurrency. Buffer trace records out of the critical path, redact data, and make evidence retrievable
through existing authenticated operational access. Deployment of that observability must be part of
the upfront access checklist. Local execution evidence does not establish that production ran the
same branch. Do not add a public endpoint exposing test controls or secrets.

Regenerate the inventory in CI. Fail the coverage gate for newly unmapped operations, missing expected
real execution, stale mappings, unfinished worker work, or a missing required target. A successful
route test must not automatically mark every nested call as executed. Both a real success scenario
and mapped real rejection/recovery scenarios are required; provider error branches that were not
actually reached remain explicitly unexercised.

Supplement runtime assertions with generated seeded journeys so fixed scenarios are not the only
coverage. Neither a static call inventory nor random clicking proves every possible ordering; report
operation coverage and sequence coverage separately.

## 4. Implementation tasks, in order

### Task 1 — Build the inventory and finish the setup gate

Implement the scanner/mapping and enumerate every actual dependency before writing journeys. Reuse
existing test helpers and established types. Produce the consolidated setup handoff from section 2,
including copyable SQL, provider destinations, payment mode, mailbox access, worker access, budget,
and all OS/GitHub permissions. Resolve setup while completing independent test infrastructure work.

### Task 2 — Add account SQL for manual reproduction

Provide `scripts/e2e/create-test-users.sql` and paste its runnable contents into the setup handoff and relevant commit body.

These persistent accounts are for manual reproduction. Automated jobs use separate run-owned accounts so CI and a manual session do not reset each other’s state.

The SQL must:

- Create confirmed Supabase email/password users.
- Create matching email identities.
- Create `23_users` with the correct application roles.
- Create `23_users_cart`.
- Set `password_reset_required=false`.
- Refuse to overwrite an existing account without the test-suite marker.
- Leave existing carts unchanged on rerun.
- Run in one transaction.

Supabase email identities belong to the Auth user; creating only a `23_users` row does not create a login. Validate the installed Auth schema before using this SQL. [Supabase identities documentation](https://supabase.com/docs/guides/auth/identities)

Use this template, replacing the password placeholder locally before execution:

```
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  test_password text := 'REPLACE_WITH_E2E_TEST_PASSWORD';
  account_record record;
  test_user_id uuid;
  existing_marker text;
BEGIN
  IF test_password = 'REPLACE_WITH_E2E_TEST_PASSWORD'
     OR length(test_password) < 16 THEN
    RAISE EXCEPTION 'Set a test password with at least 16 characters';
  END IF;

  FOR account_record IN
    SELECT * FROM (
      VALUES
        ('e2e-23-owner@joki.example', 'e2e_23_owner', ARRAY['USER']::text[]),
        ('e2e-23-other@joki.example', 'e2e_23_other', ARRAY['USER']::text[]),
        ('e2e-23-support@joki.example', 'e2e_23_support', ARRAY['SUPPORT']::text[]),
        ('e2e-23-admin@joki.example', 'e2e_23_admin', ARRAY['ADMIN']::text[])
    ) AS accounts(email, username, roles)
  LOOP
    SELECT id, raw_user_meta_data ->> 'e2e_suite'
      INTO test_user_id, existing_marker
      FROM auth.users
      WHERE lower(email) = account_record.email;

    IF FOUND THEN
      IF existing_marker IS DISTINCT FROM '23-store' THEN
        RAISE EXCEPTION 'Account is not marked as test-owned: %',
          account_record.email;
      END IF;

      UPDATE auth.users
      SET encrypted_password =
            extensions.crypt(test_password, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = test_user_id;
    ELSE
      test_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change, email_change_token_new,
        email_change_token_current, reauthentication_token
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        test_user_id,
        'authenticated',
        'authenticated',
        account_record.email,
        extensions.crypt(test_password, extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'username', account_record.username,
          'e2e_suite', '23-store'
        ),
        now(), now(), '', '', '', '', '', ''
      );
    END IF;

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      test_user_id,
      test_user_id::text,
      'email',
      jsonb_build_object(
        'sub', test_user_id::text,
        'email', account_record.email,
        'email_verified', true,
        'phone_verified', false
      ),
      now(), now()
    )
    ON CONFLICT (provider_id, provider)
    DO UPDATE SET
      identity_data = EXCLUDED.identity_data,
      updated_at = now();

    INSERT INTO public."23_users" (
      id, username, email, roles, providers,
      email_confirmed_at, password_reset_required
    )
    VALUES (
      test_user_id,
      account_record.username,
      account_record.email,
      account_record.roles,
      ARRAY['credentials']::text[],
      now(),
      false
    )
    ON CONFLICT (id)
    DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email,
      roles = EXCLUDED.roles,
      providers = EXCLUDED.providers,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      password_reset_required = false;

    INSERT INTO public."23_users_cart" (id, cart_products)
    VALUES (test_user_id, '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

COMMIT;

SELECT id, email, roles, email_confirmed_at, password_reset_required
FROM public."23_users"
WHERE email IN (
  'e2e-23-owner@joki.example',
  'e2e-23-other@joki.example',
  'e2e-23-support@joki.example',
  'e2e-23-admin@joki.example'
);
```

If `pgcrypto` is already installed in a different schema, adjust its function qualification during the setup audit. Confirm login through the actual auth UI after execution; successful SQL alone is insufficient.

Commit only the placeholder version. Supply the actual password through the local process environment
or GitHub Secrets; never store it in `.env.local`.

### Task 3 — Configure production runs, real fixtures, and immediate cleanup

Modify `cypress.config.ts`, add `scripts/e2e/fixtures.mjs` and
`scripts/e2e/run-monthly.mjs`. Set `E2E_SUITE=legacy|monthly|replay`, with explicit spec lists. The monthly
suite and replay default to `NEXT_PUBLIC_PRODUCTION_URL`. `NODE_ENV` does not choose the site. The
legacy Cypress job was removed from push and pull request checks; Cypress runs through the monthly
workflow only.

Use these rules for the real acceptance suite:

- Authenticate with the actual application login. Cache sessions only after real authentication;
  include origin/account in session keys and validate restored sessions. Run fresh login, signup,
  recovery, confirmation, and expiry scenarios independently.
- Keep service-role and provider secrets in Node/server contexts. Use privileged access for account
  provisioning, exact readbacks, and cleanup; use normal cookies/RLS for the action under test.
- `cy.intercept(method, path).as(name)` may observe traffic. Do not provide a static response, call
  `request.reply`, change response status/body, use `route.fulfill`, replace fetch/SDK methods, or
  replay recorded responses. Inspect all inherited support files for hidden mocks. Observing a real
  request is supported by [Cypress intercept](https://docs.cypress.io/api/commands/intercept).
- API-only maintenance/authorization cases use real `cy.request` or Node HTTP requests and the
  actual auth mechanism. Collect them explicitly: browser interception does not observe
  `cy.request` traffic. [Cypress request documentation](https://docs.cypress.io/api/commands/request)
- Keep ordinary animations active. Add stable `data-cy`, product ID, and rendered status attributes
  where needed. Other app changes are limited to the observational tracing described above.

Fixture lifecycle:

1. Generate a unique run ID, and scoped account/test IDs. Create dedicated owner, other-user, support,
   and admin accounts through real Supabase Auth; tag them with run/suite ownership metadata.
2. Create a minimal real product pool using the full UI creation pipeline. Prepare prerequisites
   with service APIs only when that setup itself is not the feature being asserted. Record how each
   fixture was created; direct DB insertion never satisfies the product-create coverage row.
3. Use unique request inputs, generated product IDs, test prices, small valid images, and exact
   ownership. Keep a two-product case for repeated/equal titles and concurrent operations. Assertions
   calculate totals from the actual chosen inputs and returned IDs rather than canned products.
4. Persist a resource journal as each service creates a record. Include Auth IDs, Supabase row IDs,
   Stripe product/price/session IDs, object keys, ticket/message IDs, Redis keys, Pinecone vector IDs,
   worker IDs, and notification references. Keep a durable run/resource registry for crash recovery;
   include its service-role-only setup SQL in the upfront SQL bundle.
5. After every completed scenario, settle/cancel background work and delete its disposable product
   through the actual application deletion route/UI. Assert DB absence, real Stripe test-resource
   deactivation, and removal of its actual uploaded files. Stripe resources which are only
   archivable must be marked inactive; do not claim physical deletion of provider records.
6. Cleanup also runs after assertion failure. Use exact recorded IDs plus account/run ownership;
   remove dependent files/messages before accounts when required. Restore disposable account
   settings. A cleanup error is a separate failure, preserving the original error evidence.
7. If a worker is still running or a request outcome is unknown, reconcile provider state before
   retrying/deleting. Never create a duplicate product/payment by blindly retrying. Retain a cleanup
   obligation until the worker stops; otherwise it may recreate a deleted row after the test ends.
8. The next run sweeps expired registry entries belonging to this suite and reports leftovers.
   Replace broad `cypress-e2e-*` product deletion and host-wide UTM deletion with exact ownership.
   Cleanup cannot reset other runs' carts, accounts, counters, pricing runs, or real user data.

In the default production target use only disposable ownership for writes. For an operation with
unscoped side effects, select the real isolated target from the prerequisite ledger and label its
coverage accordingly. Both targets use actual services; neither returns simulated results. A local
replay uses real environment values and the same ownership guards.

### Task 4 — Implement real business journeys for every mapped operation

Use `cypress/monthly/*.cy.ts`. The table is the minimum starting matrix. Extend it until the source
inventory has no unassigned operation; this list is not a replacement for that audit.

| Spec / source anchors | Actual requests and evidence required |
| --- | --- |
| `product-create.cy.ts`; `app/functions/createProductFn.tsx`, `createProductHelpers.ts` | Create from UI using `cypress/files/Sour Cream 30% Savya LITOVSKAYA.png`; real `/api/tinify`, pricing when needed, `/api/products/add`, `/api/storage/prepare`, actual signed upload, `/api/storage/complete`, `/api/products/translate-insert`, Lambda, Pusher, and final image update. Confirm real image bytes, Stripe TEST objects, DB row, final translations, worker completion, and UI after reload. |
| `product-edit.cy.ts`; `app/components/ui/Modals/AdminPanel/components/Format*Form.tsx`, product manage page | Edit title AND description through `/api/products/translate-field`; edit every supported `/api/products/update` branch: price, stock, images, translations, variants, category, personalization. Verify requested values, four locale fields, actual Stripe price/product changes where applicable, and preservation of unrelated fields. Test modal and `/products/[productId]/manage` entrypoints. |
| `product-delete.cy.ts`; `app/api/products/delete/route.ts` | Cancel/confirm/single/bulk delete of own generated IDs; verify Supabase absence, storage removal, Stripe test product and prices inactive, and cart/detail behavior. Double-confirm must not create multiple destructive requests with inconsistent results. |
| `product-background.cy.ts` | Create A; type B while A is pending; navigate/close/reopen; create two equal-title products; update another product; accept final real worker/Pusher updates exactly once. A late failure must not erase B's draft; no permanent global disabling. |
| `product-races.cy.ts` | Submit distinct real price/title/description updates 250 ms apart; same-field and different-field changes; concurrent products; update then delete. Compare final DB/provider/UI state with accepted action order; older completion must not overwrite a newer accepted edit. |
| `ai-tools.cy.ts`; `app/sdk/AISDK/AISDK.ts` | Real `/api/ai`, `/api/ai/generate-image`, `/api/ai/check-print-area`, `/api/ai/suggest-category`, `/api/fetch-prices`; actual supported model/provider calls. Validate generated image bytes/type/dimensions, usable print-area coordinates, valid category relationships, and finite positive pricing. Inspect fallback paths rather than accepting a fallback number as proof the upstream service worked. |
| `ai-chat-memory.cy.ts`; `app/libs/ai/chatMemory.ts` | Real `/api/ai/sales-assistant`, `/api/ai/sales-assistant/memory`, tool actions adding two distinct products, embeddings, Redis memory and Pinecone upsert/query. Start a new test conversation for upstream execution, then check the real cache-hit path separately; reopen session and confirm relevant memory. Delete only run-owned keys/vectors. |
| `pricing-categories.cy.ts` | Actual `/api/products/ai-pricing`, category insert/select/count/update/delete, category-view increment/select/sync, and `/api/products/price-proposals/[proposalId]/approve` and `/reject`. Generate real proposals through authenticated `/api/webhooks/prices` on the isolated target; verify real AI research, stored proposal, accepted Stripe/DB values, rejection, and real weekly deduplication. A duplicate-week response does not cover research. |
| `catalog-cart.cy.ts` | `/`, `/search`, `/products/[productId]`, `/popular-products`, filters, actual popularity/category requests, cart persistence. Rapid quantities/variants/remove/clear/cancel, totals, stock limits, stale/deleted products, and page reload. Use real cart rows and generated product values. |
| `support.cy.ts`; `app/sdk/SupportSDK/SupportSDK.ts` | Real `/api/ticket/get-ticket-id`, `/api/message/send`, `/api/messages/get-messages`, `/api/message/seen`, `/api/tickets/open`, `/close`, `/rate`; real attachment upload and Pusher. Two authenticated sessions observe the same test ticket; delivery/read/close/reopen/rating persist and reconnect catches up without duplicates. |
| `notifications.cy.ts` | Actual `/api/send-email`, `/api/send-email/request-replanishment`, `/api/products/replanishment-requests`, and `/api/telegram`; use test-owned products whose owner email routes to the approved inbox and a dedicated approved chat. Confirm actual provider/message IDs and receipt/delivery where accessible, plus counters and deduplication. |
| `auth-account.cy.ts` | Real `/api/auth/register`, `/login`, `/recover`, `/reset`, `/sync-public-user`, Supabase sign-in/sign-out, session renewal, verification/resend links, OAuth callbacks, `/api/account/language`, `/api/account/avatar`. Test expired session mid-edit, logout while pending, cross-user denial, and account persistence. Never fake an OAuth callback or successful CAPTCHA. |
| `personalization-storage.cy.ts`; `app/sdk/StorageSDK/StorageSDK.ts` | Real personalized-designs CRUD and storage prepare/upload/complete/list/download/delete/usage flows; signed expiry, rejected invalid/oversized files, replace/reorder, variants without images, authorization and actual bytes. Exercise each supported configured storage provider on its real scoped target. |
| `checkout-stripe.cy.ts`; payment route/functions | Real Stripe TEST `/api/create-checkout-session`, browser redirect to provider, test-card payment/cancel/decline, return, `/api/verify-payment`, `/api/customer`, `/api/payment/success`, receipt email, stock decrement and design state. Use the returned session ID and provider readback; a typed success URL is not a payment. Check repeated click/back/refresh do not charge or decrement twice. |
| `checkout-other.cy.ts` | Actual PayPal/Klarna sandbox sessions and callbacks, genuine signed PayPal webhook, CoinMarketCap quote, wallet extension signing and actual devnet/testnet confirmation. Observe real cancellation/rejection. Record unavailable provider setup as incomplete. Do not substitute a fake transaction hash, webhook signature, or provider success page. |
| `backup-maintenance.cy.ts`; `app/sdk/BackupSDK/BackupSDK.ts`, `app/libs/storage/` | On real isolated resources: actual `/api/backup/rows` export/import, `/auth-users`, `/files`, `/files/complete`, `/relink-storage-urls`, storage cleanup, migration/rollback scripts, authenticated `/api/webhooks/check-envs`. Restore a tiny actual archive and verify rows/bytes/auth mapping. Include multi-batch/cursor cases. Avoid wholesale restore/cleanup against customer resources. |
| `analytics-other.cy.ts` | Actual visit/buying-flow server actions, `/stats` filters/readbacks, rate-limit calls, Turnstile verification, popular/demo import, and discovered utilities. Link every remaining operation from the inventory to its role, real target, outcome assertion and teardown; a protected 403 does not cover the authorized path. |
| `seeded-navigation.cy.ts` | Real login/navigation/forms/search/cart/owner controls with seeded action ordering, generated data, real requests, visible-state and backend invariants. Publish visited actions and transitions; never choose only already-passing paths. |

Important source-specific cases:

- The Stripe creation route and the DB insertion route are separate; verify both actually execute.
  A service-role fixture product with a fake Stripe ID must not stand in for this journey.
- Product translation must reach Lambda and finish in real Supabase. Observe the real `product:created`
  event and the translated row; an event without a valid final record is a failure. Include a case
  that closes/reopens the panel while the worker is still running.
- Category/print-area/memory caches can bypass paid requests. Use fresh run-owned inputs for the
  upstream case and repeat the same input for cache behavior. A cache hit is not new provider coverage.
- AI output is nondeterministic. Assert schema, locale completeness, retained product facts and
  formatting, numeric bounds, valid references, and downstream usability; avoid exact prose matches.
- A real provider error such as empty/invalid JSON fails the healthy scenario and is attached to the
  report. Do not invent an invalid provider payload. Recovery tests use actual invalid inputs,
  revoked/expired test sessions, owned-resource conflicts, or genuine transport interruption.
- Some failures/alternate provider branches cannot be reliably triggered each week with valid
  credentials. Keep their actual coverage state visible; never claim the unobserved branch ran.
  Add dedicated real configuration cases where safe and available, or report the remaining gap.
- Inspect unfinished integrations such as the current Klarna route instead of treating their
  existence as working functionality. Report actual errors and missing configuration; do not hide
  them behind a canned response or alter payment behavior in this test-only plan.

### Task 5 — Add rapid clicks, real latency, and multiple browser sessions

Implement `cypress/support/rapidActions.ts`, `cypress/support/diagnostics.ts`, and
`cypress/scenarios/actions.ts`. For concurrent support/users, provider redirects/new tabs, wallet
extensions, and cases Cypress cannot control reliably, use `scripts/e2e/browser-sessions.mjs` with
the already installed Playwright package. A real browser driven by Puppeteer is also acceptable if
an extension requires it; install it only for that documented need. Browser choice never changes the
real-service requirement or permits fake provider responses. Merge supplementary browser results
into the same report and operation coverage gate.

Rapid-action behavior:

- Finish login, input preparation, and initial positioning before the sequence.
- Dispatch at target times 0/250/500/750 ms; freshly resolve each control with immediate hit-target,
  visibility and enabled checks. Do not wait for an animation, network completion, or disabled state
  to clear. No `force: true`; no fixture response.
- Record actual pointer/click timestamps and intended times. Target 250 ms with up to 100 ms runner
  tolerance. If the timing was not achieved, report it; a leisurely sequence earns no rapid coverage.
- Ordinary Cypress `.click()` waits for actionability. Use immediate-query/action options with
  `timeout: 0`, `waitForAnimations: false`, `scrollBehavior: false`; use actual browser input events
  from the supplementary runner if command scheduling cannot achieve the measured cadence.
- Do final request waits/readbacks after the sequence. A pending request is allowed; an unrelated
  next action becoming unusable is a failure. Only valid intentional states such as invalid submit,
  already accepted duplicate confirm, or the background of an active dialog may reject a click.
- Keep unrelated commands working after error, close/reopen, browser Back, Escape, and locale changes.
  Record focused element, covering element, rendered pending state, and route at failure.
- Do not rewrite optimistic stores or click through overlays to make the next step run.

Use normal real network latency first. Add controlled slow/offline/reconnect scenarios by throttling
or temporarily interrupting the test browser's actual transport. It is permissible to delay delivery
of an unchanged real server response for a dedicated race case; the real upstream request and side
effect must still occur and be independently verified. Label such timing cases. Never fabricate
status codes, JSON, provider events, or payment outcomes. A disconnected browser does not imply the
server canceled its work; reconcile the actual result before retrying.

Initial measurement budgets (record actual values; do not silently relax them):

| Measurement | Expectation |
| --- | --- |
| Optimistic product/cart feedback | Within 250 ms after accepted action |
| Next independent action | Usable at the next 250 ms step |
| Additional response-delivery delay | 3 seconds on a real response; UI remains usable |
| Connection interruption | 10 seconds, followed by real reconnect and reconciliation |
| Ordinary DB/API persistence | Within 15 seconds after server response, excluding intentional transport delay |
| AI field response | Within 90 seconds; record provider and server timeout separately |
| Product translation worker | Terminal worker result and UI/DB confirmation within 10 minutes |
| Other long provider operations | Explicit deadline established from the actual operation in preflight; never an unlimited wait |

Screenshot regression A: create disposable product A through the real pipeline; start an actual
field translation on an existing test product; at 250 ms attempt another edit, close, Escape or Back.
If another unsent draft triggers a confirmation dialog, its continue/discard/close buttons must be
usable. Continue preserves that draft; discard affects only that draft. A queued background job is
not by itself an unsent draft. Test while the real Lambda job is pending as well.

Screenshot regression B: actually edit title and description in both the panel and manage page.
Assert real translated DB fields and responsive controls. If the real provider returns invalid JSON,
record the real route response, correlation ID, pending state, and recoverability. Keep this failure
visible in the monthly email; do not hardcode a valid JSON result in the test.

Run full behavior on Chrome at 1440×900 and critical rapid cases at 390×844 and 320×480. Run the
critical dialog/edit/cart/support/navigation subset in Firefox with real requests. Include English
and Russian for the screenshot cases, and fi/en/ru/se language checks. Cover costly upstream
operations once in the main lane unless a second execution is needed to prove a distinct race or
browser behavior; all repeated requests that do occur remain real.

Seeded exploration: execute seeds 25, 250, 20261012, plus one derived from the run ID, with 50 actions
per seed on desktop and mobile. The registry defines role, state, selector, actual request mapping,
expected result, resource ownership, and paid-operation budget. Use inexpensive real navigation/cart
operations often and budget each paid action explicitly. If an action ought to work but is blocked,
fail and record it rather than picking an easier action. Log coverage of every registered action and
state transition, and preserve the sequence for replay. These generated sequences supplement the
explicit operation scenarios.

Diagnostics must catch exceptions/rejections, transient error toasts, console errors, unexpected
non-2xx responses, HTTP-200 error bodies, pending work that never terminates, duplicate writes,
unexpected provider mode, and inconsistent UI/DB/provider results. Register real expected rejection
scenarios narrowly before acting and assert recovery. Remove inherited hydration suppressions from
monthly execution. Capture sanitized action/request/provider timelines continuously, before teardown.

### Task 6 — Schedule one monthly real-service run and control costs

Create `.github/workflows/cypress-monthly.yml` on `development`:

```yaml
on:
  schedule:
    - cron: "23 3 1 * *"
```

The schedule starts one run on the first day of each month at 03:23 UTC. GitHub may delay its start.
The workflow has no `push`, `pull_request`, `deployment`, `workflow_dispatch`, or
`repository_dispatch` trigger, so code pushes and redeployments do not start it. Keep one serialized
run per month; do not add a second browser workflow or automatic rerun. The workflow must exist on
the default branch for its schedule. [GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)

Run inventory, preflight, one production Chrome run, cleanup, coverage, and reporting serially inside
this single monthly workflow run. Check the deployed revision, compare reviewed mappings, verify
destinations/access/Stripe TEST mode and the stale resource journal, and stop before browser actions
if a required check is incomplete. Do not add browser-matrix jobs or extra triggers that consume more
Actions minutes. Set the job condition to the first run attempt so rerunning a scheduled workflow does
not spend another batch of Actions minutes. Local replay may reproduce defects using explicitly supplied process environment
values, but local results do not prove the production deployment passed. Report deployment lag when
source and production commits differ.

Install Cypress and Playwright browser binaries only after preflight passes. An incomplete setup must
not spend Actions minutes downloading browsers for a run that cannot reach its journeys.

Use bounded timeouts and `always()` collection/cleanup where applicable. Preserve partial evidence if
a process dies. Serialize operations with global side effects and paid provider lanes; use isolated
ownership for independent scenarios. Continue later scenarios after failures
so one product bug does not suppress support/payment coverage. Preserve the first failure.

Add scripts: `e2e:inventory`, `e2e:preflight`, `e2e:monthly`, `e2e:replay`, `e2e:cleanup`, `e2e:report`.
The monthly suite defaults to production. Document replay examples such as:

```sh
pnpm e2e:monthly
pnpm e2e:replay --spec cypress/monthly/product-edit.cy.ts --seed 250
E2E_BASE_URL=http://localhost:3023 pnpm e2e:replay --spec cypress/monthly/product-edit.cy.ts
```

Local replay connects to an already-running production build; the runner does not build or start a
server. Supply its real backend/provider configuration through process environment values. Selecting
localhost never activates MSW, mocks, dummy secrets, seeded fake Stripe IDs, or recorded responses.
Scope CI secrets to the jobs that need them; report delivery and application-email tests
both need genuine Resend access, through the appropriate actual server/runner configuration.

Cost controls:

- One fresh successful real execution per mapped paid capability/required branch; reuse its actual
  generated assets where subsequent scenarios allow it. Keep a small test catalog and short text.
- Zero Cypress retries for paid steps and no automatic paid job reruns. Persist the paid-operation
  ledger by run ID across workflow attempts. An explicit replay that makes more calls reports them.
- Include downstream Lambda/model fallback/SDK retries and embeddings in the operation ledger;
  browser request counts alone undercount cost. Report unknown usage honestly.
- Compute the required minimum budget before the run. Do not suppress image generation, pricing,
  chat, memory, or translation to fit the former two-request limit. A missing/insufficient budget
  is an upfront requirement or an INCOMPLETE result, never permission to return canned success.
- Provider account spend controls may apply to more than this suite; do not claim the runner's
  estimate is a hard provider billing cap. Stop starting paid actions at the agreed suite limit,
  settle already-started work, and retain the unexecuted coverage rows in the report.

Keep Quality and Storybook checks on `development` pushes and pull requests. Remove the recurring
Cypress job from that workflow so Cypress runs only through the monthly schedule. Existing mocked
tests may remain available for local use, but they are never included in real-service coverage totals.

Do not add an external or manual trigger: extra runs could exceed the user's remaining GitHub Actions
minutes. A redeployment is not a reason to run this suite; the next scheduled date is the only start.

### Task 7 — Send truthful reports and a repair request

Create `scripts/e2e/build-report.mjs`, `scripts/e2e/send-report.mjs`, and
`dev_readme-cypress-weekly.md`. Produce:

- `summary.json`, `report.md`, and `ai-handoff.md`.
- `request-inventory.json`, `request-coverage.json`, and readable coverage tables.
- JUnit results, screenshots/videos, actual click timestamps, network/provider/worker evidence,
  browser traces, visited transitions, and the cleanup/paid-operation journals without secrets.

Upload job-specific artifacts on success/failure with 14-day retention. Redact auth headers, cookies,
passwords, reset links, wallet secrets, signed object URLs, and unrelated customer data. Attach only
test-record payloads and bounded sanitized diagnostics. Inspect artifact collection so credentials,
Auth session files, full database exports, and source-embedded credentials do not get published. The
runner must never read `.env.local`.

Email from **`e2e-test-23-store@nicitaa.com`** to **`support@nicitaa.com`** via actual Resend and
`NEXT_RESEND_SECRET`. Use text and escaped HTML, plus an idempotency key for report-send retries.
[Resend send-email documentation](https://resend.com/docs/api-reference/emails/send-email)

Subject and meaning:

- `[23_store E2E] PASS`: every required real operation/target/scenario was exercised successfully,
  cleanup completed, and coverage is complete.
- `[23_store E2E] FAIL`: an actual application/provider/assertion failure occurred; also enumerate any
  coverage made incomplete by that failure.
- `[23_store E2E] INCOMPLETE`: configuration, access, deployment mismatch, budget, timeout, or missing
  evidence prevented full execution, without enough evidence to claim application success.

Include target URL/deployed SHA, runner source SHA, provider environment (especially Stripe TEST),
test counts, mapped/executed/passed/failed/unexercised operation counts, real service failures,
timing failures, coverage holes, actual/estimated cost, cleanup status, and GitHub artifact links.
A passing test count with untested operations must not produce a green full-site report. If exact
provider/deployed evidence is unavailable, state that directly.

Include a copyable handoff like:

```text
Fix the defect below in nicitaacom/23_store on development.
Read AGENTS.md, plan 25, dev_readme-eslint.md and commit-patterns.md.

Primary target: <production URL>
Deployed/source commit: <values>
Provider environment: <Supabase identity, Stripe TEST, other service modes>
Spec/test/operation IDs: <values>
Browser/viewport/locale/seed: <values>

Reproduction using fresh disposable records:
1. <real login and creation/edit steps>
2. <actual request and click at +250 ms>

Expected: <business behavior and persisted/provider result>
Actual: <observed failure>
Evidence: <sanitized actual response, trace/resource IDs, DB result,
           click timing, screenshot/video and Actions link>
Replay: <exact command; default target is production>
Cleanup: <completed resources and any outstanding worker/resource obligation>

Gather missing access/configuration upfront. Reproduce with real services,
fix the application, rerun this regression and relevant surrounding cases.
Preserve the real-service assertion; do not replace responses, force clicks,
suppress the failure, or loosen timing to make the test pass.
```

When an error email arrives, the user copies this handoff into a new AI chat. This plan delivers the
tests/report; that later chat fixes the app. Send one summary after all available jobs finish, not
one email per failing click. A Resend send failure must be visible in Actions; provider acceptance
and verified inbox delivery are distinct evidence.

### Task 8 — Validate the test system and finish documentation

Implement checks that prove the runner itself detects problems. Pure report/inventory tests may use
sample input records; they never count as application or real-provider coverage. The acceptance
suite has no mocked API responses.

Verify:

- AST discovery finds awaited and non-awaited operations, dynamic variants, and new unmapped calls.
- An unmapped/unexecuted operation or a legacy stubbed spec prevents a full real-service PASS.
- Real success is verified from UI plus downstream state; a resolved error or fallback is reported.
- Real denied/invalid requests, controlled connection interruption, and recovery are accounted for
  without suppressing unrelated errors or hiding a server operation that completed after disconnect.
- Rapid-click timestamps, actual disabled-state failures, and continued unrelated interaction are
  measured while genuine upstream work is pending.
- Test data is isolated and immediately cleaned; failed/aborted runs and late workers leave durable
  cleanup obligations which are reconciled, rather than forgotten.
- Stripe resources are test-mode throughout; real charge/session/receipt verification is performed.
- Replayed seeded journeys repeat choices with newly created real IDs; no recorded responses are used.
- Missing access, SQL, secrets, sender verification, budget, deployed code, or worker evidence yields
  one actionable prerequisite report and a non-green result for the missing coverage.
- Application failure in one scenario does not stop unrelated scenarios, cleanup, or reporting.
- A real monthly run sends the agreed email and includes a usable AI handoff for failures.
- Run lint, type checking, the appropriate infrastructure checks and production build where needed;
  do not silently claim an application failure has been fixed when only the test was implemented.

Update `cypress/README.md`, `dev_readme-ci.md`, `dev_readme-cypress-weekly.md`, `.env.example`,
`env.d.ts`, and the plan-25 tracker row. Document account SQL, real destinations, default production
URL, Stripe TEST verification, supplementary browser use, inventory generation, all request mappings,
provider/worker evidence, cost limits, cleanup, replay, schedule and external trigger.

Follow `commit-patterns.md` for completed implementation commits. Put any runnable setup SQL directly
in the handoff/commit body and genuine user-owned settings in its TODO block. Activate the reviewed
workflow on development under the authorization established upfront. Do not run real tests merely
because this document is being edited; execution is the next implementation task.

## 5. Acceptance and honest completion

The infrastructure may be implemented while the website has failing tests. Report those separately:

- **Infrastructure delivered:** inventory, real requests, browser journeys, resource isolation,
  teardown, CI scheduling, email and repair handoff actually work.
- **Application health:** only real observed outcomes count. Failures remain red and actionable.
- **Coverage:** every discovered awaited request and related async request has a mapped disposition;
  required operations without actual execution evidence remain unexercised/incomplete.
- **Environment:** production is the default; real Supabase, Stripe TEST and actual services are used.
  Additional real isolated/local targets are named and their results are not relabeled production.
- **Responsiveness:** measured 250 ms interactions run while real background requests continue.
- **Data:** disposable products are removed as each scenario settles, provider resources are cleaned
  or archived as supported, and late workers/crashes are reconciled.
- **Remaining work:** list actual bugs, external setup gaps, cost limits, and evidence gaps. Do not
  describe a partial request sample or a mocked test run as testing every request successfully.

The executing AI should finish the complete runner and report all observed defects in this plan,
then provide the user with the email/handoff for a separate application-fix chat. No mocked response,
missing provider, skipped expensive feature, or successful optimistic animation can satisfy a real
API request's acceptance requirement.
