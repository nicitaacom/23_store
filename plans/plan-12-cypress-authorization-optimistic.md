# plan-12 — Cypress: authorization and optimistic product CRUD

**Priority:** P1 (explicit ask)
**Screenshot:** —
**Recommended model:** Opus · high thinking — authenticated browser sessions, real RLS checks,
deterministic delayed responses, and database cleanup
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

The store has business-critical behavior that is not protected by automated browser tests. Product
owners need reliable create/update/delete flows, failed requests need to restore the last confirmed
UI state, and anonymous visitors must retain the deliberately public actions without gaining product
management access.

The tests assert user-visible and database outcomes rather than component structure or SDK method
names. Refactors may change implementation without requiring the permission and rollback rules to be
rewritten.

## §1 Permission matrix

| Action | Anonymous | Signed-in non-owner | Product owner | Required test outcome |
| --- | --- | --- | --- | --- |
| Read products | allow | allow | allow | product data remains public |
| Contact support | allow | allow | allow | request is accepted with an anonymous id or user session |
| Local cart and request better prices | allow | allow | allow | correct products, quantities, and total are submitted |
| Start checkout | allow | allow | allow | provider-session request accepts a missing customer email |
| Create product | deny | allow for the signed-in user | allow | route derives `owner_id` from the session |
| Update product | deny | deny for another user's product | allow for own product | `401` / `403` / success |
| Delete product | deny | deny for another user's product | allow for own product | denied requests leave the row unchanged |
| Protected dashboards | deny | deny without role | allow with role | redirect without exposing protected content |

## §2 Optimistic contracts

- Create: show the temporary product before the request finishes; replace it after success; remove
  it and restore the submitted form after failure.
- Update: show the submitted title/price/stock/image change before the request finishes; replace it
  with the confirmed response after success; restore the prior value after failure.
- Delete: remove the product before the request finishes; keep it removed after success; restore the
  exact product snapshot after failure.
- Each success test reloads or reads the database so a client-only state change does not count as a
  pass.

## §3 Task

> This explicit test request is one coherent task. Install and configure Cypress; add stable test
> selectors and server-side test setup; enforce cookie-based product-route authorization; implement
> deterministic optimistic success/rollback tests plus real authorization/RLS checks; document the
> test commands; run lint, type-check, and the test suite. STOP with the complete diff and results.

## Decisions made

- UI timing tests use delayed intercepted responses; database/RLS tests use real route requests.
- Database setup uses uniquely prefixed test rows and deletes only those rows/users.
- Supabase service-role credentials stay in Cypress's Node process and are never sent to browser code.
- Anonymous support and checkout tests intercept external email/payment providers while asserting the
  application's request payload and visible result.
- Stable `data-cy` attributes describe business controls and outcomes; styling and DOM nesting are not
  selectors.

## Code patterns to follow

- `dev_readme-code-patterns.md` — authorization uses route-handler cookies; optimistic failures restore
  the last confirmed snapshot; no vague names or banned words.
- `good-bad-examples.md` — descriptive response names and no local functions in hook dependency arrays.
- `dev_readme-eslint.md` — all generated TypeScript and touched application files follow project rules.

➡️ Next plan: — (return to [plan-00-tracker.md](plan-00-tracker.md))
