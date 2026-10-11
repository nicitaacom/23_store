# Application file storage

## 0. Why this exists

Supabase continues to store tables, users and realtime data. Application files can use Supabase
Storage or Cloudflare R2 without changing the existing URL columns or the six file categories.
The decision history is [plan-01](plans/plan-01-supabase-and-cloudflare-r2-migration.md).

## 1. Where the data lives

```text
Browser: StorageSDK → prepare API → direct signed PUT → complete API
Next.js: verified identity → authorized folder → capacity reservation → publication check
Redis: storage:23:upload:*, lock:*, capacity:*, journal, references, cleanup:*, usage
Supabase: current application tables/auth + six original buckets + private 23_upload-staging
R2: public application bucket
      23_product-images/<existing-path>
      23_ai-product-images/<existing-path>
      23_avatar-images/<existing-path>
      23_support-images/<existing-path>
      23_support-guest-images/<existing-path>
      23_product-personalization-images/<existing-path>
    separate private upload-staging bucket
    optional separate private application bucket if source inspection finds private categories
```

Contracts live in `app/ts/storage.ts` and `app/ts/namespaces/api/storage/api.d.ts`.
The browser SDK is `app/sdk/StorageSDK/StorageSDK.ts`; provider implementations and server helpers
live in `app/libs/storage/`. Ordinary images use the provider directly (`images.unoptimized`).
Overwrite URLs have a version query and publication metadata requests revalidation.

## 2. Configuration and limits

The public policy is exported from `app/config/r2Config.ts`:

```ts
export const r2Config = {
  totalForAllUsersGB: 10,
  totalGBUsedWarnPercentage: 80,
  perUserGB: 1,
  gbPerMonthPrice: 0.3,
} as const
```

The active shared limit is 10,000,000,000 bytes, including ADMIN, guests, restore and migration.
The dashboard warns at 80% (8 GB). The per-user allowance and paid subscriptions remain explicit
TODOs in the plan; configuring their values does not enable billing. ADMIN is exempt from those
future per-user limits and fees. Individual file validation and ownership checks still apply.

Capacity is checked against a current provider inventory and persistent Redis reservations under
a renewable shared lease. R2 counts all objects in the configured public, staging and private
buckets, including unfamiliar prefixes. Supabase counts the six application buckets and staging.
Unknown sizes or unavailable inventory block new authorizations. Migration copies use the same
capacity helper. Each provider retains its own physical inventory during the rollback period;
the Supabase recovery copy is not included in R2's physical limit.

Reservations include temporary files and publication peaks. R2 presigned requests bind content
length, MIME type and `If-None-Match`. Supabase upload tokens do not bind individual length, so
its private staging bucket enforces 50 MiB and each authorization reserves that maximum plus
the final file size. This is intentionally conservative. Browser Supabase imports above 50 MiB
per file use the local migration command instead. Successful staging files remain immutable
until their token has expired; deleting them immediately would allow token reuse. Abandoned
reservations remain for 26 hours and are released only after staging has been removed.

Product images retain their existing 1 MiB limit. Other regular raster uploads are limited to
50 MiB. ADMIN R2 browser restore permits individual files up to 5 GiB, subject to total capacity.
The browser backup working data is limited to 512 MiB. Larger backup operations use the local
streaming tools. Upload authorization allows 120 requests/minute for authenticated actors and
8/minute for guests, checked against both the verified actor and IP.

## 3. Required environment and SQL

Keep `STORAGE_PROVIDER=supabase` until the verified cutover. No R2 credentials are required for
that default. Before deploying the new routes, apply `scripts/storage/setup.sql`: it creates
private staging, restricts direct anonymous/authenticated Storage writes and staging reads,
and installs service-only usage, exact comparison and guest-reference functions. Existing
permissive policies and source SQL stay documented. The service role performs authorized copies.

| Variable | Purpose |
| --- | --- |
| `STORAGE_PROVIDER` | `supabase` initially; `r2` only after verified relinking |
| `STORAGE_MIGRATION_PAUSED` | Blocks ordinary file preparation/deletion during synchronization |
| `STORAGE_CLEANUP_ENABLED` | Explicit opt-in after setup; default false |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Production custom domain for public R2 files |
| `R2_ACCOUNT_ID` | Account ID, 32 hexadecimal characters |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Server-only S3 credentials scoped to application buckets |
| `R2_BUCKET`, `R2_STAGING_BUCKET` | Distinct public application and private staging bucket names |
| `STORAGE_PRIVATE_LOGICAL_BUCKETS`, `R2_PRIVATE_BUCKET` | Private source categories and separate destination |
| `STORAGE_LEGACY_SUPABASE_ORIGINS` | Explicit comma-separated old origins allowed during backup relink |
| `CLOUDFLARE_R2_ANALYTICS_TOKEN` | Separate Account Analytics Read token |
| `R2_ACCOUNT_STANDARD_ONLY` | Set true only after confirming every account bucket uses Standard |
| `SUPABASE_DATABASE_ALLOWANCE_BYTES`, `SUPABASE_STORAGE_ALLOWANCE_BYTES` | Optional verified plan allowances; unset stays unknown |

Add credentials to `.env.local` and deployment secrets, never to the exported policy file or chat.
Environment probes treat R2 variables as conditional; omitted R2 analytics and unknown Supabase
allowances do not fabricate zero measurements. Follow the [migration runbook](dev_readme-storage-migration.md).

## 4. Authorization, cleanup and remaining work

Folders come from verified Supabase identity or the encrypted/signed visitor cookie. Product
ownership is checked with the request client; Stripe draft metadata binds pre-insert product IDs
to their creator. Buyers own their personalization folder. Invalid images stay unpublished;
completion checks actual length, MIME and a bounded 4 KiB signature sample. File payloads are
uploaded, copied and delivered by the provider, outside Next.js.

Apply `scripts/storage/schedule.sql` after deployment. It reuses the existing Vault
`keys_webhook_base_url` and `keys_webhook_secret` settings. Guest cleanup starts Sunday 03:05 UTC,
checks the one-hour grace period and current message references, and deletes through the active
provider API. Staging starts daily 03:15 UTC with a 24-hour grace period. At minutes 7, 17, 27, 37, 47 and 57 the
scheduler resumes existing progress; it does not restart guest cleanup. Unknown timestamps and
failed reference queries preserve files. Migration pause stops cleanup. Inactive provider source
files are retained; production source purge is a separate explicit CLI operation after 14 days.

Public-return UI contracts reject private categories until their authorized-download UI is
provided; migration preflight checks the real source classification and stops on an unconfigured
private category. Do not make a private source public to continue. Account setup, actual source
inspection, representative live R2 rehearsal and production cutover remain deployment gates.
The Supabase usage function reports whole shared-database size; file usage covers this application.
