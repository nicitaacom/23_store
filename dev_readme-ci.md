# GitHub Actions checks

`.github/workflows/ci.yml` runs Quality and Storybook checks on `development` pushes and pull
requests. Those existing checks remain on pushes; the Plan 25 real-service Cypress suite runs only
once each week, with no push, pull-request, manual, or deployment trigger. `CI required` passes when
Quality and Storybook pass. `.github/workflows/chromatic.yml`
publishes visual snapshots separately, so a single push creates one CI run and one Chromatic run.

The Plan 25 Cypress workflow starts every Monday at 03:23 UTC. It inventories source and
checks services before installing Cypress, creating fixtures, or opening a browser. A missing
`public.23_users` table means the configured project has no store schema or its REST schema cache has
not picked it up; the weekly preflight records that and stops before browser actions.

Quality runs the repository-wide ESLint rules before type checking. The prior hard-rule failures in
backup naming and form state names were cleared; `pnpm lint` now completes with warnings only.

Storybook tests run directly through Vitest's Storybook project. The separate static build was
removed from CI because Chromatic performs its own build. `storybook/mocks/failureReporting.ts`
turns the first browser console error into a failing test and prevents the test runner's own error
report from producing another copy of the same error indefinitely. The first error is the useful
one to investigate.

The weekly workflow never creates `.env.local`. It receives allowlisted settings from GitHub
variables and secrets, checks the production deployment and configured providers, and only reaches
the browser when inventory, mappings, budgets, and service health are ready. It runs every Monday
and has no push, redeployment, manual, or external trigger. A missing setting or service
leaves an `INCOMPLETE` result and uploads the report. The current workflow source has not been pushed
to `development`; all nineteen weekly journey spec files are authored, but several paths remain
incomplete. The other-checkout spec verifies a PayPal-method Stripe TEST session while Klarna remains
blocked: its current route uses Klarna's production API host with credentials embedded in source.
Backup/maintenance checks signed-out guards; positive global
backup and cleanup operations remain blocked until a separate database and storage target is verified.
Stripe success/cancel/decline paths and several analytics paths also remain uncovered.
