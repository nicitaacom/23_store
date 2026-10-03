# GitHub Actions checks

`.github/workflows/ci.yml` runs Quality, Cypress, and Storybook in parallel. `CI required` passes only
when all three pass. `.github/workflows/chromatic.yml` publishes visual snapshots separately, so a
single push creates one CI run and one Chromatic run; they are different checks.

The Cypress job first checks that the Actions Supabase credentials reach the store tables. A missing
`public.23_users` table means the configured project has no store schema or its REST schema cache
has not picked it up. The preflight reports this before the long browser install and before any
fixtures are created. Regular runs use Electron; the manual `full_browser_matrix` input adds Chrome,
Firefox, and WebKit. The initial failed `curl` while Next.js starts is expected during the retry loop.

Storybook tests run directly through Vitest's Storybook project. The separate static build was
removed from CI because Chromatic performs its own build. `storybook/mocks/failureReporting.ts`
turns the first browser console error into a failing test and prevents the test runner's own error
report from producing another copy of the same error indefinitely. The first error is the useful
one to investigate.
