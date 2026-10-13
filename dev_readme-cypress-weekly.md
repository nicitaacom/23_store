# Cypress monthly real-service checks

The real-service runner lives in `scripts/e2e/` and the scheduled Actions workflow is
`.github/workflows/cypress-monthly.yml`. The default website is the deployed
`NEXT_PUBLIC_PRODUCTION_URL`; the monthly run refuses a different URL. A replay can use production or
an explicitly selected local production build, but always keeps real services and provider requests.

## Run and inspect

```sh
pnpm e2e:inventory
pnpm e2e:preflight
pnpm e2e:monthly
pnpm e2e:replay --spec cypress/monthly/product-edit.cy.ts --seed 250
pnpm e2e:cleanup
pnpm e2e:report
pnpm test:e2e-infra
```

Evidence is written under ignored `artifacts/e2e/`. The inventory scan includes route handlers and
detected service requests in the current `app/`, `scripts/`, and root request entrypoints. Its stable IDs need reviewed mappings in
`cypress/coverage/request-map.json`; generated source matches alone never establish coverage. The
report joins operation IDs to observed request evidence and requires a real provider/resource ID plus
an independent verification reference from the current run before marking an operation passed. Evidence,
cleanup results, paid-operation snapshots, and job failures from an earlier run are ignored. Unmapped,
failed, blocked, and unexercised work stays visible.

Run accounts use the configured real Supabase Auth service and a receiving test email domain. The
manual account and resource-journal schema SQL is in `scripts/e2e/create-test-users.sql`. The manual
password is a placeholder there; replace it locally only after verifying the deployed Auth schema.
Automated accounts are created per run, marked with suite/run ownership, and registered with exact
resource IDs. Cleanup verifies the row, object, key, vector, or account is absent where the provider
supports that readback. Background work remains an open cleanup item until terminal completion.

The source inventory does not include the external `23-ai-translate` Lambda source. Its deployed
revision and destination credentials still need confirmation. The product-create journey checks the
exact request ID in `/aws/lambda/23-ai-translate` and requires terminal `END` and `REPORT` records
without an execution error before closing the worker cleanup obligation. The monthly AWS identity
needs `logs:FilterLogEvents` on that log group; log message contents are not copied into evidence.
Global backup, restore, cleanup, and maintenance cases also need a separate database/storage/cache
destination with the production schema. They must never run against shared customer data.

The workflow runs once on the first day of each month at 03:23 UTC. It has no push, redeployment,
manual, or external trigger, and a repeated attempt of the same GitHub Actions run skips the test job.
This keeps the suite to one execution per scheduled run. This monthly cadence follows the user's
GitHub Actions free-tier notice: 1,807 of 2,000 included minutes had been used (90%). The workflow
serializes the run, caches the Cypress browser binary, uploads
sanitized artifacts for 14 days, and sends one report through Resend. The report distinguishes a
Resend API acceptance from a verified `delivered` event.

The service-role-only paid-operation ledger records estimated cost and downstream paid-call count
before a provider request. It reuses one stable run ID across GitHub workflow attempts and refuses a
duplicate reservation, so an uncertain earlier request is not blindly repeated. Provider billing
still has to be checked separately; the estimate is not a billing cap. Each paid capability has its
own call-count setting in `.env.example`; preflight checks the total against both configured limits
before any service check or browser action.

## Current setup result

No production, Supabase, Stripe, AWS, or email request was made during this continuation. The AST
inventory covers 609 runtime source files and 624 operations: 75 API routes, 63 SDK requests, 446
other service requests, and 40 realtime calls. All 624 now have a scenario mapping and reviewed
source link. It records 1,216 async expressions: 1,078 awaits, 56 returned calls, 43 promise chains,
30 Promise.all groups, 4 fire-and-forget calls, and 12 subscriptions. Every expression now has a
scenario and a reviewed request/local-work classification. These are static assignments; they do not
claim those calls ran. Calls inside route handlers link to their route IDs; shared client and service
operations link to the reviewed business scenario and its route IDs when that scenario has routes.

