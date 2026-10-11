# Supabase files → Cloudflare R2, with rollback

## 0. What this changes

Move files and registered URL references only. Keep the live Supabase database, auth users and
realtime behavior. Keep both downloaded backups and all Supabase SQL/setup documentation.
The Tables export is a recovery artifact; do not import it over the live database for this move.

## 1. Cloudflare: where to click

1. **R2 Object Storage → Create bucket**: name `23-store-files`, select **Automatic** and
   **Standard**, then **Create bucket**. The six existing categories become key prefixes inside it.
2. Repeat with `23-store-upload-staging`. Keep this bucket private: no custom domain and no
   public development URL. [Bucket setup](https://developers.cloudflare.com/r2/buckets/create-buckets/)
3. Open **23-store-files → Settings → Custom Domains → Add**. Enter a file subdomain on a domain
   managed in this Cloudflare account, for example `files.jokik.fi` if that zone is available.
   Click **Continue → Connect Domain** and wait for Active. Put its HTTPS origin in
   `NEXT_PUBLIC_R2_PUBLIC_URL`. Keep `r2.dev` disabled for production.
   [Custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/)
4. **R2 overview → Account Details → API Tokens → Manage → Create Account API token**:
   use **Object Read & Write** and
   scope it to the two buckets. Copy **Access Key ID**, **Secret Access Key** and the account ID
   into `.env.local` (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`). Also set
   `R2_BUCKET=23-store-files`, `R2_STAGING_BUCKET=23-store-upload-staging`. Save the secret when
   it is displayed. This token does not need bucket-management privileges.
   [R2 credentials](https://developers.cloudflare.com/r2/api/tokens/)
5. **Account API Tokens → Create Token → Create Custom Token**: name it for storage analytics,
   grant **Account → Account Analytics → Read**, and scope it to this account. Store its value as
   `CLOUDFLARE_R2_ANALYTICS_TOKEN`.
   [Analytics token](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/)
6. In each bucket, open **Settings → CORS Policy → Add CORS policy → JSON → Save**. The production
   origins below are examples for this shop; use the actual deployed origins and explicit local
   ports. Do not use wildcard origins. [CORS setup](https://developers.cloudflare.com/r2/buckets/cors/)

Public application bucket:

```json
[{"AllowedOrigins":["https://www.jokik.fi","https://jokik.fi","http://localhost:3023","http://127.0.0.1:3023"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["Range"],"ExposeHeaders":["ETag","Content-Length"],"MaxAgeSeconds":300}]
```

Private staging bucket:

```json
[{"AllowedOrigins":["https://www.jokik.fi","https://jokik.fi","http://localhost:3023","http://127.0.0.1:3023"],"AllowedMethods":["PUT","HEAD"],"AllowedHeaders":["Content-Type","If-None-Match"],"ExposeHeaders":["ETag","Content-Length"],"MaxAgeSeconds":300}]
```

Apply `scripts/storage/setup.sql` in the Supabase SQL editor before the new application routes
are deployed. Schedule cleanup only after the deployment is reachable and Vault contains the
same CRON_SECRET and production origin as the application. Preserve the historical cleanup SQL;
`scripts/storage/schedule.sql` replaces its job rather than running two deletion mechanisms.

## 2. Inspect the downloaded Files export

DbBackupModal has separate **Tables** and **Files** exports. The migration input is normally
`23_backup-files-<date>.tar.gz`. Keep the table export separately. Replace the example path with
the real downloaded filename; quote paths containing spaces.

For the user-selected browser flow, configure the two buckets, custom domain, CORS and `.env.local`,
apply the Supabase setup SQL, then restart the app. Open **DB Backup → Files → R2 → Import** and
choose the Files `.tar.gz`. Export also reads the selected provider. Importing into inactive R2
leaves live database image URLs unchanged and reports that final synchronization is still needed.
Keep `STORAGE_PROVIDER=supabase` during this initial copy. The Tables backup is not imported.
Before final sync, use the archive command below with `--apply` against the selected R2 buckets
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

Use separate rehearsal application and staging buckets with the same privacy/CORS rules. Point
only local `.env.local` at them. Test representative files from all six categories and verify a
complete upload/list/delete and rollback cycle before pointing at production buckets.
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
   locally. Let already issued uploads complete or expire. Staging stays private; cleanup pauses.
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
   image GETs must go to the custom domain and upload PUTs to signed R2 staging URLs. Prepare/
   complete requests carry metadata only. Then set `STORAGE_MIGRATION_PAUSED=false` and enable
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
At implementation time R2 buckets, custom domain and credentials were not configured; source
Storage inspection returned an upstream unavailable response. Record actual inspection, live
rehearsal, inventory size, cutover time and rollback rehearsal here once completed. The tracker
remains in progress until those gates pass. Per-user quotas and paid upgrades are plan TODOs.
