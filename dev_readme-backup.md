# 🗄️ DB Backup & Restore (ADMIN only)

ADMIN-only feature to export the project's tables and Storage files and import them back. Tables
and files are two **independent** flows — each has its own export and its own import — and file
bytes **never pass through a Vercel function**: the browser downloads/uploads Storage objects
straight to/from Supabase, so there is no 60s timeout or memory ceiling tied to library size. This
replaces an earlier design that streamed a single combined archive through a Vercel function with
speed-aware chunking to fit the 60s cap — see "Why this design" below.

- Trigger: avatar dropdown → **DB Backup** item, visible only when `roles` includes `"ADMIN"`.
- Modal: `DbBackupModal` opened via `?modal=DbBackup`, with a Tables / Files tab switch.

<br/>

## Why this design (not server-side streaming)

The previous version downloaded every Storage file server-side, gzipped the whole archive in a
Vercel function, and split the result into speed-sized chunks to stay under the 60s function limit
— the `CHUNK_BUDGET_MS`/`SERVER_THROUGHPUT_BYTES_PER_MS` math approximated how much a function
could pull from Storage in the time it had. That approximation is fragile: it does not actually
guarantee the limit is respected, it only estimates it.

This version removes the limit instead of estimating around it: **no request carries file bytes.**
- Export: the server returns a file **list** (bucket/path/size/contentType, no bytes). The browser
  downloads each file directly from Supabase's public CDN and builds the `.tar.gz` locally.
- Import: the browser decompresses the archive locally, asks the server for a signed upload URL
  per file, then PUTs bytes straight to Supabase. The server only ever hands out URLs.

Two things from the old design are kept anyway, because they're independently useful, not because
they were needed for the timeout problem:
- **Connection speed display** — a 4s probe (`BackupSDK.measureSpeedBytesPerMs()`) still runs, but
  purely for display now ("~2.4 MB/s"), not to size chunks.
- **Byte-accurate progress** — the files tab shows "23 MB / 230 MB", not a file count. Every file's
  size is known ahead of time (from the bucket listing on export, from the parsed archive on
  import), and `xhr.upload.onprogress` gives real in-flight bytes during upload.

<br/>

## What's in each archive

**Tables archive** (`23_backup-tables-<date>.tar.gz`) — one `.csv` per table:

```
23_users.csv
23_users_cart.csv
23_categories.csv
23_category_views.csv
23_products.csv
23_tickets.csv
23_messages.csv
```

**Files archive** (`23_backup-files-<date>.tar.gz`) — every object in both buckets, plus a mime-type
map so import restores the right `contentType`:

```
storage-content-types.json
storage/23_public-images/<...>
storage/23_avatar-images/<...>
```

- **Tables** (`BACKUP_TABLES`, FK-safe order, in `app/api/backup/backupConfig.ts`):
  `23_users → 23_users_cart → 23_categories → 23_category_views → 23_products → 23_tickets → 23_messages`.
  `utm_stats` is **excluded** — it is shared across projects 14/23/28/29.
- **Buckets** (`BACKUP_BUCKETS`, mirrors `app/ts/types/TBuckets.ts`): `23_public-images`, `23_avatar-images`.

<br/>

## Files

| Area | File |
| --- | --- |
| Project-specific config: tables, column classification, buckets, public URL, file listing | `app/api/backup/backupConfig.ts` |
| Pure tar (.tar) build/parse + browser gzip (no Node deps) | `app/api/backup/tarClient.ts` |
| Pure CSV read/write (RFC 4180) | `app/api/backup/csvClient.ts` |
| Stable re-export shim (routes + SDK import from here) | `app/api/backup/backupTables.ts` |
| ADMIN gate (string error or null) | `app/api/backup/requireAdmin.ts` |
| Rows GET (export) / POST (import, ≤500/batch) | `app/api/backup/rows/route.ts` |
| Files GET (list, paths only) / POST (signed upload URLs, ≤100/batch) | `app/api/backup/files/route.ts` |
| Client SDK — 4 methods (export/import × tables/files) + speed probe | `app/sdk/BackupSDK/BackupSDK.ts` |
| Hook (owns state for all 4 flows, toast + i18n) | `app/components/ui/Modals/DbBackup/hooks/useDbBackup.ts` |
| Modal UI (Tables/Files tabs, progress, results) | `app/components/ui/Modals/DbBackup/DbBackupModal.tsx` |
| Response types | `app/ts/namespaces/api/backup/api.d.ts` |

<br/>

## The `backup_23_tables()` SQL function is no longer called

