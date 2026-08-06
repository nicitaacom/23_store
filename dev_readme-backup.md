# 🗄️ DB Backup & Restore (ADMIN only)

ADMIN-only feature to export the project's tables and Storage files and import them back. Tables
and files are two **independent** flows — each has its own export and its own import — and file
bytes **never pass through a Vercel function**: the browser downloads/uploads Storage objects
straight to/from Supabase, so there is no 60s timeout or memory ceiling tied to library size. This
replaces an earlier design that streamed a single combined archive through a Vercel function with
speed-aware chunking to fit the 60s cap — see "Why this design" below.

- Trigger: avatar dropdown → **DB Backup** item, visible only when `roles` includes `"ADMIN"`.
- Modal: `DbBackupModal` opened via `?modal=DbBackup`, with a Tables / Files tab switch.
- Active work belongs to the global Zustand `useDbBackupState`, so closing the modal keeps the
  export/import running and shows the same progress in a fixed card.

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
- **Connection speed display** — shown during the files tab's export/import ("~2.4 MB/s"). Not a
  separate probe against a fixed asset (an earlier version fetched `/favicon.ico` to measure
  throughput — that file does not exist in this project, so the probe 404'd every time and silently
  fell back to a hardcoded constant, which is why the number never varied). `createSpeedTracker()`
  in `BackupSDK.ts` instead computes a smoothed bytes/ms figure straight from the real transfer's
  own progress deltas (an exponential moving average, resampled at most every 200ms) — it reflects
  whatever is actually happening on the wire, no separate request involved.
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
23_ai_price_runs.csv
23_ai_price_proposals.csv
23_personalized_designs.csv
23_tickets.csv
23_messages.csv
```

**Files archive** (`23_backup-files-<date>.tar.gz`) — every object in all 6 buckets, plus a mime-type
map so import restores the right `contentType`:

```
storage-content-types.json
storage/23_product-images/<emailSlug>/<productId>/<titleSlug>-1.jpg
storage/23_ai-product-images/<emailSlug or deviceId>/<...>
storage/23_avatar-images/<emailSlug>/avatar.png
storage/23_support-images/<emailSlug>/2026-07-29_at_22-19-54.png
storage/23_support-guest-images/<deviceId>/2026-07-29_at_22-20-11.png
storage/23_product-personalization-images/<emailSlug>/<productId>/my-kovrik.jpg
```

- **Tables** (`BACKUP_TABLES`, FK-safe order, in `app/api/backup/backupConfig.ts`):
  `23_users → 23_users_cart → 23_categories → 23_category_views → 23_products → 23_ai_price_runs → 23_ai_price_proposals → 23_personalized_designs → 23_tickets → 23_messages`.
  The two AI-pricing tables export as empty CSVs until their manual SQL block has been run.
  `utm_stats` is **excluded** — it is shared across projects 14/23/28/29.
- **Buckets** (`BACKUP_BUCKETS`, mirrors `app/ts/types/TBuckets.ts`), one per purpose since plan-22:
  `23_product-images`, `23_ai-product-images`, `23_avatar-images`, `23_support-images`,
  `23_support-guest-images`, `23_product-personalization-images`. The retired `23_public-images` held
  all of them at once and is not exported — relink still reads a path out of an old URL naming it,
  see **Storage URL relinking** below.
- **Folder names are keyed on the slugified email**, never on `auth.users.id`: `nicitaacom@gmail.com`
  becomes `nicitaacomgmailcom`. A restore gives the same person a new `auth.users.id` in project B
  (see **Cross-DB restore** below), so a folder named after that id would be left behind after every
  restore, while the account's email never changes.

<br/>

## Files

| Area | File |
| --- | --- |
| Project-specific config: tables, column classification, buckets, public URL, file listing | `app/api/backup/backupConfig.ts` |
| Pure tar (.tar) build/parse + browser gzip (no Node deps) | `app/api/backup/tarClient.ts` |
| Pure CSV read/write (RFC 4180) | `app/api/backup/csvClient.ts` |
| Stable re-export shim (routes + SDK import from here) | `app/api/backup/backupTables.ts` |
| ADMIN gate (string error or null) | `app/api/backup/requireAdmin.ts` |
| Auth-account preparation + source/target UUID map | `app/api/backup/auth-users/route.ts` |
| Pure source-user validation and row remapping | `app/api/backup/backupAuthRestore.ts` |
| Rows GET (export) / POST (import, ≤500/batch) | `app/api/backup/rows/route.ts` |
| Files GET (list, paths only) / POST (signed upload URLs, ≤100/batch) | `app/api/backup/files/route.ts` |
| Storage URL relink POST (scan target paths, update rows/Auth metadata) | `app/api/backup/relink-storage-urls/route.ts` |
| Pure recursive Storage URL parser/relinker | `app/api/backup/backupStorageRelink.ts` |
| Client SDK — export/import × tables/files, relink finalizer + live speed tracker | `app/sdk/BackupSDK/BackupSDK.ts` |
| Global state for all 4 flows and modal visibility | `app/store/ui/useDbBackupState.ts` |
| Hook (starts the SDK work and supplies toast + i18n) | `app/components/ui/Modals/DbBackup/hooks/useDbBackup.ts` |
| Always-mounted progress card + page-leave warning | `app/components/ui/Modals/DbBackup/DbBackupProgressCard.tsx` |
| Modal UI (Tables/Files tabs, progress, results) | `app/components/ui/Modals/DbBackup/DbBackupModal.tsx` |
| Response types | `app/ts/namespaces/api/backup/api.d.ts` |

<br/>

## Progress after closing the modal

`useDbBackupState` owns the export/import state independently of the modal lifecycle.
`ModalsQueryProvider` keeps `DbBackupProgressCard` mounted even when `?modal=DbBackup` is absent.
Closing and reopening the modal therefore reconnects to the same export/import and current
progress without a React context provider.

During active work, closing the modal shows a non-dismissible bottom-right card with the operation,
progress, current table/file label, transferred bytes, and connection speed where available. A
`beforeunload` listener also requests the browser's standard confirmation before closing or
reloading the page. The listener and progress card are removed as soon as the work succeeds or
fails.

<br/>

## The `backup_23_tables()` SQL function is no longer called

The old export route read every table in one round trip via `supabaseAdmin.rpc("backup_23_tables")`.
The new `rows/route.ts` does a simple `select("*")` per table instead (admin-gated, no per-row
scoping — this schema has no per-user ownership model). The SQL function itself is left in the
database, unused — dropping it is a separate decision on shared infrastructure, not made by this
change. See the **DB BACKUP FUNCTION** section in `dev_readme-supbase-sql.md` if it's ever revisited.

<br/>

## Export flow

**Tables:** `GET /api/backup/rows` returns every table's rows as JSON (small, no Storage bytes). If
an exported cart/product/design references an Auth user through a real FK whose public `23_users`
profile is missing, export reads that specific account from Supabase Auth and adds a safe `USER` profile to
`23_users` in the archive. The browser then converts each table to CSV (`toCsv`), packs a
`.tar.gz` locally, and downloads it. This makes one-click Export self-contained for one-click
Import without permanently inserting the synthesized profile into the source database.
UUID-looking ids in historical TEXT columns (tickets, messages, category views) are preserved as
history and do not require a still-existing Auth account.

**Files:** `GET /api/backup/files` returns every stored file's bucket/path/size/contentType (no
bytes) → the browser downloads each file directly from Supabase's public CDN (5 concurrent
downloads) → packs a `.tar.gz` locally → downloads it. Progress is byte-accurate: `bytesDone` sums
the `size` of each file as its download completes, against `bytesTotal` from the file list.

<br/>

## Import flow (upsert — NOT override)

**Tables:** upload a `.tar.gz` (from export) or loose `.csv` files. The browser parses and validates
all CSVs locally, coerces columns per `backupConfig.ts`, automatically prepares/reuses target Auth
users, remaps source user UUIDs, and only then POSTs `≤500` rows per table per batch to
`/api/backup/rows`. The server upserts on each table's primary key (`onConflict`). Rows with an
empty/invalid uuid column are dropped before the upsert (`filterRowsByUuidColumns`) and reported as
`skipped`, so one bad row cannot fail an entire batch with a `22P02` (text = uuid) error.
CSV keeps `null` as an unquoted empty field and `""` as a quoted empty field, so empty text survives
the round trip. For older archives where both forms were unquoted, import restores a null
`23_tickets.last_message_body` to its database default (`""`) before upsert.

**Files:** upload one `.tar.gz` (from export). The browser decompresses and parses it locally (the
server never sees the archive bytes), asks `/api/backup/files` for a signed upload URL per file
(≤100 per request; bucket membership is the whole ownership check — this schema has no per-file
owner column), then PUTs each file's bytes directly to the signed URL with
`upsert: true` baked into the token, so a re-import overwrites the existing object.

**Storage URL relinking:** both Tables import and Files import finish by calling the ADMIN-only
`POST /api/backup/relink-storage-urls`. Calling it from both flows makes the restore order
independent: a Tables-first restore reports paths that are not uploaded yet, and the later Files
import resolves them; a Files-first restore resolves them when Tables are imported. The route
lists the objects currently present in all 6 buckets, then recursively
checks only the configured URL-bearing columns:

- `23_users.avatar_url`
- `23_products.img_url`, `variants`, and `personalization`
- `23_ai_price_proposals.proposed_variants`
- `23_personalized_designs.source_url`
- `23_tickets.owner_avatar_url`
- `23_messages.images` and `sender_avatar_url`
- Supabase Auth `user_metadata.avatar_url`

An old public URL is rewritten to `NEXT_PUBLIC_SUPABASE_URL` when its exact `bucket/path` exists in
project B's Storage — and, since plan-22, also when the row's own folder holds the file under a
different name. Current-project URLs, external/invalid/data URLs, and URLs with neither an exact
match nor a folder match remain unchanged. Missing references and unique paths are returned as an
unresolved warning in the modal; they do not fail an otherwise successful import. Re-running the
finalizer is safe and idempotent. After it succeeds, the client refreshes the current route so
server-rendered image data is fetched again.

**Matching by the row's own folder** (`selectStorageFolder` in `backupConfig.ts`,
`selectRelinkedPathsByFolder` in `backupStorageRelink.ts`). An exact string match alone leaves every
pre-plan-22 row unresolved: those URLs name `23_public-images/<old auth id>/…`, a bucket and a
folder nothing answers to any more. The restored row itself still says where its images belong now:

| Table | Folder built from the row | Example |
| --- | --- | --- |
| `23_users.avatar_url` | `23_avatar-images/<slugifyEmail(email)>` | `23_avatar-images/nicitaacomgmailcom` |
| `23_products.img_url` (+ `variants`, `personalization`) | `23_product-images/<slugifyEmail(owner email)>/<id>` | `23_product-images/nicitaacomgmailcom/prod_T1IRAxDEq5VtEmno` |
| `23_personalized_designs.source_url` | `23_product-personalization-images/<slugifyEmail(buyer email)>/<product_id>` | `…/nicitaacomgmailcom/prod_T1IRAxDEq5VtEmno` |

The email is read from `23_users.email`, keyed by the row's `owner_id` — except for
`23_personalized_designs`, which is keyed on `user_id`: the design file was uploaded by the buyer,
while `owner_id` on that table is the shop owner of the product.

Every stored file is indexed once by `bucket/folder` and sorted numerically inside it, so
`slug-2.jpg` comes before `slug-10.jpg`. A row's unresolved URLs are then paired with that folder's
files in order — 1st unresolved URL to `slug-1.jpg`, 2nd to `slug-2.jpg` — and the pairing is applied
to every URL column of the row, so a variant URL stays equal to the `img_url` entry it points at. A
row holding more unresolved URLs than the folder has files leaves the extra ones in the unresolved
count.

For the 2026-08-03 migration archive, 861 of 1,071 database Storage URL references match the
current files archive. The remaining 210 references (170 unique paths) point to files absent from
that export and intentionally stay unchanged. That run predates plan-22, so it was measured on
exact-string matching alone, against the 2 buckets of the time.

Since plan-22, a restore needs the 6 buckets to exist in project B first — the **SQL query for
buckets + policies** section of `dev_readme-supbase-sql.md`, run in the Supabase SQL Editor. No
environment change beyond `NEXT_PUBLIC_SUPABASE_URL`, which is already set.

Progress on both flows is byte-accurate on the files tab (`23 MB / 230 MB`) and count-based on the
tables tab (`3 / 10 tables`) — CSV rows are not large enough for byte progress to be meaningful.

<br/>

## Security

- All backup routes (`rows`, `files`, `auth-users`, `relink-storage-urls`) are gated by the existing `requireAdmin()` — returns 401
  (unauthenticated) or 403 (not ADMIN). Non-admins hitting the routes directly are rejected.
- All DB/Storage access uses `supabaseAdmin` (service role), which bypasses RLS — bucket policies
  do not affect export/import.
- There is no per-row or per-file ownership in this schema — `requireAdmin()` is the entire access
  boundary (unlike a per-user project, where each table/file would also need its own scoping — see
  `19_spotify-clone`'s `dev_readme-backup.md` for that shape).

<br/>

## Cross-DB restore — Auth users are prepared automatically during Tables import

### `auth.users` is never exported or imported — only `public.23_users.csv` is

`auth.users` is Supabase-managed and read-only from this app — it is never exported or imported
directly. What gets exported is `public.23_users.csv`, and each row's `id` there is the account's OLD
uuid from project A (Supabase A's own `auth.users`). Importing into a fresh project B, B's
`auth.users` has no row for any of these people yet, so `POST /api/backup/auth-users` creates a
brand-new B-side account with a brand-new uuid for each one. `23_users.id` is then rewritten from the
old project-A uuid to that new project-B uuid before the row is upserted — required by
`23_users.id REFERENCES auth.users(id)`: inserting the old project-A uuid into project B would fail
the foreign key, since no `auth.users` row with that uuid exists there.

Every FK column pointing at a person (`owner_id`, `sender_id`, `user_id`, …) is rewritten the same
way. This is exactly why a Storage folder is named after the email and not the id: the id the person
holds after a restore is a different one, the email is the same one.

```
Supabase A: user.id lives in auth.users, exported into 23_users.csv as row.id
        │
        ▼