All 18 required journey files now exist: product creation, background editing, response races,
editing, deletion, catalog/cart, support, notifications, categories, account login/language/access checks,
AI tools, AI chat and memory, personalization storage, Stripe TEST session setup, analytics/provider utilities,
seeded navigation, a PayPal-method Stripe TEST session, and signed-out backup/maintenance authorization checks.
The AI tools journey covers category suggestions and readback, real Google price research,
an AI price estimate, print-area analysis, and generated image bytes. The storage journey checks signed upload,
exact byte readback, listing, download, another account's denial, personalized-design insertion, and exact cleanup.
The AI chat/memory journey verifies the actual assistant response, both chat routes, exact Upstash history,
and Pinecone vectors in the run-owned namespace; it reserves one chat request and three embedding requests.
Stripe currently verifies creation and rejection of an unpaid TEST session; successful, cancelled and
declined card transactions still need coverage. Analytics currently checks a CoinMarketCap quote and one
run-owned demo import; admin stats, Turnstile and the remaining analytics operations still need coverage.
Klarna remains blocked because the current route calls the production API host with credentials embedded
in source and is not a verified sandbox integration. Positive backup,
restore, global price research, and storage cleanup remain blocked until a separate database and storage target
is verified. The new backup spec checks only signed-out rejection and records those unrun global operations as
blocked. Seeded navigation shuffles real product/cart,
popular-catalog, and support-panel paths and records the seed and visited path sequence. A disposable separate
backup destination is not configured, so global restore and cleanup operations remain gated.
The app has no owner-facing design list/delete route, so those application paths remain uncovered. Background editing holds the real
translation response for three seconds and checks that Browser Back and the keep-editing control work
while a separate description draft remains. The stock race sends two real owner updates 250 ms apart
and holds the older response until after the newer one to check stored and rendered state. Creation
uses the supplied image and full browser
flow, then checks title/description and the supported price, stock, variant, category and
personalization update branches. Editing uses a Stripe TEST/Supabase fixture for a real manage-page
save and a real cross-account denial. Deletion checks cancel, single confirmation and selected bulk
deletion on real run-owned rows. The cart journey checks a real variant row, a sold-out option, the
stock ceiling, exact account-cart reads and writes, reload, totals, clear cancellation and
confirmation. Support covers ticket creation, a real PNG upload, customer/support replies in two
simultaneous browser sessions, and exact cleanup. Account checks cover login, language persistence,
cross-account separation and signed-out access. Source review shows sold-out variants can still be
selected and cart quantity can exceed variant stock on the product page; the journey records the
actual cart-row readback as an application defect instead of changing product behavior to hide it.
The category journey creates and renames one uniquely named category, verifies its count, updates one
run-owned account's view counter through increment and stale/new sync requests, then deletes both exact
records. The notification journey uses an out-of-stock run-owned product, reads the Resend message ID
back from the provider for its exact run account, and verifies the product's persisted request count.
The two newly added journeys still leave their positive provider/global-maintenance paths incomplete.
External Lambda
source/destination evidence is also still missing, so preflight remains `INCOMPLETE` before browser
actions. The changes are uncommitted and have not been
pushed or deployed.

All 18 browser specs are authored but have not been executed. A local Supabase stack was not started:
Docker is installed, but this user cannot access `/var/run/docker.sock`; noninteractive sudo requires
a password, and neither Supabase CLI nor rootless Podman is installed. No container was started, and
the supplied product image has not been uploaded to any service.

## What must be ready before a real run

### Copyable Supabase setup SQL

Review the deployed project's Auth table schema before running this SQL. It has not been
run or verified against the currently unavailable Supabase endpoint. Replace only the password
placeholder locally with a dedicated test password of at least 16 characters; do not commit it.
The SQL creates the test resource and paid-operation journals, restricts them to service-role access,
and creates the four manual reproduction accounts.