The old export route read every table in one round trip via `supabaseAdmin.rpc("backup_23_tables")`.
The new `rows/route.ts` does a simple `select("*")` per table instead (admin-gated, no per-row
scoping — this schema has no per-user ownership model). The SQL function itself is left in the
database, unused — dropping it is a separate decision on shared infrastructure, not made by this
change. See the **DB BACKUP FUNCTION** section in `dev_readme-supbase-sql.md` if it's ever revisited.

<br/>

## Export flow

**Tables:** `GET /api/backup/rows` returns every table's rows as JSON (small, no Storage bytes) →
the browser converts each table to CSV (`toCsv`) → packs a `.tar.gz` locally → downloads it.

**Files:** `GET /api/backup/files` returns every stored file's bucket/path/size/contentType (no
bytes) → the browser downloads each file directly from Supabase's public CDN (5 concurrent
downloads) → packs a `.tar.gz` locally → downloads it. Progress is byte-accurate: `bytesDone` sums
the `size` of each file as its download completes, against `bytesTotal` from the file list.

<br/>

## Import flow (upsert — NOT override)

**Tables:** upload a `.tar.gz` (from export) or loose `.csv` files. The browser parses CSV locally,
coerces columns per `backupConfig.ts` (`numericColumns` → number, `arrayColumns`/`jsonColumns` →
`JSON.parse`), and POSTs `≤500` rows per table per batch to `/api/backup/rows`. The server upserts
on each table's primary key (`onConflict`). Rows with an empty/invalid uuid column are dropped
before the upsert (`filterRowsByUuidColumns`) and reported as `skipped`, so one bad row is never
able to fail an entire batch with a `22P02` (text = uuid) error.

**Files:** upload one `.tar.gz` (from export). The browser decompresses and parses it locally (the
server never sees the archive bytes), asks `/api/backup/files` for a signed upload URL per file
(≤100 per request; bucket membership is the whole ownership check — this schema has no per-file
owner column), then PUTs each file's bytes directly to the signed URL with
`upsert: true` baked into the token, so a re-import overwrites the existing object.

Progress on both flows is byte-accurate on the files tab (`23 MB / 230 MB`) and count-based on the
tables tab (`3 / 7 tables`) — CSV rows are not large enough for byte progress to be meaningful.

<br/>

## Security

- Both routes (`rows`, `files`) are gated by the existing `requireAdmin()` — returns 401
  (unauthenticated) or 403 (not ADMIN). Non-admins hitting the routes directly are rejected.
- All DB/Storage access uses `supabaseAdmin` (service role), which bypasses RLS — bucket policies
  do not affect export/import.
- There is no per-row or per-file ownership in this schema — `requireAdmin()` is the entire access
  boundary (unlike a per-user project, where each table/file would also need its own scoping — see
  `19_spotify-clone`'s `dev_readme-backup.md` for that shape).

<br/>

## Cross-DB restore caveat

`23_users.id`, `23_users_cart.id`, `23_products.owner_id` are UUID with FK to `auth.users`.
Importing a backup into a **different/fresh** Supabase project whose `auth.users` is empty fails
those rows on the FK — but the FK error is caught per-row: `filterRowsByUuidColumns` only drops a
row whose uuid column is *empty/malformed text*, not one that fails a foreign-key check (Postgres
still enforces the FK on upsert), so a genuine FK violation still surfaces as a batch-level
`error` in the table's result, not a skip.

`23_tickets.owner_id` is TEXT with no auth FK, confirmed live — those rows always restore.
`23_messages.sender_id` status is **open, not settled by this doc**: an earlier version of this
file claimed it was also FK-free, but plan-00-tracker.md's inconsistency audit records a live
screenshot where import was rejected with `23_messages_sender_id_fkey`. That contradiction is
tracked by `plan-02-db-anonymous-tickets.md` (status: waiting) — a schema question, out of scope
for this architecture change. See **ANONYMOUS TICKETS CLEANUP** in `dev_readme-supbase-sql.md` for
the copy-paste SQL a fresh project needs once plan-02 resolves it.

<br/>

## Porting this feature into another project

See `19_spotify-clone`'s `app/features/backup/dev_readme-backup.md` — it documents this exact
architecture as a copy-paste SOP (which files to copy, the `backupConfig.ts` contract, the
questions to ask, files to request if missing) and already has two worked examples: a per-user
project (`19_spotify-clone` itself) and an admin-gated, no-scoping project (`26_hot-delivery`,
same shape as this one). 23_store additionally keeps the connection-speed display and
byte-accurate progress described above — neither exists in the spotify version, both are explicit
requirements here.
