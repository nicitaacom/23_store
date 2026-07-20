# Continuous integration and protected branches

Every pull request targeting `development`, `production`, or the existing `production-vite` branch
runs the required `CI required`, `UI Test`, and `UI Review` checks. A merge reruns CI and publishes
the accepted Chromatic baseline through the workflows' `push` triggers.

CI performs:

- custom ESLint-rule tests, repository lint, Next.js route type generation, and TypeScript checks;
- a static Storybook build plus render, interaction, and accessibility tests in Chromium;
- all 20 Cypress assertions in Electron;
- the responsive and internationalization smoke set in Chrome, Firefox, and WebKit;
- serial fixture access so two runs do not delete each other's `cypress-e2e-` Supabase rows.

## 👉 TODO — GitHub Actions values

Open **Settings → Secrets and variables → Actions** and add these repository **Variables** using the
matching values from `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PUSHER_APP_KEY`

Add these repository **Secrets**:

- `CHROMATIC_PROJECT_TOKEN` — copy the active project token from Chromatic. If a token was pasted in
  chat or a log, rotate it before storing the replacement here.
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_STRIPE_SECRET_KEY` — use a Stripe test-mode key because the owner-deletion test deactivates
  fixture Stripe identifiers.
- `PUSHER_APP_ID` and `PUSHER_SECRET` are optional because the current Cypress tests intercept
  provider delivery, but add them if CI should exercise real Pusher delivery later.

The CI workflow sends the application values only to the Cypress job. The Chromatic workflow receives
only `CHROMATIC_PROJECT_TOKEN`. `.github/scripts/create-ci-env.mjs` writes a temporary `.env.local`;
Next.js and `cypress.config.ts` then read that same dotenv file. No token, public key, or service-role
key is hardcoded in a workflow.

## 👉 TODO — Import branch protection

Workflow YAML creates status checks, but GitHub repository rules decide whether a direct push or a
failed merge is rejected. After this workflow has run once:

1. Open **Settings → Rules → Rulesets**.
2. Select **New ruleset → Import a ruleset**.
3. Import `.github/rulesets/development-production.json` and confirm enforcement is **Active**.
4. Leave the bypass list empty. The ruleset requires a pull request; requires `CI required`, `UI Test`,
   and `UI Review`; blocks force pushes and deletion; requires resolved review threads; and allows only
   squash merges.
5. Under **Settings → General → Pull Requests**, enable **Allow squash merging** and disable merge
   commits and rebase merging. Enable automatic head-branch deletion if desired.

The normal workflow is:

```text
development → feature/fix branch → pull request → CI and visual review pass → squash merge
```

Chromatic publishes on branch pushes with full Git history. TurboSnap is intentionally disabled.
`UI Test` stays pending until visual changes are accepted, and `UI Review` stays pending until the
review is approved. These asynchronous checks remain separate from `CI required`. Squash merges into
`development` auto-accept the already-reviewed result as the new baseline.

Do not place a service-role key directly in `ci.yml`, a repository Variable, or a committed dotenv
file. Repository Variables are appropriate only for browser-visible `NEXT_PUBLIC_*` values.
