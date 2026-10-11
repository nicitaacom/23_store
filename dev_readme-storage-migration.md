# Supabase files → Cloudflare R2, with rollback

## 0. What this changes

Move files and registered URL references only. Keep the live Supabase database, auth users and
realtime behavior. Keep both downloaded backups and all Supabase SQL/setup documentation.
The Tables export is a recovery artifact; do not import it over the live database for this move.

## Before importing your existing Files backup

The application supports **DB Backup → Files (R2) → Import**, including automatic R2 URL relinking.
The user completed the original copy on October 11; that older build intentionally kept Supabase
URLs unchanged. On the latest build, re-import the Files archive with **Skip files already in R2**
checked. Existing objects are skipped while database and Auth image URLs are relinked to R2.

1. Application environment variables belong in the **Vercel dashboard → your 23_store project →
   Settings → Environment Variables**, with **Production** selected as the deployment environment.
   They are not configured on Cloudflare's R2 bucket Settings page. Use the existing six entries:
   `R2_BUCKET`, `NEXT_PUBLIC_R2_PUBLIC_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY` and `CLOUDFLARE_R2_ANALYTICS_TOKEN`. If they are already set there,
   no more variables are needed for the first import. Reuse the already-created analytics token.
   For dashboard entries, enter actual values without quotes. Analytics credentials enable usage
   cards; upload credentials and the existing Supabase/Upstash configuration authorize imports
   and reserve capacity.
   [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
2. The user's October 11 screenshot confirms **23-store-public → Settings → Custom Domains →
   files.jokik.fi** is **Active**, access is **Enabled**, and minimum TLS is **1.3**. Save or check
   the CORS policy in §1 using **Settings → CORS Policy**. A previous HTTPS check also verified
   TLS 1.3 connects and TLS 1.2 is rejected. Check an actual imported object's URL after copying.
3. The user applied the whole [`scripts/storage/setup.sql`](scripts/storage/setup.sql) file in the
   existing Supabase project's SQL Editor on October 11 and reported **Success. No rows returned**.
   This installs storage helpers and policies; application tables and Auth users stay in place.
   For another Supabase project, apply this SQL before its first import. No repeat is needed for
   the project where the user has already run it.

   **Do not add four extra environment entries.** The code uses these defaults
   when the entries are absent:

   | Optional setting | Default | Behavior |
   | --- | --- | --- |
   | `STORAGE_PROVIDER` | `r2` | Live uploads use R2; Files import relinks existing URLs to R2 |
   | `STORAGE_MIGRATION_PAUSED` | `false` | File changes remain available |
   | `STORAGE_CLEANUP_ENABLED` | `false` | Destructive cleanup stays disabled |
   | `R2_ACCOUNT_STANDARD_ONLY` | `false` | Account-wide included-allowance estimates remain unconfirmed; the application 10 GB cap still applies |

   `development` is the main branch and deployment source. In **Vercel → your project →
   Deployments**, use the latest `development` deployment and redeploy after any environment
   changes. Keep the existing deployment branch configuration. Vercel's **Production** label
   selects the live deployment's environment variables; it does not require a Git branch named
   `production`. If `STORAGE_PROVIDER` is already set to `supabase` in the Production environment,
   change that existing entry to `r2` before redeploying. An absent entry already defaults to R2.

4. No R2 folder creation is required. The six category names are key prefixes inside
   `23-store-public`; uploading `23_avatar-images/<path>` makes that category visible automatically.
   Empty categories remain absent from the Objects view. The supplied backup creates product and
   avatar prefixes; the other four appear when their first files are uploaded.
   [R2 prefixes and folders](https://developers.cloudflare.com/r2/objects/#prefixes-and-folders)

   After the new production deployment is **Ready**, sign in as **ADMIN**, open **DB Backup → Files**,
   leave **Skip files already in R2** checked, click **Import** and select
   `/home/kali/Downloads/23_backup-files-2026-10-09-extractable.tar.gz`. Keep the Tables archive
   for recovery. For the previously inspected Files export, expect **1,154 product images and
   3 avatars**, uploaded or skipped, with **zero failed uploads**. Import now relinks existing
   database and Auth image URLs to R2 even if all 1,157 files are already present.
5. Check the imported category prefixes in **R2 → 23-store-public → Objects**, open an actual
   imported image at `https://files.jokik.fi/<category>/<path>`, and confirm the import result
   reports completed R2 relinking with zero unresolved references. Check `23_products.img_url`
   and `23_users.avatar_url` in **Supabase → Table Editor**: application file URLs should begin
   with `https://files.jokik.fi/`. Missing archive objects leave their old URLs unchanged and are
   reported for recovery. The advanced §4 synchronization procedure remains available when the
   source changed after export; the UI skip strategy preserves existing destination contents.

Files uploads run eight at a time. Preparation authorizes up to 16 files with one inventory
measurement; completion verifies at most four files per Vercel request. The full browser operation
may exceed 60 seconds, while metadata routes retain the 60-second deadline. Slow provider/Redis
requests may still time out. Relinking uses one inventory page or at most 20 database/Auth rows
per request, with an ADMIN-owned continuation and idempotent completed-step retries. Progress
shows actual transfer speed, elapsed time and an estimate based on progress over elapsed time,
extended if the current transfer-speed estimate is longer. Zero speed shows `00:00:00`.

New uploads create `temp-uploads/` automatically. This is a temporary internal prefix, separate from
the six `TBuckets` application categories. Files are checked against their authorized size/type and
published into their final category. Temporary copies count toward 10 GB and are excluded from
Files export. Old `uploads/` sessions and cleanup inventories remain supported during the rename.
Temporary cleanup uses a 24-hour grace period and remains disabled until explicitly configured;
changing the prefix does not remove files from an ongoing import.

To cancel an older running import, close its browser tab and accept the page-leave confirmation.
Already published files remain in their category prefixes. Wait up to seven minutes for the last
pending upload locks to expire, then import the same archive through the latest Ready development
deployment. The new import starts from the beginning and overwrites the same destination keys;
no folders need deleting. Do not treat partial files as a completed migration.

The supplied Files archive contains about 100 MB of payload and fits the browser's 512 MiB limit.
The shared 10 GB limit applies to this ADMIN import. The 1 GB per-user allowance and paid upgrades
remain the plan's future TODOs; they are separate from the import and shared capacity enforcement.

To download a new R2 backup from the same production build, choose **DB Backup → Files (R2) →
Export**. All six categories are checked, including those that have no files yet. The browser
downloads from `files.jokik.fi` and builds `23_backup-files-YYYY-MM-DD.tar.gz` locally; Vercel
handles bounded metadata requests rather than file bytes or compression. The archive restores
to either Supabase or R2. Backups above 512 MiB use the local streaming export documented in
[the backup guide](dev_readme-backup.md#interchangeable-storage-and-large-portable-backups).

## 1. Cloudflare: where to click

1. **R2 Object Storage → Create bucket**: name `23-store-public`, select **Automatic** and
   **Standard**, then **Create bucket**. The six existing categories become key prefixes inside it.
   This is the only R2 bucket required; avatars are public, and temporary uploads share it.
   [Bucket setup](https://developers.cloudflare.com/r2/buckets/create-buckets/)
2. Open **23-store-public → Settings → Custom Domains → Add**. Enter a file subdomain on a domain
   managed in this Cloudflare account, for example `files.jokik.fi` if that zone is available.
   Click **Continue → Connect Domain** and wait for Active. Put its HTTPS origin in
   `NEXT_PUBLIC_R2_PUBLIC_URL`. Keep `r2.dev` disabled for production.
   [Custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/)
   Set the **R2 custom domain's minimum TLS version to 1.3**, following the user's October 11
   choice. If its form exposes **Minimum TLS version**, select **1.3**. Cloudflare also documents
   updating the R2 domain through its API with `{"minTLS":"1.3"}`. The general website minimum-TLS
   setting does not apply to R2 custom domains. TLS 1.3 as a minimum rejects older TLS 1.2-only
   clients; updated major browsers support TLS 1.3. A successful TLS 1.3 handshake proves support,
   while a rejected TLS 1.2 handshake verifies the requested minimum. This is a Cloudflare
   setting and needs no application TLS environment variable.
   [R2 domain TLS API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/custom/methods/update/),
   [R2 exception to website TLS settings](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/minimum-tls/),
   [TLS 1.3 browser support](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/tls-13/)
3. **Upload credentials — R2 Object Storage → Overview → Manage API Tokens**:
   return to the R2 bucket list; the bucket's Settings page has no token controls. In the
   **Account Details** section, click **Manage API Tokens**, as shown in the user's dashboard.
   In the R2-specific token creator, use
   **Create Account API token** if available, or **Create User API token**. Select
   **Object Read & Write** and scope it only to `23-store-public`.
   Copy **Access Key ID**, **Secret Access Key** and the account ID
   into `.env.local` (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`). Also set
   `R2_BUCKET=23-store-public`. Save the secret when it is displayed.
   This token does not need bucket-management privileges.
   [R2 credentials](https://developers.cloudflare.com/r2/api/tokens/)
4. **Storage analytics — top-right profile icon → My Profile → API Tokens → Create Token**:
   on the user's October 11 screenshot (`/profile/api-tokens`), click the blue **Get started**
   beside **Create Custom Token**, above the templates. Name it `23-store-r2-analytics`, grant
   **Account → Account Analytics → Read**, and scope account resources to this account.
   If the middle permissions dropdown currently shows **Workers R2 Storage**, change it to
   **Account Analytics**; select **Read** in the final dropdown. Change **All accounts** to the
   specific account that contains `23-store-public`.
   Click **Continue to summary → Create Token**, then store the token value as
   `CLOUDFLARE_R2_ANALYTICS_TOKEN`. The account API Tokens page also supports this permission.
   The profile page is separate from R2's token creator: the analytics token belongs in this
   single analytics field; R2 uploads need the separate Access Key ID and Secret Access Key.
   [Analytics token](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/)
5. Open **23-store-public → Settings → CORS Policy → Add CORS policy → JSON → Save**. The production
   origins below are examples for this shop; use the actual deployed origins and explicit local
   ports. Do not use wildcard origins. [CORS setup](https://developers.cloudflare.com/r2/buckets/cors/)

Use one CORS policy for public downloads and signed browser uploads:

```json
[{"AllowedOrigins":["https://www.jokik.fi","https://jokik.fi","http://localhost:3023","http://127.0.0.1:3023"],"AllowedMethods":["GET","HEAD","PUT"],"AllowedHeaders":["Range","Content-Type","If-None-Match"],"ExposeHeaders":["ETag","Content-Length"],"MaxAgeSeconds":300}]
```

The bucket is public for reads, including incoming `temp-uploads/` objects. Writes still need a
server-issued signed request with an authorized key, type and byte count; CORS is not write
authorization. Completion verifies actual files before updating their final application paths.
Temporary copies and reserved capacity count toward the same 10 GB cap, including ADMIN.

The six existing R2 entries below are sufficient for the first copy, alongside the application's
existing Supabase/Upstash configuration. The user has already added these entries and manages
their actual values. On the live application they belong in Vercel's project environment settings;
local rehearsals use `.env.local`. The R2 **Secret Access Key** is the S3 credential shown beside
Access Key ID; the analytics field takes the separate analytics **token value**. Both credentials
stay on the server. These variables are already declared in `env.d.ts` and `.env.example`.

```dotenv
R2_BUCKET='23-store-public'
NEXT_PUBLIC_R2_PUBLIC_URL='https://files.jokik.fi'

R2_ACCOUNT_ID=''
R2_ACCESS_KEY_ID=''
R2_SECRET_ACCESS_KEY=''
CLOUDFLARE_R2_ANALYTICS_TOKEN=''
```

Leaving `R2_ACCOUNT_STANDARD_ONLY` unset keeps the account-wide included-storage estimate unconfirmed
until all account buckets' storage classes have been checked. The application's 10 GB limit
continues to use actual application inventory and reservations.

Apply `scripts/storage/setup.sql` in the Supabase SQL editor before the new application routes
are deployed. Schedule cleanup only after the deployment is reachable and Vault contains the
same CRON_SECRET and production origin as the application. Preserve the historical cleanup SQL;
`scripts/storage/schedule.sql` replaces its job rather than running two deletion mechanisms.

## 2. Inspect the downloaded Files export

DbBackupModal has separate **Tables** and **Files** exports. The migration input is normally
`23_backup-files-<date>.tar.gz`. Keep the table export separately. Replace the example path with
the real downloaded filename; quote paths containing spaces.

For the user-selected production browser flow, complete the setup and redeployment described
above. For a local rehearsal, configure the public bucket, custom domain, CORS and `.env.local`,
apply the Supabase setup SQL, then restart the app. Open **DB Backup → Files (R2) → Import** and
choose the Files `.tar.gz`. The Files tab always imports into and exports from R2; Tables uses
Supabase. Files import relinks database references to R2 after upload verification or skipped
existing objects. The default skip checkbox preserves existing destination files; unchecking it
overwrites those paths. The active provider defaults to R2. The Tables backup is not imported.
Before final sync, use the archive command below with `--apply` against the selected R2 bucket
to establish its verified starting report. Files already matching the exported SHA-256 and MIME
are verified without being uploaded again. Existing different files are preserved as conflicts.

The supplied October 9 Files export was inspected locally on October 11: **1,157 files**, comprising
1,154 product images and 3 avatars, with **100,010,140 payload bytes**. Its largest file is 492,323
bytes. It fits the browser's 512 MiB working-data limit. No file was uploaded or relinked by this
inspection; the source may have changed since export.

```bash
pnpm storage:migrate --archive '/absolute/path/23_backup-files-date.tar.gz' --manifest '/absolute/path/r2-archive.json'
```

Dry-run is the default: it reads gzip/tar in a stream, validates every entry and mapping, hashes
the file bytes and writes a local report. It does not upload or relink. Both original
`storage/<bucket>/<path>` and mapped `storage-files/*` layouts are accepted, including MIME metadata,
Unicode and long names. Traversal, links, duplicate destinations and unsupported categories fail
before copies. No full archive is loaded into RAM. A 40 GB export can be inspected, but the
current 10 GB application policy prevents applying it without changing the policy deliberately.

Each report records original references, destination keys, bytes, MIME, SHA-256 and verification
state. Reports and reference journals contain customer paths; keep them private and outside git.

## 3. Rehearse, then copy

Use one separate rehearsal public bucket with the same CORS rules. Point only local `.env.local`
at it. Test representative files from all six categories and verify a complete upload/list/delete
and rollback cycle before pointing at the production bucket.
Preflight inspects actual Supabase bucket classification; missing/private categories must be
resolved explicitly, never made public automatically. Record the source usage and the warning's
actual storage/egress metric in the provider dashboard.

```bash
pnpm storage:migrate --archive '/absolute/path/23_backup-files-date.tar.gz' --manifest '/absolute/path/r2-archive.json' --apply --concurrency 3
```

Re-run the same command/report to resume. Each destination is verified by streamed SHA-256
read-back; multipart ETags are not treated as checksums. Independent destination edits are
preserved as conflicts. Bucket/account changes invalidate resume. Capacity is checked before
each copy, including retained temporary files and reserved uploads. No copy bypasses ADMIN's
shared 10 GB limit. Backup copies alone are insufficient because the source may have changed.

## 4. Final synchronization and cutover

1. Deploy `STORAGE_MIGRATION_PAUSED=true` while writes still use Supabase. Set the same value
   locally. Let already issued uploads complete or expire. Cleanup pauses; incoming R2 objects
   remain public under `temp-uploads/` in the same bucket.
2. Synchronize current source inventory with the saved archive report as the starting report:

```bash
pnpm storage:migrate --operation sync --manifest '/absolute/path/r2-archive.json'
pnpm storage:migrate --operation sync --manifest '/absolute/path/r2-archive.json' --apply
```

The first sync accepts the verified archive report and records current source inventory. New
and changed files are copied; missing source files are reported. Review those differences. If
they represent real source deletions, repeat with `--mirror-deletions` to remove only unchanged,
previously verified destination copies. Source files are retained. Re-run until the report has
`verifiedInventoryAt`, no unresolved differences and every object verified. Keep an immutable
copy of this final report as `cutover.json` before later runs.

3. Plan and apply only verified URL changes. Nested variants/personalization and Auth avatar
   metadata are included. Unknown external origins stay untouched. Unverified source references
   stop relinking; concurrent row edits are reported and preserved by exact comparisons.

```bash
pnpm storage:migrate --operation relink --manifest '/absolute/path/cutover.json' --journal '/absolute/path/cutover.references.jsonl'
pnpm storage:migrate --operation relink --manifest '/absolute/path/cutover.json' --journal '/absolute/path/cutover.references.jsonl' --apply
```

4. Set deployment/local `STORAGE_PROVIDER=r2`; rebuild so the public domain is available to the
   browser. Check the six image flows, ADMIN usage and backup import/export. In browser Network,
   image GETs must go to the custom domain and upload PUTs to signed `temp-uploads/` keys in the same
   public R2 bucket. Prepare/complete requests carry metadata only.
   Then set `STORAGE_MIGRATION_PAUSED=false` and enable
   configured cleanup. Confirm warnings at 8 GB and blocked uploads at 10 GB, including ADMIN.
5. Monitor failures, actual provider usage and Supabase file egress. Included provider allowances
   and the application's limit are separate. Existing monthly egress is not erased by cutover.

## 5. Roll back using current R2 files

Pause file changes in the deployment and locally. Use the preserved final cutover report as
the deletion/overwrite baseline. Copy current R2-created/modified files to Supabase and mirror
only verified deletions, then relink **current** references. Switching an environment variable
alone loses post-cutover changes.

```bash
pnpm storage:migrate --operation rollback --source r2 --target supabase --baseline '/absolute/path/cutover.json' --manifest '/absolute/path/rollback.json' --mirror-deletions
pnpm storage:migrate --operation rollback --source r2 --target supabase --baseline '/absolute/path/cutover.json' --manifest '/absolute/path/rollback.json' --mirror-deletions --apply
pnpm storage:migrate --operation relink --source r2 --target supabase --manifest '/absolute/path/rollback.json' --journal '/absolute/path/rollback.references.jsonl' --apply
```

Verify objects and rows, set `STORAGE_PROVIDER=supabase`, rebuild, and reopen changes. Keep R2's
copy for recovery. `revert-references` can reverse a specific journal with compare-and-swap, but
it does not copy newly created files; use full rollback for a production provider switch.

## 6. Retention and explicit source deletion

Keep production source files for at least 14 days. Automatic guest cleanup touches the active
provider only. Export the application operation journal as an additional audit artifact:

```bash
pnpm storage:migrate --operation export-journal --manifest '/absolute/path/cutover.json'
pnpm storage:migrate --operation delete-report --manifest '/absolute/path/cutover.json'
```

The deletion report verifies both current source and destination bytes. Changed or missing copies
are preserved. After the full rollback window, source purge requires a separate deliberate
`--operation purge-source --apply` command while changes are paused. Preserve the before/after
reference journal, final manifest, original backups and deletion report. No production source
purge or provider switch is performed automatically.

## 7. Deployment record

Local implementation and simulated provider/round-trip tests do not prove live Cloudflare setup.
At implementation time the R2 bucket, custom domain and credentials were not configured; source
Storage inspection returned an upstream unavailable response. Record actual inspection, live
rehearsal, inventory size, cutover time and rollback rehearsal here once completed. The tracker
remains in progress until those gates pass. Per-user quotas and paid upgrades are plan TODOs.

October 11 setup progress: the user created `23-store-public`. Local bucket/origin values are
configured, and `files.jokik.fi` answered HTTPS HEAD requests with TLS 1.3 and TLS 1.2 (HTTP 404
at the root). This proves public HTTPS connectivity, not bucket association or a TLS 1.3 minimum.
The user selected minimum TLS 1.3; enforcement still needs checking after the Cloudflare change.
The initial configuration preparation left the R2 account ID, S3 keys and analytics value for
the user to fill.
The active provider remains Supabase, with writes open and cleanup disabled. No backup was
uploaded, database reference relinked, or live provider switched during this setup work.

Later October 11 update: the user confirmed that `23-store-r2-analytics` was successfully created.
Reuse this token and copy its value from the confirmation page into its local field; creation is
complete. The user manages `.env.local` and requested that the assistant never read it. Remaining
dashboard work includes the separate R2 Object Read & Write credentials, CORS and TLS verification.
A subsequent public TLS recheck timed out for both versions, so it did not verify a changed
minimum. Verify the requested minimum in the R2 custom-domain settings and by rejecting TLS 1.2.

Latest October 11 import-readiness check: TLS 1.3 connected to `files.jokik.fi` and returned HTTP
404 at the root; a request constrained to TLS 1.2 failed with a protocol-version alert. The
requested TLS minimum is now verified. The 21 streaming migration/reference tests passed again,
including archive compatibility, stale-backup reconciliation, checksum verification, conflicts
and rollback of post-cutover changes. These tests use simulated providers. No live import, SQL
application, reference update or cutover was performed; local credential values remain unread.