```sql
-- Run only after checking the Supabase Auth schema for this project.
-- The password placeholder must be replaced locally; never commit a real password.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public."23_e2e_resource_registry" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_name text NOT NULL,
  run_id text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  owner_id uuid,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cleanup_required', 'cleaned')),
  lease_expires_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "23_e2e_resource_registry_run_resource_unique"
    UNIQUE (suite_name, run_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS "23_e2e_resource_registry_active_lease_idx"
  ON public."23_e2e_resource_registry" (lease_expires_at)
  WHERE status IN ('active', 'cleanup_required');

ALTER TABLE public."23_e2e_resource_registry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."23_e2e_resource_registry" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."23_e2e_resource_registry" TO service_role;

CREATE TABLE IF NOT EXISTS public."23_e2e_paid_run_budgets" (
  suite_name text NOT NULL,
  run_id text NOT NULL,
  max_cost_usd numeric(12, 6) NOT NULL CHECK (max_cost_usd > 0),
  max_paid_operations integer NOT NULL CHECK (max_paid_operations > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (suite_name, run_id)
);

CREATE TABLE IF NOT EXISTS public."23_e2e_paid_operation_ledger" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_name text NOT NULL,
  run_id text NOT NULL,
  operation_key text NOT NULL,
  provider text NOT NULL,
  capability text NOT NULL,
  paid_call_count integer NOT NULL CHECK (paid_call_count > 0),
  estimated_cost_usd numeric(12, 6) NOT NULL CHECK (estimated_cost_usd >= 0),
  actual_cost_usd numeric(12, 6) CHECK (actual_cost_usd >= 0),
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'completed', 'failed', 'unknown')),
  provider_resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "23_e2e_paid_operation_run_key_unique"
    UNIQUE (suite_name, run_id, operation_key),
  CONSTRAINT "23_e2e_paid_operation_budget_run_fkey"
    FOREIGN KEY (suite_name, run_id)
    REFERENCES public."23_e2e_paid_run_budgets" (suite_name, run_id)
);

CREATE INDEX IF NOT EXISTS "23_e2e_paid_operation_run_idx"
  ON public."23_e2e_paid_operation_ledger" (suite_name, run_id, created_at);

ALTER TABLE public."23_e2e_paid_run_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."23_e2e_paid_operation_ledger" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."23_e2e_paid_run_budgets" FROM anon, authenticated;
REVOKE ALL ON public."23_e2e_paid_operation_ledger" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."23_e2e_paid_run_budgets" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."23_e2e_paid_operation_ledger" TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_23_e2e_paid_operation(
  p_suite_name text,
  p_run_id text,
  p_operation_key text,
  p_provider text,
  p_capability text,
  p_paid_call_count integer,
  p_estimated_cost_usd numeric,
  p_max_cost_usd numeric,
  p_max_paid_operations integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing_operation public."23_e2e_paid_operation_ledger"%ROWTYPE;
  budget public."23_e2e_paid_run_budgets"%ROWTYPE;
  used_operations integer;
  used_cost numeric(12, 6);
  inserted_operation public."23_e2e_paid_operation_ledger"%ROWTYPE;
BEGIN
  IF p_suite_name <> '23-store' OR length(btrim(p_run_id)) = 0
     OR length(btrim(p_operation_key)) = 0 OR length(btrim(p_provider)) = 0
     OR length(btrim(p_capability)) = 0 OR p_paid_call_count <= 0
     OR p_estimated_cost_usd < 0 OR p_max_cost_usd <= 0 OR p_max_paid_operations <= 0 THEN
    RAISE EXCEPTION 'Invalid 23_store paid-operation reservation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_suite_name || ':' || p_run_id, 0));

  SELECT * INTO existing_operation
  FROM public."23_e2e_paid_operation_ledger"
  WHERE suite_name = p_suite_name AND run_id = p_run_id AND operation_key = p_operation_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'operation_key_already_reserved',
      'operationId', existing_operation.id,
      'status', existing_operation.status
    );
  END IF;

  INSERT INTO public."23_e2e_paid_run_budgets" (suite_name, run_id, max_cost_usd, max_paid_operations)
  VALUES (p_suite_name, p_run_id, p_max_cost_usd, p_max_paid_operations)
  ON CONFLICT (suite_name, run_id) DO NOTHING;

  SELECT * INTO budget
  FROM public."23_e2e_paid_run_budgets"
  WHERE suite_name = p_suite_name AND run_id = p_run_id
  FOR UPDATE;
  IF budget.max_cost_usd <> p_max_cost_usd OR budget.max_paid_operations <> p_max_paid_operations THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'budget_changed_for_existing_run');
  END IF;

  SELECT COALESCE(SUM(paid_call_count), 0), COALESCE(SUM(estimated_cost_usd), 0)
  INTO used_operations, used_cost
  FROM public."23_e2e_paid_operation_ledger"
  WHERE suite_name = p_suite_name AND run_id = p_run_id;

  IF used_operations + p_paid_call_count > p_max_paid_operations
     OR used_cost + p_estimated_cost_usd > p_max_cost_usd THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'run_budget_would_be_exceeded',
      'usedOperations', used_operations,
      'usedEstimatedCostUsd', used_cost
    );
  END IF;

  INSERT INTO public."23_e2e_paid_operation_ledger" (
    suite_name, run_id, operation_key, provider, capability,
    paid_call_count, estimated_cost_usd, status
  )
  VALUES (
    p_suite_name, p_run_id, p_operation_key, p_provider, p_capability,
    p_paid_call_count, p_estimated_cost_usd, 'started'
  )
  RETURNING * INTO inserted_operation;

  RETURN jsonb_build_object(
    'allowed', true,
    'operationId', inserted_operation.id,
    'usedOperations', used_operations + p_paid_call_count,
    'usedEstimatedCostUsd', used_cost + p_estimated_cost_usd,
    'maxPaidOperations', p_max_paid_operations,
    'maxCostUsd', p_max_cost_usd
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_23_e2e_paid_operation(
  p_suite_name text,
  p_run_id text,
  p_operation_key text,
  p_status text,
  p_provider_resource_id text DEFAULT NULL,
  p_actual_cost_usd numeric DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  updated_operation public."23_e2e_paid_operation_ledger"%ROWTYPE;
BEGIN
  IF p_suite_name <> '23-store' OR p_status NOT IN ('completed', 'failed', 'unknown') THEN
    RAISE EXCEPTION 'Invalid 23_store paid-operation result';
  END IF;

  UPDATE public."23_e2e_paid_operation_ledger"
  SET status = p_status,
      provider_resource_id = COALESCE(p_provider_resource_id, provider_resource_id),
      actual_cost_usd = COALESCE(p_actual_cost_usd, actual_cost_usd),
      details = COALESCE(details, '{}'::jsonb) || COALESCE(p_details, '{}'::jsonb),
      updated_at = now()
  WHERE suite_name = p_suite_name AND run_id = p_run_id AND operation_key = p_operation_key
  RETURNING * INTO updated_operation;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paid operation was not reserved for this run';
  END IF;

  RETURN jsonb_build_object(
    'operationId', updated_operation.id,
    'status', updated_operation.status,
    'actualCostUsd', updated_operation.actual_cost_usd
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_23_e2e_paid_operation(text, text, text, text, text, integer, numeric, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_23_e2e_paid_operation(text, text, text, text, text, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_23_e2e_paid_operation(text, text, text, text, text, integer, numeric, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_23_e2e_paid_operation(text, text, text, text, text, numeric, jsonb) TO service_role;

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
        RAISE EXCEPTION 'Account is not marked as test-owned: %', account_record.email;
      END IF;

      UPDATE auth.users
      SET encrypted_password = extensions.crypt(test_password, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = test_user_id;
    ELSE
      test_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change, email_change_token_new, email_change_token_current,
        reauthentication_token
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000', test_user_id,
        'authenticated', 'authenticated', account_record.email,
        extensions.crypt(test_password, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('username', account_record.username, 'e2e_suite', '23-store'),
        now(), now(), '', '', '', '', '', ''
      );
    END IF;

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), test_user_id, test_user_id::text, 'email',
      jsonb_build_object(
        'sub', test_user_id::text,
        'email', account_record.email,
        'email_verified', true,
        'phone_verified', false
      ), now(), now()
    )
    ON CONFLICT (provider_id, provider)
    DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = now();

    INSERT INTO public."23_users" (
      id, username, email, roles, providers, email_confirmed_at, password_reset_required
    )
    VALUES (
      test_user_id, account_record.username, account_record.email,
      account_record.roles, ARRAY['credentials']::text[], now(), false
    )
    ON CONFLICT (id) DO UPDATE SET
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

NOTIFY pgrst, 'reload schema';

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


- During the last read-only check, Supabase Auth and product-table reads returned HTTP 503. Check
  that the project has this store's schema and policies. Review the Auth table schema before running
  `scripts/e2e/create-test-users.sql`; that SQL has not been run.
- Provide a receiving test email domain, a test password of at least 16 characters, and positive
  values for `E2E_MAX_PROVIDER_COST_USD` and `E2E_MAX_PAID_OPERATIONS`. Export values to a local
  replay process and add the matching GitHub Actions variables/secrets for the scheduled run; local
  values do not automatically appear in GitHub. The runner does not read `.env.local`. The previous
  check also found `PAYPAL_WEBHOOK_ID_TEST`
  missing. GitHub needs `NEXT_RESEND_SECRET` and the provider settings referenced in the workflow.
- The last read-only Stripe check found that the runner's TEST account has charges disabled. Make
  the test account usable. The monthly preflight now calls the protected production Stripe-mode
  check, which creates an idempotent TEST product only when the deployed key is `sk_test_`, verifies
  `livemode: false`, and archives it. This check has not been deployed or called; a local `sk_test_`
  key alone does not prove the server setting.
- Verify the report sender and delivery to `support@nicitaa.com`. The local Resend credential has
  not been used to send a report. Provide the PayPal sandbox webhook ID and confirm any other
  payment, wallet, Turnstile, OAuth, email, Telegram, and provider settings used by the journeys.
- Confirm the deployed `23-ai-translate` Lambda revision, its database and Pusher destinations, and
  grant its monthly runner `logs:FilterLogEvents` for `/aws/lambda/23-ai-translate`. The journey will
  fail without exact terminal request logs. Check the configured R2 bucket and other service settings
  against the deployed app.
- Supply a per-call estimate in `E2E_OPERATION_COST_ESTIMATES_JSON` for each capability in
  `cypress/coverage/paid-capabilities.json`, with a positive whole-number value for each of the eleven
  matching `E2E_*_MAX_PROVIDER_CALLS` settings. Category suggestion needs at least two calls for
  product creation and the dedicated AI-tools journey. Preflight multiplies each estimate by its configured
  maximum and checks the full cost and call totals before contacting services. Field translation needs
  four calls: title and description once for the edit path, and once for the pending-dialog case.
- `app/api/create-klarna-session/route.ts` uses the production API host and credentials embedded in
  source. Do not call it in a test; replace the integration with a proper sandbox configuration and
  rotate the embedded credentials before claiming Klarna coverage.
- Backup, restore, broad storage cleanup, and maintenance checks need a separate test database and
  storage with the same schema. Running those operations against the shared customer database could
  change or remove customer data, so those cases stay incomplete until the separate services exist.

No remote schema, payment, product, or test-account mutation has been performed. Static preflight now
stops before site, Supabase, or Stripe requests when local prerequisites, journey files, source review,
or budgets are incomplete. When the production URL is missing, the monthly command still writes its
normal `INCOMPLETE` report before exiting; it does not fail early or attempt a remote request. Cypress
and Playwright browsers install only after preflight passes, so an incomplete setup avoids their
download time. The monthly workflow is still local and will not start until it is pushed to
`development`; its only trigger is the monthly schedule, so redeployments do not start it.
