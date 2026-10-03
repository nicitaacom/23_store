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

The application must provide these values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is read only by Cypress's Node process. Browser test code does not receive it. Fixture products use the `cypress-e2e-` prefix, and test setup removes only rows with that prefix.

`prepareFixtures` in `cypress.config.ts` creates or refreshes the confirmed
`cypress-owner@joki.example` and `cypress-other@joki.example` accounts. Their
password is the `TEST_PASSWORD` constant in that file. Use the owner account in
the local Sign In modal to inspect authenticated customer and owner flows. The
fixture also clears `password_reset_required` after setting the test password,
so an account restored from a database backup can sign in. These accounts are
test data; do not reuse them for a real customer.

GitHub Actions runs `.github/scripts/check-ci-supabase.mjs` before installing browsers. It checks
the five tables the fixtures use. If `public.23_users` is missing from the schema cache, check the
Actions Supabase URL and service-role key: they must point to the database that has the store tables.
The regular CI run uses Electron; a manual **CI** run with `full_browser_matrix` also tests Chrome,
Firefox, and WebKit.

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
