# Cloudflare Deployment Setup

## 0. Why this exists

We want this Next.js app deployable to Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`), reusing the same pattern already proven on the sibling project `19_spotify-clone`. A full setup + deploy attempt was done and then **deliberately reverted** — see §4. This doc exists so the next attempt doesn't have to rediscover the same blockers.

There is already a pre-existing Worker in the account named **`23-store`** (Workers & Pages dashboard), with a deploy history predating this OpenNext work — not something we get to name freely. `package.json`'s `"name"` is `"joki"`, unrelated.

## 1. What the setup involves

Files that need to exist/change (none of them exist right now — all reverted, see §4):

| File | Change | Why |
|---|---|---|
| `wrangler.jsonc` (new) | `"name": "23-store"`, `WORKER_SELF_REFERENCE` service also `"23-store"`, `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`, `assets.directory: ".open-next/assets"`, `images.binding: "IMAGES"` | Worker identity must match the dashboard, wrong name → `Service binding 'WORKER_SELF_REFERENCE' references Worker 'workspace' which was not found. [code: 10143]` |
| `open-next.config.ts` (new) | Default `defineCloudflareConfig({})` from `@opennextjs/cloudflare` | Required entrypoint for the adapter |
| `pnpm-workspace.yaml` | Add `workerd: true` to `allowBuilds` (this project already has `esbuild: true`) | Missing it → `ERR_PNPM_IGNORED_BUILDS` |
| `package.json` | Pin `"wrangler": "4.107.1"` and `"@opennextjs/cloudflare": "1.20.1"` as devDependencies; add scripts `preview`/`deploy`/`upload` (`opennextjs-cloudflare build && opennextjs-cloudflare {preview,deploy,upload}`) and `cf-typegen` | Unpinned → Cloudflare's build adds `wrangler` mid-build and skips the pnpm allowlist above |
| `.gitignore` | Add `.open-next`, `.wrangler`, `.dev.vars*` (with `!.dev.vars.example`) | Build/deploy artifacts, not source |
| `eslint.config.mjs` | Add an `ignores: [".open-next/**", ".wrangler/**"]` block | `pnpm build` runs `eslint .` first; without this it lints OpenNext's generated `.mjs` output and fails with `Definition for rule '@typescript-eslint/no-explicit-any' was not found` |
| `middleware.ts` **not** `proxy.ts` | Keep/rename to the old `middleware.ts` convention (`export function middleware`, not `export function proxy`) | See §3 — this is the load-bearing gotcha |
| `public/.assetsignore` (new) | List `23_store-preview.mp4` and `sources/` | See §3 — Workers assets cap each file at 25 MiB |

## 2. Terminology

- **Worker script size limit** — the bundled server function (all API routes + SSR handler, compiled into one script) is measured **gzipped** against a plan cap: 3 MiB Free, 10 MiB Paid ($5/mo). Different from the asset size limit below.
- **Assets size limit** — each individual static file in `public/` is capped at 25 MiB, uploaded to Workers Static Assets (unrelated to the script-size cap above).
- **`.assetsignore`** — gitignore-syntax file that excludes paths from the Workers static-assets upload without deleting them from the repo. Must live inside `public/` itself — OpenNext copies everything in `public/` (dotfiles included) into `.open-next/assets/` on every build, which is where Wrangler looks for it.
- **Proxy vs Middleware** — Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (`export function proxy`). Old convention still works, just prints a deprecation warning.

## 3. What broke, in order hit

```
1. eslint lints .open-next generated output
   → fix: ignores: [".open-next/**", ".wrangler/**"] in eslint.config.mjs

2. "Node.js middleware is not currently supported. Consider switching to Edge Middleware."
   → root cause: this repo's proxy.ts (renamed from middleware.ts during the Next 16
     bump, commit b01de90) uses Next 16's new Proxy convention, which Next hard-codes
     to Node.js runtime — `export const runtime = "edge"` in a proxy.ts is a hard
     Next.js error ("Proxy always runs on Node.js runtime").
     @opennextjs/cloudflare@1.20.1 (latest published) does not support Node.js
     middleware at all and calls process.exit(1) on detecting it.
   → fix: rename proxy.ts back to middleware.ts, export function proxy → middleware.
     Confirmed safe: the file only uses Edge-compatible Web APIs (fetch, TextEncoder,
     btoa, @upstash/redis REST client) — the Next-16-bump rename was mechanical, not
     because the code needs Node.js.

3. "Asset too large... found /public/23_store-preview.mp4 with a size of 40.1 MiB"
   → root cause: public/docs/public-assets.md already documents this file as unused
     ("Demo video — not embedded in any page"), well over the 25 MiB per-asset cap.
   → fix: public/.assetsignore excluding it and public/sources/ (Photoshop sources,
     also documented as "never served at runtime").

4. Cloudflare's own Git-integration build (Workers Builds) independently failed:
   "🛠️ Configuring project for Next.js with OpenNext by running
   `@opennextjs/cloudflare migrate`" → "ERR_PNPM_ADDING_TO_ROOT" running
   `pnpm add --force @opennextjs/cloudflare@latest`
   → root cause: when Cloudflare's build container doesn't find a committed
     wrangler.jsonc, it auto-runs `@opennextjs/cloudflare migrate`, which tries to
     `pnpm add` without `-w` — pnpm refuses on a workspace-root project
     (pnpm-workspace.yaml present).
   → not fixed / not confirmed: committing wrangler.jsonc + open-next.config.ts +
     pinned deps *should* make Cloudflare skip auto-migrate, but this was never
     verified end-to-end via git push before the attempt was abandoned (§4). Deploying
     locally via `pnpm deploy` (needs `npx wrangler login`) sidesteps this path
     entirely and was the route that got furthest.

5. "Your Worker exceeded the size limit of 3 MiB. Please upgrade to a paid plan to
   deploy Workers up to 10 MiB. [code: 10027]"
   → measured: Total Upload 24584.73 KiB / gzip: 5689.58 KiB (~5.69 MiB).
   → confirmed identical failure against both a fresh Worker (tried as "jokik") and
     the existing "23-store" Worker — this is an account plan limit, not a
     naming/config issue.
   → heaviest server-side deps bundled into the one script: openai, stripe,
     @pinecone-database/pinecone, @aws-sdk/client-lambda, @tiptap/*, recharts. None
     currently code-split/lazy-loaded.
   → this is where the attempt stopped.
```

## 4. TODO — decision made against (do not re-open without new information)

**Decided against: upgrading to Cloudflare Workers Paid ($5/mo) to unblock the 3 MiB → 10 MiB script size cap.** All config changes from §1 were applied, verified working end-to-end up through the final upload step, then **manually reverted** — no half-deployed Cloudflare setup is left in the repo on purpose.

If this gets revisited, two independent paths, either works:
- **(a)** Upgrade to Workers Paid at `https://dash.cloudflare.com/f682f2ba31196e5cace4be0a5c258765/workers/plans`, then redo §1 and run `pnpm deploy`.
- **(b)** Shrink the bundle under 3 MiB gzipped first (route-level dynamic imports for the heavy SDKs listed in §3.5, or split some API routes into separate Workers) — untried, no reproduction steps yet since (a) was the shorter path and got parked instead.

Not investigated: whether Cloudflare Pages (rather than Workers) has a different/looser size limit for this same OpenNext output — worth checking before repeating (a) or (b) if revisited.
