# ESLint setup

_Last updated: 2026-07-27 (`chore: eslint one-liner props interfaces`)_

This project uses ESLint 9 flat config (`eslint.config.mjs`). The old `.eslintrc.json` (ESLint 8
legacy config) was removed because `eslint-config-next@16.2.10` requires `eslint >= 9`.

`pnpm build` runs `eslint . --max-warnings=-1 && next build` - lint runs first, and the build stops
if there are any **errors** (warnings never fail the build). `pnpm lint` runs the same linter
without the build step, for a quick check.

<br/>

## SOP: copying this setup into another project

Everything lives in two places: the `eslint-rules/` folder and `eslint.config.mjs`. This SOP
assumes the target project is also Next.js - if it isn't, see step 4.

1. **Copy the rules folder as-is.**

   ```bash
   cp -r eslint-rules/ /path/to/other-project/eslint-rules/
   ```

   None of these files import anything project-specific (no imports from `app/`, no hardcoded
   paths) - they only inspect syntax (filenames, AST shape, source text), so they carry over
   unmodified.

2. **Install the exact same ESLint dependency versions** - version mismatches between
   `eslint`/`@typescript-eslint/*`/`eslint-plugin-unicorn`/`eslint-config-next` are the #1 cause of
   this setup breaking (see "How to fix ESLint if it breaks again" below). Copy the versions
   straight from this project's `package.json` rather than installing `latest`:

   ```bash
   pnpm add eslint@^9.39.4 eslint-config-next@latest @typescript-eslint/eslint-plugin@^8.62.1 @typescript-eslint/parser@^8.62.1 eslint-plugin-unicorn@^70.0.0
   ```

   `eslint-config-next` should match the target project's own installed Next.js major version
   (pin it to a specific version if the target project isn't on Next 16 - see step 4).

3. **Copy `eslint.config.mjs`**, then adjust two things for the new project:

   - The `**/store/**`, `**/zustand/**`, `**/*.store.ts` override at the bottom only matters if the
     target project also uses zustand with a `set`/`get` argument-naming convention - delete that
     block if not applicable.
   - `parserOptions.project: "./tsconfig.json"` assumes a `tsconfig.json` at the project root -
     adjust the path if the target project's is elsewhere.

4. **If the target project is NOT Next.js**, drop the `eslint-config-next` import and the
   `...nextConfig` spread at the top of `eslint.config.mjs`, and replace it with that project's own
   base config (or nothing, if there isn't one). Everything under `local-rules/*` and
   `unicorn/catch-error-name` still works standalone - they don't depend on Next's config at all.
   Rules that reference Next.js/Supabase-specific conventions by name
   (`db-redis-verb-naming`/`response-variable-naming`'s `selectDB*`/`insertDB*`/etc. prefixes,
   `no-zustand-types-in-store-file`, `hook-naming-convention`'s `useSetXxx`/`useXxxHandlers`
   shapes) will simply never fire if the target project doesn't use those same naming conventions -
   they're inert, not broken, in that case.

5. **Wire `eslint` into the target project's build script**, matching this project's pattern, so
   lint errors actually block the build (not just show in the editor):

   ```json
   "scripts": {
     "build": "eslint . --max-warnings=-1 && next build",
     "lint": "eslint ."
   }
   ```

   Replace `next build` with whatever the target project's actual build command is if it isn't
   Next.js.

6. **Run `pnpm exec eslint . --format json` once and read the counts per rule** (see "Verifying a
   rule isn't producing false positives" below) before trusting the setup in the new project - a
   different codebase's existing patterns can produce a different false-positive profile than this
   one had. Expect to re-tune `db-redis-verb-naming`, `response-variable-naming`,
   `hook-naming-convention`, and `arrow-fn-only-for-hooks` first if the new project's conventions
   differ even slightly, since those four required the most iteration here.

7. **Decide severities for the new project.** Every rule here defaults to `"warn"` except
   `local-rules/no-banned-words`, which is `"error"` by explicit request (a hard rule that blocks
   the build). Reconsider per-rule severity for the new project rather than copying this file's
   choices blindly - what's a hard rule in one codebase may be a soft convention in another.

8. **Optional: copy this file (`dev_readme-eslint.md`) itself into the new project** and point an
   AI assistant at it (e.g. "read dev_readme-eslint.md before writing any code") so it follows the
   same naming/architecture conventions when generating code - not just the parts ESLint can check,
   but everything below the rule table too (hook naming, the verb-prefix taxonomy, the
   `hook-set`/`hook-handlers` patterns and worked examples, JSX attribute order, loading-state
   granularity, etc.). ESLint only catches violations after the fact; handing an AI this file up
   front means it writes compliant code the first time instead of needing every rule pointed out in
   review.

<br/>

## How to fix ESLint if it breaks again

If `pnpm lint` / `pnpm build` suddenly crashes instead of reporting normal lint problems, check in
this order:

1. **`eslint-config-next` version vs `eslint` version mismatch.** `eslint-config-next` follows the
   installed Next.js major version and requires a matching ESLint major (currently ESLint >= 9 for
   Next 16's config). If `package.json` has `"eslint-config-next": "latest"` and someone bumps Next,
   `eslint-config-next` silently expects a newer ESLint than what's pinned. Fix: bump `"eslint"` in
   `package.json` to match, or pin `eslint-config-next` to a version built for the ESLint major you
   have.
2. **`eslint-plugin-unicorn` version vs ESLint major mismatch.** `unicorn` requires the ESLint major
   it was built for (check with `npm view eslint-plugin-unicorn@<version> peerDependencies`). If
   it's incompatible you'll see `TypeError: Cannot read properties of undefined` while ESLint loads
   the plugin. Fix: install the `unicorn` version whose peer range matches your ESLint version.
3. **Something inside `eslint-rules/*.js` uses a removed context API.** ESLint 9 removed
   `context.getScope()` (use `context.sourceCode.getScope(node)` instead) and deprecated (but kept)
   `context.getSourceCode()`. If a custom rule throws `context.getScope is not a function`, that's
   the cause.
4. **After any dependency bump**, run `pnpm exec eslint app --format json` and check the `errorCount`
   / `warningCount`, then spot-check a few hits per rule for false positives before trusting the
   numbers - see the "verifying a rule" section below.

<br/>

## Rules enforced by ESLint (mechanically checked)

These fire as real ESLint warnings/errors in your editor and in `pnpm lint` / `pnpm build`. Custom
rules live in `eslint-rules/*.js`, wired up as `local-rules/<name>` in `eslint.config.mjs`.

| Rule                                                     | Source                                              | Severity              | What it catches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local-rules/no-export-const-classname`                  | custom                                              | warn                  | `export const foo = "tailwind classes..."` - keep className strings inline in the component that uses them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `local-rules/require-storybook-url`                      | custom                                              | warn                  | exported component functions whose names start with an uppercase letter must have a local Storybook or Chromatic `?path=/story/...` URL comment immediately above them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `local-rules/no-localstorage-direct`                     | custom                                              | warn                  | `localStorage.setItem(...)` / `localStorage.getItem(...)` - use a zustand store with `persist` instead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `local-rules/no-banned-words`                            | custom                                              | **error**             | banned jargon words (see list below) in identifiers, string literals, and comments                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `local-rules/no-function-in-deps`                        | custom                                              | warn                  | a locally-defined function (`useCallback`, plain function/arrow, or a destructured `handleXxx`/`fetchXxx` from a custom hook) placed in a `useCallback`/`useMemo`/`useEffect`/`useLayoutEffect` deps array. Exempts `useState` setters (`set*`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `local-rules/no-vague-names`                             | custom                                              | warn                  | 1-letter or vague names (`err`, `idx`, `res`, `req`, `val`, `obj`, `arr`, `elem`, `tmp`, `num`, `str`) in declarations/params/catch clauses. Exceptions: `e` for event handler params, `_` for intentional-discard params                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `local-rules/style-before-classname`                     | custom                                              | warn                  | JSX elements where `className` appears before `style`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `local-rules/sdk-method-naming`                          | custom                                              | warn                  | best-effort only - flags a function/method/const literally named `fetch` or `fetchXxx` (reserved for genuine 3rd-party API calls; our own DB/Redis reads should be `select`/`get`) and a callback literally named `saveFn`/`save` (should be named for the backend verb, e.g. `handleUpdateDB`). Suppress a legitimate 3rd-party wrapper with `// eslint-disable-next-line local-rules/sdk-method-naming -- <reason>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `local-rules/no-throwaway-alias`                         | custom                                              | warn                  | best-effort only - `const x = y` where `y` is a bare identifier and `x` is read exactly once afterward (a rebind that adds no information)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `local-rules/no-zustand-types-in-store-file`             | custom                                              | warn                  | `export type`/`export interface` in a file that also calls zustand's `create()` - importing that type from a server action loads the whole store on the server                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `local-rules/input-value-naming`                         | custom                                              | warn                  | a `useState` pair `[x, setX]` used as a controlled `<input>`/`<textarea>` `value` prop, where `x` doesn't end in `Value` or `setX` doesn't match `set` + the value name (e.g. `phoneNumberValue`/`setPhoneNumberValue`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `local-rules/hook-naming-convention`                     | custom                                              | warn                  | see the "Hook naming convention rule" section below - covers `useXxxStore`/`persist`, `useXxxHandlers` (must have `handleXxx` returns, at least one, no trivial passthroughs), `useAutoUpdateXxx`, and `useSetXxx` (only `isSkeleton`/`is*Skeleton`/`refetch*` returns)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `local-rules/handle-prefix-location`                     | custom                                              | warn                  | a function literally named `handleSelect`/`handleInsert`/`handleUpdate`/`handleDelete` defined outside a `useSetXxx.ts`/`useXxxHandlers.ts`/`useAutoUpdateXxx.ts` file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `local-rules/response-variable-naming`                   | custom                                              | warn                  | `const x = await someFn(...)` or `const x = await obj.someMethod(...)` where the called name's own leading verb is recognized (read: `select`/`get`/`fetch`/`hgetall`/`find`; write: `insert`/`update`/`upd`/`delete`/`del`/`set`/`create`/`add`/`hadd`/`hdel`/`hupd`/`push`/`remove`/`increase`/`decrease`/`toggle`/`upload`/`download`/`import`/`export`). For a read, `x` must be `<methodName>Resp` or `response`. For a write, `x` must be `response` or end in `Resp` with a non-vague domain word before it (`ticketsResp` is fine, doesn't have to match the method name; `dataResp`/`resultResp` are still rejected). Also flags a generic placeholder name (`result`/`data`/`res`/`something`/`output`/`value`) even when the called name's verb isn't recognized at all. Excludes `getSupabaseServer`/`createImageBitmap`/`json`/`getCookie` (client factories and built-in Web APIs, not this codebase's SDK read/write convention) |
| `local-rules/db-redis-verb-naming`                       | custom                                              | warn                  | a function named `selectDB*`/`insertDB*`/`updateDB*`/`deleteDB*`/`getRedis*`/`setRedis*`/`updRedis*`/`delRedis*` whose body has no matching Supabase/Redis call - one-directional only (see note below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `local-rules/no-process-env-non-null-assertion`          | custom                                              | warn                  | `process.env.X!` - a non-null assertion on an env var hides a real missing-value case; use `process.env.X`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `local-rules/arrow-fn-only-for-hooks`                    | custom                                              | warn                  | a top-level `const x = () => {}` / `const x = function () {}` where `x` isn't a hook name (doesn't start with `use`) - components and plain helpers must use `function x() {}` instead. Arrow functions passed as call _arguments_ (`useCallback(() => {})`, `.map(item => ...)`, JSX inline handlers) are never flagged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `local-rules/ts-ignore-dynamic-table-only`               | custom                                              | warn                  | a `// @ts-ignore` comment not immediately followed by a `.from(...)` call whose argument is a template literal/variable (dynamic table name) - a static string table name never needs it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `local-rules/type-naming-prefix`                         | custom                                              | warn                  | an exported `type`/`interface` not prefixed `T`/`I` (e.g. `TEmailDB`, `IDeliveryInstructionsFormData`). Non-exported types don't need the prefix. `XxxProps` types are exempt either way (stay `ComponentNameProps`, never `TComponentNameProps`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `local-rules/one-liner-component-props-interface`        | custom                                              | warn                  | a JSX-rendering PascalCase component whose destructured props use a long inline object type that does not fit within the project's 130-character line limit - extract `ComponentNameProps` as a named interface or type; short inline props that fit on one line remain allowed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `local-rules/no-type-export-in-action-or-component`      | custom                                              | warn                  | an exported `type`/`interface` in a component (`.tsx`, PascalCase filename, renders JSX) or server action file (`*Action.ts`, under an `actions/` folder, or has `"use server"`) - move it to its own type file. A component's own `XxxProps` type is exempt (expected to live alongside it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `local-rules/imports-order`                              | custom                                              | warn, **autofixable** | imports out of order by re-usability tier (see "Import order rule" section below) - side-effect-only imports (e.g. `import "./globals.css"`) first, then react, then next, then other packages, **blank line**, then type imports, then `@/widgets/*`, then other relative imports (descending path depth), then other `@/` imports (descending path depth). `eslint --fix` reorders the whole import block and inserts the blank line automatically                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `local-rules/no-cross-route-group-absolute-import`       | custom                                              | warn                  | an `@/(group)/...` absolute import used from a file that's already inside that same route group (e.g. a file under `app/(admin)/` importing `@/(admin)/store/useAddFoodStore`) - should be a relative `../` import instead, since it's local to this feature area, not a project-wide absolute reference. Not autofixable (would need filesystem-aware relative-path resolution, not just text reorder)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `local-rules/require-absolute-import-for-shared-folders` | custom                                              | warn, **autofixable** | a relative (`../` or `./`) import that resolves into `shared`, `widgets`, `features`, or `libs` (matched anywhere in the path) or the root-level `components`/`api` folders (matched only when the import is rooted at `app/components/...`/`app/api/...`, since feature-local `components/` subfolders are common and shouldn't be flagged) - these are re-usable buckets and should always be imported via `@/`. Exempts an import when the importing file is itself already inside the same top-level bucket (e.g. two files both under `app/features/backup/` can still import each other relatively)                                                                                                                                                                                                                                                                                                                                       |
| `@typescript-eslint/no-explicit-any`                     | `@typescript-eslint`                                | warn                  | `any` anywhere - type annotations, `catch (error: any)`, and `as any` casts are all covered by this one built-in rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `unicorn/catch-error-name`                               | `eslint-plugin-unicorn`                             | warn                  | `catch (e)` / `catch (err)` - renames to `catch (error)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `@typescript-eslint/no-unused-vars`                      | `@typescript-eslint`                                | warn                  | unused variables (ignores `_`-prefixed; ignores `set`/`get` args inside `**/store/**`, `**/zustand/**`, `**/*.store.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `react-hooks/exhaustive-deps`                            | `eslint-config-next` (React Compiler ESLint plugin) | warn                  | missing/extra hook dependencies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| everything else from `next/core-web-vitals`              | `eslint-config-next`                                | mixed                 | Next.js/React Compiler correctness rules (`react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/refs`, `jsx-a11y/*`, `import/*`, etc.) - not written by us, comes from Next 16's own recommended config                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Request-bound Supabase clients and RLS (`use-rls-supabase-client`)

`supabaseAdmin` authenticates with the service-role key, so its database queries bypass Postgres row
level security (RLS). In API routes, server pages/layouts, and server actions, use a client that reads
the caller's Supabase session from cookies:

- `supabaseRouteHandler()` is the route-handler-specific choice.
- `supabaseServer()` is also valid and preserves RLS because it reads the same authenticated cookies.

Wrong - the submitted `owner_id` reaches the database through the service role, so the product
INSERT policy is skipped:

```ts
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export async function POST(request: Request) {
  const product = await request.json()
  return supabaseAdmin.from("23_products").insert(product)
}
```

Correct - the caller session reaches Supabase, and RLS checks that `auth.uid()` matches the inserted
row's `owner_id`:

```ts
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

export async function POST(request: Request) {
  const product = await request.json()
  const supabase = await supabaseRouteHandler()
  return supabase.from("23_products").insert(product)
}
```

`supabaseAdmin.auth.admin.*`, `supabaseAdmin.storage.*`, and database work outside request-bound
files are not flagged. An intentional database service-role operation inside request code must use a
scoped ESLint suppression with a reason that identifies the authorization performed before the
query.

### Banned words (`no-banned-words`, hard error)

This rule is a **hard rule, not a preference** - any hit is an `error` and fails `pnpm build`. It
checks identifiers, string literals, and comments for:

- `blob` (any case) - name the real noun for what the thing is (file, buffer, image). Exception:
  the literal Web API `Blob` constructor/type (`new Blob(...)`, `: Blob`) is not flagged - only a
  chosen variable/param name spelled `blob`/`Blob` is.
- `plain` - name the real noun/verb for what the thing is
- `orphan` / `orphaned` - spell out what is actually unreferenced/unlinked
- `dead` - spell out what is actually unused/unreachable
- `popup` - name what it actually is (notification/toast/card)
- `server attaches` - name the real mechanism
- `instructions` - for user-facing AI input, use `prompt` instead (this rule can't tell that
  exception apart from "fine inside an AI system prompt's own text", so it flags both - suppress
  the system-prompt-text case with a comment if it fires there)
- `saving` / `isSaving` - say which backend: `updating`/`inserting` (Supabase), `setting` (Redis)
- `arm` / `armed` - use `enable`/`enabled`
- `SDK call` - use "SDK method" or "SDK sends an API request"
- `carry` / `carrying` - use `sending` or name the real mechanism
- `mutate` / `mutates` - use `update`/`upd` per the verb table, not the generic CS term
- `"has loaded real data"` / `"real (fetched) state"` - name the actual hook and verb instead
- `can't` / `cannot` / `never can` - state the positive guarantee or actual mechanism instead
- `load` / `loads` as a standalone word - name the actual verb (fetch/select/get/insert/read/etc.)
  instead. Word-boundary matching means this only fires on the exact word `load`, not
  `upload`/`reload`/`download`/`workload`.
- `narrow` / `narrowed` / `narrowing` - fine as TypeScript's own term for type narrowing, but this
  rule can't tell that apart from the banned vague-verb meaning ("picked the error case out of a
  union") - it flags both. Suppress the TS-narrowing case with `// eslint-disable-next-line
local-rules/no-banned-words -- TypeScript type narrowing, not the vague verb` if it fires there.
- `closure` / `closures` - say what's actually stale/captured instead of naming the JS concept and
  stopping there. Same caveat as `narrow` - this rule can't tell "unexplained" from "explained",
  it flags every occurrence.

These last three (`load`, `narrow`, `closure`) are enforced even though they're genuinely
context-dependent and will produce false positives (e.g. on legitimate TypeScript narrowing code) -
that tradeoff was a deliberate choice, not an oversight; suppress with a scoped
`eslint-disable-next-line` and a short reason when they misfire.

### Verifying a rule isn't producing false positives

Run `pnpm exec eslint app --format json > /tmp/eslint.json`, then:

```bash
python3 -c "
import json
data = json.load(open('/tmp/eslint.json'))
from collections import Counter
counts = Counter()
for r in data:
    for m in r['messages']:
        counts[m.get('ruleId', 'unknown')] += 1
for rule, count in counts.most_common(40):
    print(count, rule)
"
```

Then sample a handful of hits per rule and read the actual line - a new custom rule is worth
distrusting until you've eyeballed real hits, since AST-only pattern matching can't see types (this
is exactly how `no-function-in-deps` initially flagged plain zustand-store values like `food` as
"functions", and was later narrowed to only flag `useCallback` bindings and destructured
`handleXxx`/`fetchXxx` names).

### Hook naming convention rule (`hook-naming-convention`), in depth

Checked purely off the file's basename (these hooks always live in their own file here):

- **`useXxxStore.ts`** must call zustand's `persist(...)` middleware. If it doesn't, name it plain
  `useXxx` instead (no `Store` suffix). 9 existing files (`useJobStore.ts`, `useChefOrdersStore.ts`,
  `useMessagesStore.ts`, etc.) fail this today - confirmed as real inconsistencies, not a rule bug;
  they should eventually be renamed to drop `Store`, since only `userStore.ts` actually persists.
- **`useSetXxx.ts`** - a hook that reads fresh state, calls its SDK/DB method once (usually inside
  a `refetchXxx` callback fired once from a `useEffect`), and returns only `isSkeleton`/
  `is*Skeleton` and/or `refetch*`. Anything else returned is flagged.
  ```ts
  export const useSetMailboxes = () => {
    const [isSkeleton, setIsSkeleton] = useState(false)
    const refetchMailboxes = useCallback(async () => {
      try {
        setIsSkeleton(true)
        const getSESMailboxesResp = await emailsSDK.getSESMailboxes(encryptedEnvsClient)
        if (typeof getSESMailboxesResp === "string") return toast.show("error", "", getSESMailboxesResp)
        setMailboxes(getSESMailboxesResp)
      } finally {
        setIsSkeleton(false)
      }
    }, [userId])
    useEffect(() => {
      refetchMailboxes()
    }, []) // do it once - then only if user clicks "refetch" button
    return { isSkeleton, refetchMailboxes }
  }
  ```
- **`useXxxHandlers.ts`** - only for a hook containing user actions (clicks, submits, menu
  actions) that keeps business logic out of components. Checked:
  - Must export **at least one** function named `handleXxx` (e.g. `handleDelete`,
    `handleHupdUnsubscribeConfig`) - a Handlers file with none is flagged.
  - **Every** returned function must be named `handleXxx` - a differently-named returned function
    (`updateThing`, `doSomething`) is flagged.
  - Best-effort: a `handleXxx` function whose entire body is a single `setXxx(...)` call (no
    `await`/`if`/`try`) is flagged as a likely trivial passthrough - per the stated rule, "not
    everything that touches state belongs in a handlers hook." A one-line setter with no
    validation/API call/branching should be a plain zustand store action instead (defined directly
    in the store, using `get()` there if it needs the current value), destructured straight from
    the store in the component. This is a heuristic (checks shape, not intent) - suppress with
    `// eslint-disable-next-line local-rules/hook-naming-convention -- <reason>` if a genuinely
    simple handler still does real work in a way the check can't see.
  - Mental model: **Handler decides what should happen. Store holds the state. SDK talks to the
    backend.** Handlers hooks should read fresh zustand state via `.getState()` when a stale
    closure is possible, keep one responsibility per handler, and never mix in fetching/
    subscription/auto-update logic - none of that is mechanically checked (needs real intent, not
    shape), but is a real review expectation.
- **`useAutoUpdateXxx.ts`** - `useEffect`-only; a hook that optimistically updates state after 2-3
  seconds of inactivity (paired with `StatusIndicator`). Should not return handler functions.

### `db-redis-verb-naming` is one-directional on purpose

This rule only flags "named like `selectDB*`/`getRedis*`/etc. but the body doesn't call that
client" - it does **not** flag "calls Supabase/Redis but isn't named with that prefix". The reverse
direction was built and tested, then dropped: this codebase calls Supabase directly inside
page/layout/component functions and route handlers (`GET`/`POST`), and uses other established
helper suffixes (`...InDBAction`) that don't literally start with `selectDB`/`insertDB`/etc. -
flagging every such call site produced far more false positives than real findings. Body-text
scanning also can't see through a function that delegates to another `selectDB*`/`insertDB*`
helper (e.g. `deleteDBJobFn` calling `deleteDBImageFromBucketAction` internally) - if this rule
misfires on a real case like that, add a scoped suppression with a reason:

```ts
// eslint-disable-next-line local-rules/db-redis-verb-naming -- delegates to deleteDB*Action helpers, doesn't call Supabase directly
async function deleteDBJobFn(id_url: string) { ... }
```

### `response-variable-naming` applies to any awaited call, with a small exclusion list

This rule checks every awaited call (bare function or `obj.method()`), not just this codebase's own
`selectDB*`/`insertDB*`/etc. helpers - so `const result = await importFiles(...)` and
`const something = await messagesSDK.selectTickets(...)` are both caught, using just the method
name (`selectTickets`, ignoring the `messagesSDK.` prefix) to build the suggested `<methodName>Resp`
name. A write call accepts _either_ `response` or `<methodName>Resp` - both
`const response = await updateThing()` and `const updateThingResp = await updateThing()` are fine.

It was tried fully unscoped first and had to gain a small exclusion list
(`getSupabaseServer`/`createImageBitmap`/`json`/`getCookie`) - these match the read-verb pattern by
name shape (`get*`, or `json` which happens not to but was still noisy) but aren't this codebase's
SDK read convention: `getSupabaseServer` returns a client/factory, not data; `createImageBitmap`/
`Response.json()` are built-in Web APIs. If this rule fires on another such case, add the method
name to `EXCLUDED_METHOD_NAMES` in `eslint-rules/response-variable-naming.js` rather than
suppressing it file-by-file.

A called name whose own leading verb isn't recognized at all (e.g. `compressImage`) is only
flagged if the assigned name is a generic placeholder (`result`, `data`, `res`, `something`,
`output`, `value`) - a real descriptive name like `compressedImage` is left alone, since there's
not enough information to say it's wrong.

### Import order rule (`imports-order`), in depth

Sort imports by re-usability, most re-usable first, least re-usable last, split into two groups
with a **required blank line** between them:

**Tier 0 - side-effect-only imports** (no specifiers, e.g. `import "./globals.css"`): always first,
right after `"use client"`/`"use server"` if present, before even `react`. Checked by
`node.specifiers.length === 0`, not by path shape - a side-effect import's path can otherwise look
like anything (relative, `@/`, a bare package), so it's excluded from the normal tier-6/7
segment-count sort entirely and always wins.

```ts
"use client"

import "./globals.css"

import { useState } from "react"
```

**Group A - external** (tiers 1-3):

1. `react`
2. `next` / `next/*`
3. other `node_modules` packages (`framer-motion`, `react-icons`, `tailwind-merge`, etc.)

**Group B - project** (tiers 4-7): 4. type-only imports, relative or `@/`-absolute (`../types/TXxx`, `@/interfaces/IXxx`) 5. `@/widgets/*` (reusable, project-agnostic by design) 6. other relative imports (`../`, `./` - any depth) 7. other `@/` absolute imports

Within tiers 6 and 7, imports are sorted by **descending path segment count** - more segments means
more specific/less reusable, so it sorts _later_ within its tier. A relative import (`../` or `./`,
any depth) always sorts above every `@/` import in tier 7, regardless of its own segment count -
reaching for a relative path is inherently less "absolute-project-wide" than an `@/` import, no
matter how deep. Route-group segments like `(admin)` count as a normal path segment.

```ts
"use client" // if client component

import { useEffect } from "react" // react at a top
import Image from "next/image" // then next.js imports
import { AnimatePresence, motion } from "framer-motion" // then deps

import { TCronScheduleDB } from "../types/TCronScheduleDB" // types at a top
import { getFrequencyLabel } from "@/widgets/utils/getFrequencyLabel" // widget - reusable, doesn't know this project
import { CronScheduleTerminal } from "./components/CronScheduleTerminal" // relative - most segments first
import { useAutoUpdateDBCron } from "../hooks/useAutoUpdateDBCron" // relative - fewer segments than above
import { Textarea } from "@/components/shared/Textarea" // @/ - most segments among @/ imports
import { CheckboxSquare } from "@/components/shared/CheckboxSquare" // @/ - equal depth, alphabetical tiebreak
import { Input } from "@/components/shared/Input" // @/ - equal depth, alphabetical tiebreak
import { useLoading } from "@/store/useLoading" // @/ - fewest segments, most generic, sorts last
```

Worked examples, exactly as given (both real cases that shaped this rule):

**Example 1** - all four imports absolute (`@/`), before the `no-cross-route-group-absolute-import`
rule existed to flag `useAddFoodStore`/`FoodInput` as needing to be relative in the first place:

```ts
// wrong
import { IAddOrEditFoodFormData } from "@/(admin)/interfaces/AddOrEditFoodFormData"
import { useLoading } from "@/store/ui/useLoading"
import { useAddFoodStore } from "@/(admin)/store/useAddFoodStore"
import { getPusherClient } from "@/libs/pusher"
import { FoodInput } from "@/(admin)/components/ui/Inputs/FoodInput"

// correct - sorted by descending path depth (most segments first)
import { IAddOrEditFoodFormData } from "@/(admin)/interfaces/AddOrEditFoodFormData"
import { FoodInput } from "@/(admin)/components/ui/Inputs/FoodInput"
import { useAddFoodStore } from "@/(admin)/store/useAddFoodStore"
import { useLoading } from "@/store/ui/useLoading"
import { getPusherClient } from "@/libs/pusher"
```

**Example 2** - once `useAddFoodStore` and `FoodInput` are correctly rewritten as relative imports
(per `no-cross-route-group-absolute-import`, since the importing file is also under `(admin)`),
relative imports move above `@/` imports entirely, each group still sorted by descending depth.
Given as a segment-count annotation, exactly as specified:

```
../components/FoodInput        → 2 segments, no @/, so it goes above all @/ imports
@/(admin)/store/useAddFoodStore → 3 segments
@/store/ui/useLoading           → 3 segments
@/libs/pusher                   → 2 segments
```

i.e.:

```ts
import { FoodInput } from "../components/FoodInput"
import { useAddFoodStore } from "@/(admin)/store/useAddFoodStore"
import { useLoading } from "@/store/ui/useLoading"
import { getPusherClient } from "@/libs/pusher"
```

Note `useAddFoodStore` here is still written as the absolute `@/(admin)/...` form in this
particular annotation - in practice `no-cross-route-group-absolute-import` would also flag it (same
as `FoodInput`) if the importing file is itself under `(admin)`, so the fully-corrected real-world
version rewrites it to `../store/useAddFoodStore` too, landing it in the relative group above
`useLoading`/`pusher` rather than the `@/` group.

Within tier 6's same-directory (`./`) imports specifically, there's a secondary check on top of the
depth sort: an import that's used **only** by the current file (not reused anywhere else in the
project) must sort after a same-directory import that IS reused elsewhere - checked with
`grep -rl <importedName>` from the repo root; if that resolves to just the current file plus the
imported module's own definition file, it's isolated.

This is the most expensive rule in the set - the single-consumer check shells out to `grep` once
per same-directory import (only when a file has 2+ of them), adding real wall-clock time to
`pnpm lint`/`pnpm build` on a large codebase. It was built this way deliberately (accepting the
cost) rather than skipped, per explicit instruction. If lint ever becomes too slow because of it,
the fix is to cap/cache the `grep` calls inside
`eslint-rules/imports-order.js`, not to silently drop the check.

A type-shaped `@/` import (`@/interfaces/TXxx`, `@/(admin)/interfaces/IXxx`) sorts into tier 4 with
the relative type imports - this was a real gap caught during verification (the rule originally
only recognized relative type imports, so `@/(admin)/interfaces/TIngredientImageListType` fell into
the generic "other `@/`" bucket until fixed).

**Autofix**: `eslint --fix` rewrites the entire contiguous import block in one pass (preserving each
import's own leading comments and exact text, only reordering) and inserts the required blank line
between the external and project groups. Verified against the worked example above and against a
real repo file (`addRandomFood.ts`, moved a bare `axios` import ahead of two `@/store/*` imports).

**History**: this rule originally had `@/store/*` and same-directory `./` imports as fixed tiers (a
simpler model than the current one), with same-directory imports sorting _last_ rather than
relative imports sorting _above_ `@/` imports. That model was replaced after a real example showed
it produced the wrong order for route-group-scoped imports (`@/(admin)/store/useAddFoodStore`
sorting the same as `@/store/ui/useLoading`, when the former is meaningfully less reusable) - see
the `no-cross-route-group-absolute-import` rule below, which is the other half of that fix.

### Cross-route-group absolute import rule (`no-cross-route-group-absolute-import`), in depth

A "route group" is a Next.js App Router folder like `app/(admin)`, `app/(site)`, `app/(auth)` - the
parens are stripped from the URL but still group files on disk (this project has `(admin)`,
`(auth)`, `(chef)`, `(jobs)`, `(site)`, `(support)`). Importing another file in the **same** route
group via its absolute `@/(group)/...` path is unnecessary indirection - a relative `../` import
says "this is local to my own feature area", while `@/(group)/...` reads as if it were reaching
across the project the same way `@/store/*` or `@/libs/*` would, which is misleading when the two
files are actually right next door to each other.

```ts
// wrong - app/(admin)/widgets/SomeWidget.tsx importing another (admin) file absolutely
import { useAddFoodStore } from "@/(admin)/store/useAddFoodStore"

// correct - same file, relative import instead
import { useAddFoodStore } from "../store/useAddFoodStore"
```

Only flags an import whose route group **matches** the current file's own route group - importing
`@/(site)/...` from an `(admin)` file, or a group-less `@/store/*` path, is unaffected (that's a
genuine cross-feature or genuinely-shared import, not local indirection). Not autofixable: turning
`@/(admin)/store/useAddFoodStore` into the correct relative path requires resolving both files'
real filesystem locations and computing the relative distance between them, which is more than a
text-reorder fixer can safely do - fix these by hand.

### Shared-folder absolute import rule (`require-absolute-import-for-shared-folders`), in depth

The opposite problem from `no-cross-route-group-absolute-import`: some folders exist specifically
to hold broadly re-usable code (`shared`, `widgets`, `features`, `libs`) or are the project's single
global bucket for a whole category of file (`components`, `api`) - importing from one of these via
a relative path (`../shared/useToast`, `../../features/backup/BackupSDK`) hides that the target is
meant to be reached from anywhere, making it read like ordinary feature-local file organization
instead.

```ts
// wrong - app/store/user/cartStore.ts reaching into app/store/shared/
import useToast from "../shared/useToast"

// correct
import useToast from "@/store/shared/useToast"
```

Two matching modes, because "components" specifically is ambiguous:

- **`shared`, `widgets`, `features`, `libs`** - matched as a path segment **anywhere** in the
  resolved import path. There's more than one legitimate `shared` folder in this project
  (`app/store/shared/`, `app/components/shared/`), so this can't be anchored to a single root path.
- **`components`, `api`** - matched only when the import resolves into the **top-level**
  `app/components/...` or `app/api/...` directory specifically. Individual feature/page folders
  very commonly have their own local `components/` subfolder (e.g.
  `app/(jobs)/jobs-CMS/components/Modals/...`) - that's normal same-feature organization, not the
  global `app/components/`, so it's deliberately not flagged. Root-anchoring is what tells them
  apart.

**Same-bucket exception**: an import is exempt when the importing file is itself already inside the
same top-level bucket - e.g. `app/features/backup/useDbBackup.ts` importing `../BackupSDK` from the
same `app/features/backup/` folder is fine, since that's ordinary organization within one feature,
not reaching into a _different_ re-usable bucket from outside it. This mirrors
`no-cross-route-group-absolute-import`'s own-group exception. Note this exception is bucket-scoped,
not folder-scoped: a file under `app/components/` (bucket `"components"`) reaching into
`app/components/shared/` (bucket `"shared"`) is a _different_ bucket and still gets flagged - only
two files that resolve to the _same_ bucket name are exempt from each other.

**Autofix**: unlike the cross-route-group rule, this one _is_ autofixable - the correct `@/...` path
is pure path arithmetic (strip the `app/` prefix from the resolved absolute path), no filesystem
existence check needed. Verified on `app/components/Layout.tsx` (`./shared/Toast` →
`@/components/shared/Toast`) and `app/store/user/cartStore.ts` (`../shared/useToast` →
`@/store/shared/useToast`).

**Found while building this rule**: two files had import paths that predated a `useToast`/`Toast`/
`ChatImagePreview` move into their respective `shared/` folders and were never updated -
`app/components/Layout.tsx` (`@/store/ui/useToast`, `./ui/Toast`, `./ui/ChatImagePreview`, none of
which resolve to a real file) and `app/store/user/cartStore.ts` (`../ui/useToast`, same issue).
These were genuine `TS2307` "cannot find module" compile errors, unrelated to ESLint - fixed as part
of this rule's verification pass, not something this rule itself can catch (it only rewrites
relative→absolute for paths that already resolve to something real).

### Some existing files intentionally left non-compliant

`hook-naming-convention` flags 9 existing `useXxxStore.ts` files (e.g. `useJobStore.ts`,
`useChefOrdersStore.ts`, `useMessagesStore.ts`) for not calling `persist(...)`. This is a real,
confirmed naming inconsistency in the existing codebase (only `userStore.ts` actually persists) -
these files should eventually be renamed to drop the `Store` suffix (e.g. `useJobStore.ts` ->
`useJob.ts`), not have the rule loosened to match them.

<br/>

## Conventions NOT enforced by ESLint (judgment calls - follow in code review)

These either have no reliable mechanical check, or would need type information / cross-file
context that a syntax-only ESLint rule can't get. They're still real rules for this codebase -
just not something a red squiggly line will catch.

### TypeScript patterns

Rules 1-4, 6-7 below are ESLint-enforced (see the rule table above: `@typescript-eslint/no-explicit-any`,
`no-process-env-non-null-assertion`, `ts-ignore-dynamic-table-only`, `no-vague-names`,
`type-naming-prefix`, `no-type-export-in-action-or-component`). Rule 5's `T`/`I` prefix table and
rule 8 are listed here in full since only part of each is checkable:

1. **No `any` - ever.** `@typescript-eslint/no-explicit-any` catches `: any` type annotations,
   `catch (error: any)`, and `as any` casts in one rule.
2. **`catch` - always `unknown`, always narrow.** Covered by the same rule - `catch (error: any)`
   is flagged; narrow with `error instanceof Error ? error.message : String(error)`.
3. **Crossing incompatible types - `as unknown as T`, never `as any`.** `as any` is flagged by
   `no-explicit-any`; `as unknown as T` is not flagged (that's the correct escape hatch when a
   concrete type doesn't structurally match a local duck-type you control).
4. **`// @ts-ignore` - dynamic table names only.** Enforced by `ts-ignore-dynamic-table-only` -
   only allowed when the very next line's `.from(...)` argument is a template literal or variable,
   never a plain string literal.
5. **Type naming** - only the `T`/`I` export-prefix half is enforced (`type-naming-prefix`); which
   semantic bucket a type falls into (DB row vs UI/state vs domain result) is a judgment call:

   | shape         | prefix                                 | example                                    |
   | ------------- | -------------------------------------- | ------------------------------------------ |
   | DB row        | `TXxxDB`                               | `TEmailDBWithLabelsAndFolders`             |
   | UI / state    | `TXxx`                                 | `TEmailWithThreads`                        |
   | Props         | `ComponentName` + `Props` (no `T`/`I`) | `EmailRowProps`                            |
   | Domain result | noun, not mechanism                    | `TCheckSpamResult`, not `TPersistedResult` |

   Note: `app/interfaces/types_db.ts` (Supabase's own generated file, regenerated by
   `pnpm update-types`) and any vendored/generated types are naturally exempt in practice - the
   rule still flags them, but renaming a generated file doesn't stick past the next regen.

6. **No single-letter names - anywhere.** `no-vague-names` walks into destructuring patterns too
   (`Object.entries(data).forEach(([k, v]) => ...)` flags both `k` and `v`, not just bare params),
   plus the vague-but-not-single-letter set (`ct`, `fn`, `cb`, `err`, `idx`, `res`, `req`, `val`,
   `obj`, `arr`, `elem`, `tmp`, `num`, `str`). This includes zustand's own generic `SetState` type
   param convention (`(fn: (prevState: X) => ...) => void` across ~7 store files) - deliberately
   not exempted per the user's explicit call to enforce it everywhere, including there.
7. **Type files - never export from components or actions.** Enforced by
   `no-type-export-in-action-or-component` for `.tsx` component files and `*Action.ts`/`actions/`/
   `"use server"` files. A component's own `XxxProps` type is exempt (expected to live alongside
   it, per the codebase's existing convention - see rule 5's Props row above).
8. **Use existing types - never invent.** Not ESLint-enforced - checking "does an equivalent type
   already exist elsewhere in the project" needs a project-wide type graph, which a syntax-only
   rule can't build reliably. Before writing a new inline type for a function parameter, check the
   domain's existing `TXxx`/`IXxx` files first and reuse/`Pick`/`Omit` from them instead of
   re-declaring the same shape under a new name.

### General code style

1. Keep code concise and prefer one-liners when readable.
2. Use ternaries where they improve clarity.
3. Prefer early returns.
4. Keep commented lines that already exist.
5. If a function can return an error, return a string error instead of throwing, unless the file
   already uses a different pattern.
6. JSX attribute order: `style` first, then `className`, then the rest, `autoFocus` last (this
   one's `style`-before-`className` half **is** ESLint-enforced, see
   `local-rules/style-before-classname` above - the full ordering including `...rest`/`autoFocus`
   isn't).
7. Use `useEffect` only when needed; keep side effects in hooks, not components.
8. Each distinct realtime concern (typing indicator, ticket updates, message updates, etc.) must
   live in its own hook file - don't merge multiple Pusher event groups into one hook or one
   component `useEffect`.
9. Prefer `null` over empty strings where the absence of a value matters - e.g. keep a field
   typed `string | null` (or `string | undefined`) rather than defaulting it to `""`, so TypeScript
   can't see an unset value as if it were a real, defined one (a bug class where e.g.
   `selectedAccount.id` gets passed around as `""` and type-checks fine, when it should have been
   caught as "nothing selected yet").
10. Never fetch data if you can get it from state (exception: something massive, e.g. email
    `text_html`).

### Best practices

1. Know and apply DRY, SOLID, KISS - not project-specific, but worth stating explicitly.
2. Prefer `null` or an optional field (`smth?: string`) over `""` as a placeholder empty value -
   same reasoning as rule 11 above, called out twice because it's a common source of bugs.
3. Match the loading-state granularity to what's actually being disabled: a single `useState` to
   disable one button/input, a widget-level record/map to disable one row/card among many,
   `isLoading` from a shared store to disable the whole UI, and `mountingStep` for a dedicated
   mounting/onboarding screen's sequential steps. Don't reach for a bigger loading state than the
   interaction needs (e.g. don't set global `isLoading` to disable a single button).

### Full verb-prefix naming taxonomy

Only the DB/Redis prefixes (`selectDB*`/`insertDB*`/`updateDB*`/`deleteDB*`/`getRedis*`/`setRedis*`/
`updRedis*`/`delRedis*`) and the `response`/`<fnName>Resp` pairing are ESLint-checked (see
`db-redis-verb-naming` and `response-variable-naming` above) - checked only by scanning a
function's own body text, so it can't see through helper delegation. The rest of this list is a
judgment call: whether a function "pushes to a client-only array" vs "updates DB" requires reading
what it actually does, which isn't something a syntax-only rule can verify reliably.

- `set` - set in state (state or redis)
- `get` - get from state (state or redis)
- `upd` - update state (state or redis)
- `create` - a form to add something (may be a function name)
- `add` - add configured new state to an array, e.g. to `labelsArr` a configured label+hex (state)
- `hgetall` - get records from redis
- `hadd` - add something to a record (in DB and/or state)
- `hdel` - delete something from a record (in DB and/or state)
- `hupd` - update something in a record (in DB and/or state)
- `addEmpty` - an initial state added to an array, e.g. to `VPSConfigs` an initial VPS config with
  no data (in state)
- `push` - push something into an array in state only, for this array specifically, e.g. email
  labels (not DB)
- `remove` - filter something out of an array in state (not DB)
- `increase` - add a number to a number in state (not DB)
- `decrease` - subtract a number from a number in state (not DB)
- `toggle` - toggle a boolean in state (not DB)
- `extract` - extract something from something, e.g. `scheduledTimeISO` from `idName`
- `group` - return a group from something
- `fetch` - external API only (not DB/Redis), e.g. weather
- `refetch` - internal function name used only inside `useSetSomething` (e.g. `refetchMailboxes`);
  everywhere else use `select`/`get`

Note: there's no `addRedis` - if you `.push` something into an array, you need to return the whole
state and put it in one function, so there's one piece of logic that adds something (rather than
splitting "add to array" and "persist to Redis" into two names for the same operation).

Note: `something_with_underscores` is DB-related, but a one-word name (no underscores) is
state-related.

Note: there's no plain `add`/`del` used generically - `add`/`del` alone is ambiguous between
"add/delete one item from an array" and "add/delete the entire array (all state)", so a more
specific prefix from this list is always used instead.

### Input value naming (ESLint-enforced, see `input-value-naming` above)

- `inputValue` - for inputs, e.g. `phoneNumberValue`
- `setInputValue` - for inputs, e.g. `setPhoneNumberValue`

### Loading / error naming

- `isLoading` - global loading that blocks all UI
- `isLocalLoading` - local loading that blocks only this UI
- `localError` - an error used only for this component
- `toast.show("error", "Error doing something", response)` - an error shown in the bottom-right
  toast, usually for the user, with a way to fix it

### Skeleton vs loading state

| state                                 | when                                                 | how                                                                  |
| ------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `isSkeleton` (`useState` in hook)     | initial data load - shimmer for a whole list or card | `const [isSkeleton, setIsSkeleton] = useState(false)`                |
| `isLoading` (state in zustand)        | need to disable all UI                               | `const { isLoading, setIsLoading } = useLoading()`                   |
| `isLocalLoading` (`useState` in hook) | a single action - disable only that button           | `const [isLoading, setIsLoading] = useState(false)`                  |
| `localError` (`useState` in hook)     | an error only for this component/feature             | `const [localError, setLocalError] = useState<string \| null>(null)` |
| `toast` (reusable hook)               | whenever an error needs to be shown to the user      | `toast.show("error", "Failed to do smth", response)`                 |
| `mountingStep`                        | disabling a whole mounting/onboarding screen         | see rule 3 in "Loading state granularity" below                      |

### Loading state granularity

Use the right size of loading state for the right size of UI, don't reach for a bigger one than
the interaction needs:

1. `useState` local to a single button/input - disables just that control.
2. A "widget" loading state (a record/map keyed by id) - disables one row/card among many, not the
   whole list.
3. `isLoading` from a shared store - disables the whole UI (use sparingly, it's global).
4. `mountingStep` - a dedicated state machine for a mounting/onboarding screen with multiple
   sequential steps, distinct from the ongoing-interaction loading states above.

### `const response` vs `const somethingResp` (ESLint-enforced, see `response-variable-naming` above)

- `const response` - the awaited SDK method is an update/insert/delete
- `const somethingResp` - the awaited SDK method is a select/get, e.g. `const selectDBLabelsResp = await selectDBLabels(...)`
- A write's result may also be named `anyDomainWordResp` instead of `response` if that reads
  better - not required to match the method name (e.g. `const ticketsResp = await updateDBTickets(...)`
  is fine, same as `const updateDBTicketsResp = ...` or `const response = ...`). Only a vague
  placeholder name is wrong, whether bare (`result`, `data`) or with the `Resp` suffix
  (`dataResp`, `resultResp`) - the `Resp` suffix alone doesn't excuse a non-descriptive word.

### `handleXxx` naming (ESLint-enforced for the reserved names, see `handle-prefix-location` above)

- `handleSelect` - get/hgetall/select something and set it into state (used in `useSetSomething`,
  `useSomethingHandlers`, and `useAutoUpdateSomething`)
- `handleInsert` - set/hset/insert something and set it into state (used in `useSomethingHandlers`,
  and in `useAutoUpdateSomething` if it doesn't already exist)
- `handleUpdate` - set/hset/update something and set it into state (used in `useSomethingHandlers`
  and `useAutoUpdateSomething`)
- `handleDelete` - del/hdel/update something and set it into state (used in `useSomethingHandlers`
  and `useAutoUpdateSomething`)

### Hook naming (partially ESLint-enforced, see `hook-naming-convention` above)

- `useSomething` - a zustand store without `persist`, OR a plain hook (`useAdvancedBlast`,
  `useIterationMode`, `useDebounce`, etc.)
- `useSomethingStore` - a zustand store WITH `persist`
- `useSetSomething` - a hook that sets a value into state; might return `isSkeleton`
- `useSomethingHandlers` - handlers that update zustand and DB/Redis; returns only functions
  (handlers), except `isLocalLoading`/`localError`
- `useAutoUpdateSomething` - `useEffect`s that optimistically update state after 2-3 seconds of
  inactivity; used together with `StatusIndicator`

### SDK / hook / naming code patterns

- SDK method naming: name a read method `select` (or `<fnName>Resp`-style local variable), not
  `fetch`; name a mutation-returning callback for the backend verb (`handleUpdateDB`,
  `handleInsertDB`), not `saveFn`/`save` (`no-vague-names` and `sdk-method-naming` catch the most
  literal violations of this, but the general judgment call - e.g. `resp` vs `response` vs
  `<fnName>Resp` - is not mechanically checked).
- No throwaway const alias: don't rebind a value under a new name if it's only read once and
  already has a usable name (`no-throwaway-alias` catches the simplest case: bare identifier
  rebound and read exactly once).
- No 1-letter or vague names anywhere, not just SDK results (`no-vague-names` covers common cases;
  applies more broadly by convention, e.g. array `.find()`/`.map()` callback params should be named
  for the domain object, not `s`/`item`).
- Vague generic names (`result`/`results`) are banned everywhere a value is named, not just on
  awaited SDK responses - this includes zustand store fields (`spamCheckResults`, not `results`).
- Hook-call order inside a hook: call toast/error-reporting hooks first, before data/env hooks,
  matching the same first-to-last ordering used for imports.
- api.d.ts response types: prefer `{ success: true } | { error: string }` over
  `Record<string, never> | { error: string }`. If an API route returns bare `{ success: true }`,
  the corresponding SDK method should return `void` on success, not the response object.

### Components / hooks architecture

- Components should do rendering only. A component should have **zero** `useEffect` - all side
  effects live in a `useSetXxx` hook. Exception: if the component is under ~100 lines, no need to
  extract a hook for it.
- **Hook names must match the component name**, not a generic/legacy name that drifted apart from
  it. `CheckSpamEmailsSection.tsx` pairs with `useSetCheckSpamEmails`/
  `useAutoUpdateCheckSpamEmails`/`useCheckSpamEmailsHandlers` - not a stale name left over from
  before the component was renamed. If a component gets renamed, rename its hook files in the same
  pass.
- Zustand store actions (read via `useStore.getState()` or destructured from `useStore()`) are
  stable references - never add them to a `useCallback`/`useMemo`/`useEffect` deps array; only add
  values that can actually change (props, local state, primitives derived from the store).
- Never add a locally-defined function to a deps array even if currently memoized/stable - hold it
  in a ref instead (`const fnRef = useRef(fn); fnRef.current = fn`, call via `fnRef.current(...)`,
  omit it from the deps array). This **is** ESLint-enforced (`local-rules/no-function-in-deps`) for
  the common cases, but the ref-pattern fix itself is a manual step.
- Every `.map()` over a data array must have exactly 3 states, in this order:
  1. **Loading** - skeleton or `<p>Loading...</p>` while fetching (`isSkeleton`/`isLoading`).
  2. **Empty state** - when the array is empty, show a meaningful empty state, preferably with an
     `<Image>` illustration/icon. Never silently render nothing.
  3. **List** - the actual `.map()`.
- When each row is its own component (not inline JSX), wrap it in `memo()` and pass a shared
  `useCallback`-wrapped handler from the parent - `memo()` alone does nothing if a new inline
  callback is created every parent render, since a new function identity on every render still
  breaks the props comparison `memo()` relies on. The reason to do this at all: without it, editing
  the state behind one row (e.g. deleting one item) re-renders every row in the list, not just the
  one that changed. Once a row is `memo()`'d this way, don't also wrap the `.map()` itself in
  `useMemo` - `memo()` already stops each row from re-rendering when its own props haven't changed,
  so memoizing the array of `<Row />` element descriptors on top of that skips no real work, it just
  adds a second dependency array to keep in sync for no benefit. Only reach for `useMemo` around the
  `.map()` itself when the rows are inline JSX with no `memo()` boundary of their own.

```
Component
  └── useSetXxx()
        ├── refetch          ← internal async, called in useEffect, returned as refetch
        ├── isSkeleton       ← should show skeleton
  └── useSomethingHandlers()
        ├── handleScrape        ← validate inputs → send payload to VPS → insert new task in state
        ├── handleComplete      ← Pusher event → mark the matching task completed in state
        ├── handleUpdateJob     ← Pusher event → cloneDeep jobs, upsert one job by id (replace or append)
        └── handleUpdateTask    ← Pusher event → patch one task's status by id in state
```

Full worked example - loading/empty/list states, `useSetXxx`/`useXxxHandlers` split, and the
`memo()` + `useCallback` row pattern together:

```tsx
"use client"

import { memo, useCallback, useRef, useState } from "react"
import { twMerge } from "tailwind-merge"
import { FiClock } from "react-icons/fi"

import { useSetSomething } from "./hooks/useSetSomething"
import { useSomethingHandlers } from "./hooks/useSomethingHandlers"

interface ItemRowProps {
  item: Item
  onDelete: (id: string) => Promise<string | void>
}

// row is its own memo()'d component - a stable onDelete (via useCallback below) lets it skip
// re-rendering when the parent re-renders for unrelated reasons
const ItemRow = memo(function ItemRow({ item, onDelete }: ItemRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = useCallback(async () => {
    setIsDeleting(true)
    await onDelete(item.id)
    setIsDeleting(false)
  }, [item.id, onDelete])

  return (
    <li className="flex items-center gap-2">
      <span>{item.title}</span>
      <button disabled={isDeleting} onClick={handleDeleteClick}>
        delete
      </button>
    </li>
  )
})

interface SomethingProps {
  className?: string
  title: string
}

// UI used: @dev_readme-ui-feature (md file that used for this component UI)
export function Something({ className, title }: SomethingProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { isSkeleton, refetch, items } = useSetSomething()
  const { handleRename, handleDelete } = useSomethingHandlers()

  if (isSkeleton) return <p className="...">Loading...</p> // note className is first argument
  if (!items.length) return <EmptyState image={...} label="No items yet" />

  return (
    <div className={twMerge("relative space-y-2", className)} ref={containerRef}>
      <button className="flex items-center gap-2" onClick={handleRename}>
        <FiClock size={14} />
        <span>{title}</span>
      </button>
      <ul>
        {items.map(item => (
          <ItemRow key={item.id} item={item} onDelete={handleDelete} />
        ))}
      </ul>
    </div>
  )
}
```

### SDK / API route / api.d.ts architecture

Always prefer this pattern for a new entity's data layer:

1. Create or reuse an SDK class for the entity.
2. Put native `fetch` calls inside SDK methods only.
3. SDK methods should call API routes.
4. Request bodies should use `satisfies API.XRequest`.
5. API request/response types should live in `app/ts/namespaces/api/<entity>/api.d.ts`.
6. API routes should live in folders like `app/api/<entity>/<action>/route.ts` with helper files
   next to them (e.g. `selectDBProducts.ts`, `insertDBProduct.ts`).

Helper naming: `selectDBProducts`, `insertDBProduct`, `updateDBProduct`, `deleteDBProduct`.

```
app/ts/namespaces/api
├── products
│   └── api.d.ts
├── support
│   └── api.d.ts
├── emails
│   └── api.d.ts
└── utm
    └── api.d.ts
```

```ts
export class ProductsSDK {
  async selectDBProducts(start: number, end: number) {
    const response = await fetch(`/api/products/select?start=${start}&end=${end}`, {
      method: "GET",
      cache: "no-store",
    })

    const responseJson: API.ProductsSelectResponse = await response.json()
    if ("error" in responseJson) return responseJson.error
    else return responseJson
  }

  async addProduct(request: API.ProductsAddRequest) {
    const response = await fetch("/api/products/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request satisfies API.ProductsAddRequest),
      cache: "no-store",
    })

    const responseJson: API.ProductsAddResponse = await response.json()
    if ("error" in responseJson) return responseJson.error
    else return responseJson
  }
}
```

```ts
import { NextResponse } from "next/server"
import { selectDBProducts } from "./selectDBProducts"

export async function POST(req: Request) {
  const body = (await req.json()) as API.ProductsSelectRequest

  if (!body.ownerId || typeof body.ownerId !== "string") {
    return NextResponse.json({ error: `ownerId missing: ${body.ownerId}` } satisfies API.ProductsSelectResponse, {
      status: 400,
    })
  }

  const response = await selectDBProducts(body)
  if (typeof response === "string") {
    return NextResponse.json({ error: response } satisfies API.ProductsSelectResponse, { status: 500 })
  }

  return NextResponse.json(response satisfies API.ProductsSelectResponse, { status: 200 })
}
```

```ts
// ── api/ai-decisions/manage-emails/reply/select-decisions  ──────────────────────────────────────
type SelectReplySettingsRequest = { encryptedEnvsClient: string[] }
type SelectReplySettingsResponse = { settings: import("@/ts/TAIEmailDecisions").TAIReplyDecisionsSettingDB[] } | { error: string }

// ── api/ai-decisions/manage-emails/reply/regenerate  ─────────────────────────────────────────────
type RegenerateReplyDecisionRequest = {
  encryptedEnvsClient: string[]
  domain: string
  emailId: string
  settingId: string
  prompt: string
  metrics: Pick<TMetric, "id" | "name">[]
  followUpPresets: Pick<import("@/ts/TFollowUp").TFollowUpPreset, "id" | "title">[]
  aiModel?: string
}
type RegenerateReplyDecisionResponse = { suggestion: import("@/ts/TAIEmailDecisions").TReplySuggestion } | { error: string }
```
