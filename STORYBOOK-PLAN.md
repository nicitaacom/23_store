# STORYBOOK-PLAN — Storybook, Chromatic, and CodeRabbit

## Plan file and status

- Write this complete plan to `/STORYBOOK-PLAN.md` at the repository root.
- Add plan 13 to `plans/plan-00-tracker.md`, linking to `../STORYBOOK-PLAN.md`.
- Keep implementation status only in `plans/plan-00-tracker.md`, as required by the repository.
- Do not create a duplicate `plans/plan-13-storybook.md`.
- Before implementation, read:
  - `AGENTS.md`
  - `commit-naming.md`
  - `dev_readme-code-patterns.md`
  - `dev_readme-eslint.md`
  - `good-bad-examples.md`
  - Relevant feature documentation for every touched component.

## Commit discipline

Every subtask produces exactly one commit.

Workflow for each subtask:

1. Implement only that subtask.
2. Run its focused tests and mandatory lint/type checks.
3. Review every changed line against `dev_readme-code-patterns.md`.
4. Show the uncommitted diff to Nikita.
5. Wait for the exact approval phrase: `approved - continue`.
6. Create the subtask’s single planned commit.
7. Push it to the Storybook branch so CodeRabbit can review it.
8. Resolve CodeRabbit findings before beginning the next subtask.
9. If review feedback changes the completed subtask:
   - Amend the existing subtask commit with `git commit --amend --no-edit`.
   - Do not add a separate fixup commit.
   - Push the amended branch using `git push --force-with-lease`.
10. Start the next subtask only after the amended commit passes its checks and review.

All subjects must follow `commit-naming.md`:

- One line.
- `type: lowercase message`.
- No scope.
- No body.
- No trailing period.
- Only `fix`, `upd`, `style`, `docs`, `feat`, or `chore`.

## Planned commits

| Order | Subtask | Exact commit |
| ---: | --- | --- |
| 1 | Root plan and tracker entry | `docs: storybook plan` |
| 2 | CodeRabbit configuration | `chore: coderabbit review` |
| 3 | Mechanical commit and PR-title validator | `chore: validate commit names` |
| 4 | Storybook packages and base configuration | `chore: storybook setup` |
| 5 | Providers, typed fixtures, stores, and service mocks | `chore: storybook fixtures and providers` |
| 6 | Design foundations | `feat: storybook foundations` |
| 7 | Inputs and controls | `feat: storybook inputs and controls` |
| 8 | Overlays, feedback, and pending states | `feat: storybook overlays and feedback` |
| 9 | Product and cart compositions | `feat: storybook product and cart` |
| 10 | Navigation and authentication | `feat: storybook navigation and auth` |
| 11 | Support components and interactions | `feat: storybook support` |
| 12 | Product creation and optimistic rollback | `feat: storybook product creation` |
| 13 | Product updates and optimistic rollback | `feat: storybook product updates` |
| 14 | Product deletion and recovery | `feat: storybook product deletion` |
| 15 | Storybook tests and CI gate | `chore: storybook ci` |
| 16 | Chromatic publishing and visual-review gate | `chore: chromatic publishing` |
| 17 | Final documentation and completed tracker status | `docs: storybook` |

The commit list is fixed. A subject may change only if `commit-naming.md` requires it, and that change must be approved before committing.

## 1. Branch and root plan

- Confirm `feat/cypress-e2e-tests` is clean and all existing work is committed.
- Create `feat/storybook` from its current HEAD.
- Add this plan as `/STORYBOOK-PLAN.md`.
- Add plan 13 to the tracker as `in progress`.
- Do not send Storybook changes back to the Cypress branch.
- Open a draft PR into `development` after the CodeRabbit configuration is committed and pushed.

Commit: `docs: storybook plan`

## 2. CodeRabbit review gate

### Repository access prerequisite

Nikita must grant the CodeRabbit GitHub App access to `nicitaacom/23_store`:

1. GitHub Settings → Applications → Installed GitHub Apps.
2. Configure or install CodeRabbit for `nicitaacom`.
3. Add `23_store` under selected repositories.
4. Save any requested permission changes.
5. Refresh the CodeRabbit workspace after permissions propagate.

[CodeRabbit GitHub setup](https://docs.coderabbit.ai/platforms/github-com)

### Version-controlled configuration

Add `.coderabbit.yaml` with:

- Assertive review profile.
- English output.
- Draft PR reviews enabled.
- Incremental review after each push.
- Review branches `development`, `production`, and `production-vite`.
- Request-changes workflow enabled.
- Failed-review commit status enabled.
- GitHub Checks integration enabled.
- Direct autofix disabled so CodeRabbit does not bypass the one-subtask/one-commit review process.

Configure these existing files as CodeRabbit guidelines:

- `commit-naming.md`
- `dev_readme-code-patterns.md`
- `dev_readme-eslint.md`
- `good-bad-examples.md`

`AGENTS.md` and `CLAUDE.md` are detected automatically. CodeRabbit will use the files as the source of truth instead of duplicating their contents. [CodeRabbit code guidelines](https://docs.coderabbit.ai/knowledge-base/code-guidelines)

Add blocking AI checks for:

- Changed code compliance with the project code patterns.
- Commit subjects against `commit-naming.md`.
- Meaningful test assertions.
- No weakening of tests to accommodate production changes.
- Story isolation from live services.
- Authentication and authorization-sensitive changes.
- Supabase request-bound client and RLS rules.
- No credentials in code, stories, CI, logs, or documentation.

AI checks inspect only the PR’s changes and introduced commits. Pre-existing unrelated code must not fail the PR. [CodeRabbit custom checks](https://docs.coderabbit.ai/pr-reviews/custom-checks)

Commit: `chore: coderabbit review`

## 3. Mechanical commit validation

Add a Node-based CI validator and focused tests.

The validator checks:

- Every non-merge commit introduced by the PR.
- The PR title used for squash merging.
- Allowed commit types.
- Required `type: message` shape.
- No scopes.
- No multiline body.
- No trailing period.
- Lowercase message according to `commit-naming.md`.

It must not fail on historical commits outside the PR range.

Add `pnpm test:commit-naming` and run it in the CI quality job. CodeRabbit provides the AI interpretation; the script provides deterministic enforcement.

Commit: `chore: validate commit names`

## 4. Storybook setup

Install with pnpm:

- Storybook 10.5.
- `@storybook/nextjs-vite`.
- Docs, themes, accessibility, and Vitest addons.
- Compatible Vitest browser and Playwright dependencies.
- MSW and `msw-storybook-addon`.
- Chromatic.

Configure:

- `pnpm storybook` on port 6006.
- `pnpm build-storybook`.
- `pnpm test:storybook`.
- `pnpm chromatic` without a token argument.
- TypeScript CSF stories.
- Autodocs.
- `@/*` aliases.
- Next App Router mode.
- `public` static assets.
- `app/globals.css`.
- No generated tutorial stories.
- Ordered navigation:
  - Foundations
  - UI
  - Commerce
  - Navigation
  - Authentication
  - Support
  - Admin
- Viewports at 320, 414, 768, 1024, 1440, and 1920 pixels.
- Theme and locale toolbars.

The Vite framework is Storybook’s recommended Next.js integration and supports the project’s Next 16 and React 19 versions. [Storybook Next.js/Vite](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite/?renderer=react)

Commit: `chore: storybook setup`

## 5. Fixtures, providers, and service isolation

Create typed reusable Storybook support for:

- `I18nProviderClient` with `en`, `fi`, `ru`, and `se`.
- Light and dark themes using production CSS variables.
- Zustand state reset before every story.
- Users, products, variants, carts, categories, tickets, and messages.
- Fixed dates, IDs, currencies, and image URLs.
- Next pathname, search-parameter, and navigation mocks.
- Deferred promises for optimistic interaction tests.
- SDK/module mocks for Supabase, email, payment, AI, uploads, and Pusher.
- MSW with unexpected application API requests treated as test errors.
- Console and unhandled-promise failure reporting.

Do not add Storybook-specific runtime branches to production components. Introduce presentational props or service injection only when required to isolate an existing component.

Commit: `chore: storybook fixtures and providers`

## 6. Design foundations

Create comparison stories and documentation for:

- Light/dark color tokens.
- Brand and semantic status colors.
- Typography.
- Spacing.
- Radius scale.
- Borders.
- Shadows.
- Focus appearance.
- Disabled appearance.
- Responsive breakpoints.

Use stable matrix stories suitable for Chromatic comparison.

Commit: `feat: storybook foundations`

## 7. Inputs and controls

Cover:

- Every meaningful Button variant and size.
- Pending, disabled, icon, link, and full-width buttons.
- Base input and validated input.
- Search input.
- Message input.
- Markdown editor and rendered markdown.
- Checkbox.
- Radio button.
- Slider.
- Progress bar.
- Product quantity control.
- Add-to-cart control.
- Dropdown container and item.

Play tests must cover keyboard activation, focus, validation, disabled behavior, quantity boundaries, and callback arguments.

Commit: `feat: storybook inputs and controls`

## 8. Overlays and feedback

Cover:

- Toast variants and dismissal.
- Image success and fallback.
- Skeleton states.
- Empty states.
- Modal containers.
- Confirmation dialogs.
- Search modal.
- Avatar update modal.
- Pending and failure feedback.

Test focus placement, focus return, Escape handling, outside click, destructive confirmation, dismissal, and pending-button protection.

Commit: `feat: storybook overlays and feedback`

## 9. Product and cart

Product stories:

- Normal product.
- Long localized content.
- Missing image.
- Multiple variants.
- Selected variant.
- Sold-out variant.
- Fully out-of-stock product.
- Cart-locked variant.
- Owner controls.
- Anonymous controls.

Cart stories:

- Empty cart.
- One line.
- Multiple lines.
- Variant lines.
- Long product names.
- Quantity changes.
- Removal.
- Correct recalculated totals.
- Anonymous and authenticated price requests.
- Pending, success, and failed price requests.

Tests assert observable product selection, cart state, totals, request arguments, and feedback.

Commit: `feat: storybook product and cart`

## 10. Navigation and authentication

Navigation:

- Anonymous and authenticated navbar.
- Cart counts.
- Owner/admin links.
- Mobile hamburger menu.
- Desktop navigation.
- Language dropdown.
- All locales.
- Light and dark themes.

Authentication:

- Sign-in.
- Registration.
- Password reset.
- Verification timer.
- OAuth choices.
- Validation failures.
- Pending request.
- Backend rejection.
- Authenticated redirect.
- Anonymous protected-action prompt.

No story creates a real authentication cookie or session.

Commit: `feat: storybook navigation and auth`

## 11. Support

Cover:

- Closed and open support button.
- Unread count.
- Empty conversation.
- Multi-day messages.
- Own and foreign messages.
- Attachment preview.
- Image fallback.
- Pending send.
- Failed send.
- Completed ticket.
- Rating.
- Mobile and desktop layouts.
- Anonymous support access.

Play tests assert message entry, submission arguments, failure feedback, modal/dropdown behavior, and state cleanup.

Commit: `feat: storybook support`

## 12. Product creation

Cover product creation states:

- Empty form.
- Validation errors.
- Valid form.
- Inserting state.
- Optimistic product visible while the mocked request remains unresolved.
- Confirmed server response replacing the temporary product.
- Failed request removing the temporary product.
- Error toast.
- Duplicate-submission prevention.

The play test must explicitly prove that the optimistic row appears before the request resolves.

Commit: `feat: storybook product creation`

## 13. Product updates

Cover optimistic updates for:

- Title.
- Description.
- Price.
- Category.
- Stock.
- Images.
- Variants.

For every update family:

1. Keep the request unresolved.
2. Assert the new value appears immediately.
3. Resolve and store the confirmed response.
4. Repeat with a failure.
5. Assert rollback uses the last confirmed response.
6. Assert the error toast and SDK arguments.

Commit: `feat: storybook product updates`

## 14. Product deletion

Cover:

- Delete confirmation.
- Cancel.
- Pending deletion.
- Optimistic removal where the production UI uses it.
- Successful deletion.
- Failed deletion recovery.
- Unauthorized controls hidden or disabled.
- Duplicate deletion prevention.

RLS and backend authorization remain Cypress/API responsibilities; Storybook verifies the component behavior and submitted identifiers.

Commit: `feat: storybook product deletion`

## 15. Storybook CI

Add a Storybook CI job that runs:

- Static Storybook build.
- Story render tests.
- Play-function interaction tests.
- Accessibility tests.

Configure stable stories with accessibility failures treated as CI errors. Fix valid violations instead of globally disabling rules.

Upload Storybook output and failure evidence when the job fails. Add the job to `CI required`.

Let CodeRabbit read the completed GitHub Checks and comment on relevant CI failures. [CodeRabbit GitHub Checks](https://docs.coderabbit.ai/tools/github-checks)

Commit: `chore: storybook ci`

## 16. Chromatic

- Use the supplied token only through an environment variable.
- Store the active token as `CHROMATIC_PROJECT_TOKEN` in GitHub Actions.
- Never put it in tracked code, scripts, docs, or workflow YAML.
- Publish from branch pushes with full Git history.
- Do not enable TurboSnap initially.
- Require Chromatic UI Test and UI Review checks.
- Block merging until visual changes are approved.
- Keep asynchronous visual approval separate from `CI required`.
- Auto-accept an already-reviewed baseline after squash merge into `development`.
- Update the branch-rules documentation with the final check names.
- Rotate the token pasted into chat and replace the GitHub secret.

Commit: `chore: chromatic publishing`

## 17. Documentation and completion

Add `dev_readme-storybook.md` and link it from `CLAUDE.md`.

Document:

- Commands.
- Story organization.
- Fixture and Zustand reset rules.
- Network and module mocking.
- How to write a meaningful story.
- Interaction-test requirements.
- Accessibility policy.
- Theme, locale, and viewport support.
- Chromatic review process.
- CodeRabbit workflow.
- One-subtask/one-commit and amend rules.
- Storybook versus Cypress/API responsibilities.
- Secret handling.

Run final verification:

- `pnpm test:commit-naming`
- `pnpm test:eslint-rules`
- `pnpm lint`
- `pnpm exec next typegen`
- `pnpm type-check`
- `pnpm build-storybook`
- `pnpm test:storybook`
- Existing Cypress smoke suite
- CodeRabbit full review and pre-merge checks
- Chromatic visual approval
- Clean working tree

Change plan 13 from `in progress` to `done` only when every required check passes and all CodeRabbit discussions are resolved.

Commit: `docs: storybook`

## Acceptance criteria

- The complete plan exists at `/STORYBOOK-PLAN.md`.
- Exactly one commit exists for every listed subtask.
- Review corrections are amended into the relevant subtask commit.
- All commits and the PR title follow `commit-naming.md`.
- Every changed line follows `dev_readme-code-patterns.md`.
- CodeRabbit uses the repository documents as review criteria.
- Storybook contains meaningful states and interactions, not generated examples.
- Stories do not contact live application services.
- Product create, update, and delete stories verify success and failure behavior.
- Optimistic tests prove both immediate UI updates and rollback.
- Accessibility and Storybook tests pass in CI.
- Chromatic blocks unapproved visual changes.
- CodeRabbit blocks unresolved review findings.
- Existing Cypress, authorization, lint, type, and branch-protection checks continue to pass.
