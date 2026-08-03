# Storybook component development

<!-- Prefer locator.js for locating importers/usages; use Storybook for visual component states. -->

Storybook provides deterministic component states without running the application or contacting live
services. It is the fast feedback layer for visual states, keyboard behavior, accessibility, and
optimistic UI. Cypress and API tests remain responsible for browser-to-backend integration, RLS, and
authorization enforcement.

## Commands

```bash
pnpm storybook
pnpm build-storybook
pnpm test:storybook
pnpm chromatic
```

The development server uses port 6006. `build-storybook` writes the static site to
`storybook-static/`. `test:storybook` renders every story in headless Chromium and runs its play
function and accessibility audit. `chromatic` reads `CHROMATIC_PROJECT_TOKEN` from the environment;
never append a token to the command or store one in a tracked file.

## Organization

```text
.storybook/
├── main.ts                 framework, addons, aliases, static assets
├── preview.tsx             global decorators, MSW, toolbars, viewports, accessibility
└── StorybookProvider.tsx   locale and theme boundary

storybook/
├── foundations/            token comparison matrices
├── ui/                     primitives, inputs, overlays, feedback
├── commerce/               products and cart compositions
├── navigation/             responsive navbar and locale states
├── authentication/         anonymous and authenticated flows
├── support/                customer support states and interactions
├── admin/                  product create, update, and delete behavior
├── fixtures/               typed, fixed test data
├── mocks/                  service, SDK, navigation, and deferred-promise mocks
└── store/                  Zustand reset boundary
```

Story titles follow that navigation order. Put a story beside the matching section above instead of
creating generated tutorial stories or a second fixture collection.

Use the component name as the final title segment. Storybook's search matches story titles, so a
developer can paste a filename such as `AdminPanelModal` and open
`Admin/AdminPanelModal` immediately. Keep feature or state stories below that component segment
when a file contains multiple components, for example `UI/Overlays/ModalContainer/FocusEscape`.
When adding a story for a component, use its source import rather than a lookalike mock so the
Storybook canvas remains a useful development preview.

## Deterministic fixtures and state

Fixtures use fixed IDs, dates, image paths, currencies, users, products, variants, carts, categories,
tickets, and messages. Extend the typed fixtures in `storybook/fixtures/` when a new state is reusable.
Keep one-off values local to a story only when they express that story's unique edge case.

Before each story, `resetStorybookStores()` restores every registered Zustand store to its captured
initial state and resets shared service spies. Add a new store to
`storybook/store/resetStorybookStores.ts` before importing a component that uses it. A play function
may seed a store in `useLayoutEffect`, but it must leave no state for the next story.

```text
fixed fixture → story render → production component → observable UI
                    │                    │
                    ├─ seeded Zustand ───┘
                    └─ mocked service request → resolve or reject in play test
```

Theme, locale, and viewport are story inputs. The toolbar supports light/dark themes and `en`, `fi`,
`ru`, and `se`. Stable viewports are 320, 414, 768, 1024, 1440, and 1920 pixels.

## Service isolation

Stories must never use live Supabase, email, payment, AI, upload, Pusher, or application API services.
Vite aliases replace imported SDK modules with mocks in `storybook/mocks/`. MSW handles the few HTTP
flows intentionally exercised by a story and treats every unexpected same-origin `/api/` request as
a test error. Unexpected console errors and unhandled promise rejections also fail the story run.

Prefer a module mock for an imported SDK, MSW for observable HTTP request/response behavior, and a
small injected callback for a presentational interaction. Do not add `if (storybook)` branches to
production components.

## Meaningful stories and interactions

A meaningful story describes one observable state or behavior: long text, a missing image, a stock
boundary, a pending action, a rejected request, or a confirmed optimistic change. It uses production
components and fixed data, and its name explains the state visible in Chromatic.

Play functions are required when behavior matters. Assert the user-visible result and the submitted
arguments, not an implementation detail. Cover keyboard activation, focus movement and return,
validation, disabled controls, destructive confirmation, dismissal, quantity limits, calculated
totals, and state cleanup where applicable. Do not remove or weaken an assertion to accommodate a
production change.

For optimistic behavior, use `createDeferred()` and prove this order:

1. Start the request without resolving it.
2. Assert the temporary create, update, or removal is already visible.
3. Resolve and assert the confirmed server value, or reject and assert rollback.
4. After a prior success, reject a later update and assert rollback uses the last confirmed response.
5. Assert error feedback, duplicate-submission protection, and service arguments.

## Accessibility policy

The accessibility addon runs after every story with failures treated as test errors. Fix valid
violations in the component or story markup. Do not globally disable rules. Disabled and pending
states still need readable contrast, icon-only controls need accessible names, overlays need correct
focus behavior, and list semantics must remain valid.

## Chromatic visual review

`.github/workflows/chromatic.yml` publishes every branch push with full Git history. TurboSnap is
intentionally disabled for the initial baseline. The token exists only as the GitHub Actions secret
`CHROMATIC_PROJECT_TOKEN`. Rotate any token exposed in chat, logs, or screenshots before saving the
replacement secret.

`UI Test` and `UI Review` are protected-branch checks separate from `CI required`. Review or reject
every visual change in Chromatic; merging stays blocked while either check is pending. After a squash
merge, the `development` build automatically accepts the already-reviewed result as its baseline.

## CodeRabbit and commit workflow

CodeRabbit reviews draft PRs and every incremental push using `.coderabbit.yaml` plus the repository
guidelines. Resolve every finding before moving to the next subtask. Each Storybook plan subtask has
one named commit. If review changes a completed subtask, amend that commit and push with
`--force-with-lease`; do not create a fixup commit. Commit subjects and the squash PR title must follow
`commit-patterns.md`.

## Responsibility boundary

Storybook verifies isolated rendering, interaction contracts, accessibility, submitted identifiers,
pending protection, and optimistic success/rollback. Cypress and API tests verify real routing,
cookies, sessions, request-bound Supabase clients, RLS, backend authorization, provider integration,
and database persistence. A Storybook mock demonstrates what a component does with a response; it is
not evidence that the backend permits or rejects the request correctly.