23_users.csv imported into Supabase B — that row.id is still Supabase A's uuid
        │
        ▼
Supabase B's auth.users has no row under that uuid (this person never signed up here)
        │
        ▼
POST /api/backup/auth-users creates one — a brand-new Supabase B auth.users row, brand-new uuid
        │
        ▼
23_users.id (and every FK: owner_id, sender_id, ...) gets rewritten from the
Supabase A uuid to the new Supabase B uuid, so 23_users.id matches Supabase B's
own auth.users.id — required by 23_users.id REFERENCES auth.users(id)
        │
        ▼
the account's email never changed through any of this
        │
        ▼
slugifyEmail(email) → same Storage folder as before the restore
```

There is no separate Auth-import button or manual account step. After the admin selects the Tables
archive, `BackupSDK.importTables()` parses and validates every CSV first, then calls the ADMIN-only
`POST /api/backup/auth-users` before the first public-table upsert. That route reuses a target Auth
user by UUID/email or creates a passwordless Auth user, and returns a source UUID → target UUID
map. The SDK applies that map to users, carts, products, AI proposals, personalized designs,
category views, tickets, and messages before restoring them in FK-safe order.

The archive never contains passwords or password hashes. A newly created user whose archived
`providers` includes `credentials` gets `23_users.password_reset_required = true`; password login
is blocked with a recovery action until `/api/auth/reset` changes the password and clears the
marker. Google-only accounts are created with their archived confirmation state, and Supabase
links the Google identity when the user next signs in with the same verified email. Existing target
accounts (including the bootstrap admin) are reused and keep the union of their roles/providers.

Preparation is retry-safe: Auth users created before a later failure hold the source id in Auth
app metadata, so another import reuses them and retains the recovery requirement. A partial table
import without `23_users.csv` still works when every referenced UUID already exists in target Auth;
otherwise it stops before table writes and requests the missing profile CSV.

An archive exported before missing-profile completion was added must be exported again; changing
the importer cannot recover an email that is absent from the old archive.

`23_tickets.owner_id` is TEXT with no auth FK, confirmed live — those rows always restore.
`23_messages.sender_id` is **settled: TEXT, no FK**. Nikita read the live constraints (plan-02 task 1)
and the only ones on these two tables are `23_tickets_pkey`, `23_messages_pkey` and
`23_messages_ticket_id_fkey` (`ON DELETE CASCADE`) — the `23_messages_sender_id_fkey` from the old
import screenshot is gone, so anonymous rows (`sender_id = anonymousId_…`) import and restore like any
other row. A fresh project gets the same shape from `dev_readme-supbase-sql.md`; its **ANONYMOUS
TICKETS CLEANUP** section holds the pg_cron job that deletes anonymous tickets after a month of
silence from the anonymous owner.

<br/>

## Porting this feature into another project

See `19_spotify-clone`'s `app/features/backup/dev_readme-backup.md` — it documents this exact
architecture as a copy-paste SOP (which files to copy, the `backupConfig.ts` contract, the
questions to ask, files to request if missing) and already has two worked examples: a per-user
project (`19_spotify-clone` itself) and an admin-gated, no-scoping project (`26_hot-delivery`,
same shape as this one). 23_store additionally keeps the connection-speed display and
byte-accurate progress described above — neither exists in the spotify version, both are explicit
requirements here.
