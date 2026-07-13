# plan-11 — Backup feature: rebuild on 19_spotify-clone's browser-only-bytes architecture

**Priority:** P1 (explicit ask)
**Screenshot:** — (explicit ask: "I want 23_store backup to be EXACTLY same as on 19 spotify backup")
**Recommended model:** Opus · high thinking — full architecture swap on a working, admin-only feature; many files touched across api/sdk/UI/i18n, must land eslint-clean
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

23_store already has a **complete, working** backup feature (20 commits, `dev_readme-backup.md` fully
documents it): server-side streaming NDJSON export via a `backup_23_tables()` RPC, gzip archive built
in a Vercel function, speed-aware chunking to fit the 60s limit, XHR-progress upload.

Nikita wants it replaced with the architecture from `19_spotify-clone`'s `app/features/backup/`
instead: **file bytes never pass through a Vercel function.** This is the actual fix for "does not
consider Vercel timeout limits" — not better chunking, but removing the ceiling entirely (there is
no request that carries file bytes, so there is nothing that can exceed 60s from file size alone).
Tables and Storage files are two independent flows:

- **Tables** → the route returns row JSON (small) → the browser builds a `.csv` per table → packs
  them into one `.tar.gz` client-side.
- **Files** → the route returns a file list (paths only) → the browser downloads each file straight
  from Supabase's public CDN and packs a `.tar.gz` client-side (export); on import, the browser
  decompresses the archive locally and PUTs each file straight to a Supabase **signed upload URL**
  (import) — the server only ever hands out URLs, never sees file bytes.

This removes the entire chunking/speed-probe/NDJSON-streaming layer (nothing to chunk — no single
request ever carries file bytes) and the `backup_23_tables()` RPC dependency (each table is a plain
admin-scoped `select("*")`).

23_store is **admin-only, no per-user scoping** (same shape as the `26_hot-delivery` port already
documented in spotify's `dev_readme-backup.md` as a worked example) — there is no `scopeSelect` /
`scopeRows` / per-file-ownership concept to port, only the "one gate for the whole feature" shape.
23_store already has that gate working today: `requireAdmin()` (`app/api/backup/requireAdmin.ts`,
string error or null) — this plan reuses it as-is, it does not need replacing.

<br/>

## §1 Where it lives (target state)

| Piece | File | Status |
| --- | --- | --- |
| Project-specific config (tables/buckets/column classification/public URL) | `app/api/backup/backupConfig.ts` | **new** |
| Pure tar + browser gzip (no Node `zlib`, safe in client bundle) | `app/api/backup/tarClient.ts` | **new** |
| Pure CSV read/write (RFC 4180) | `app/api/backup/csvClient.ts` | **new** |
| Stable re-export shim (routes + SDK import from here) | `app/api/backup/backupTables.ts` | **rewrite** |
| ADMIN gate (string error or null) | `app/api/backup/requireAdmin.ts` | unchanged, reused |
| Rows GET (export) / POST (import, ≤500/batch) | `app/api/backup/rows/route.ts` | **new** |
| Files GET (list, paths only) / POST (signed upload URLs, ≤100/batch) | `app/api/backup/files/route.ts` | **new** |
| Old combined-archive routes | `app/api/backup/manifest/route.ts`, `export/route.ts`, `import/route.ts` | **deleted** |
| Client SDK (4 methods: export/import × tables/files) | `app/sdk/BackupSDK/BackupSDK.ts` | **rewrite** |
| Hook (owns state for 4 flows, toast + i18n) | `app/components/ui/Modals/DbBackup/hooks/useDbBackup.ts` | **rewrite** |
| Modal UI (Tables/Files tab switch, mirrors spotify's `DbBackupModal.tsx` shape) | `app/components/ui/Modals/DbBackup/DbBackupModal.tsx` | **rewrite** |
| Response types | `app/ts/namespaces/api/backup/api.d.ts` | **rewrite** |
| i18n copy (4 locale files, same line numbers each) | `app/locales/en.ts` + 3 others | **update** |
| Feature doc | `dev_readme-backup.md` | **rewrite** |

<br/>

## §2 23_store's `backupConfig.ts` values (derived from `app/ts/types_db.ts`, not the current doc —
the doc has a known stale claim, see plan-00-tracker's inconsistency audit)

FK-safe order, `EXCLUDED_FROM_BACKUP = ["utm_stats"]` (shared across 14/23/28/29), same
compile-time exhaustiveness check the current `backupTables.ts` already has — keep that pattern.

| Table | onConflict | numericColumns | arrayColumns | jsonColumns |
| --- | --- | --- | --- | --- |
| `23_users` | `id` | — | `providers`, `roles` | — |
| `23_users_cart` | `id` | — | — | `cart_products` |
| `23_categories` | `id` | — | — | — |
| `23_category_views` | `user_id,category_id` | `view_count` | — | — |
| `23_products` | `price_id,owner_id,id` | `on_stock`, `price` | `img_url` | `translations`, `variants` |
| `23_tickets` | `id` | `rate` | — | — |
| `23_messages` | `id` | — | `images` | — |

Buckets: `23_public-images`, `23_avatar-images` (mirrors `app/ts/types/TBuckets.ts`, unchanged from
today).

No `scopeSelect`/`scopeRows` on any table (admin sees/writes everything — `requireAdmin()` is the
whole boundary, checked once per route handler, matching every other admin-only route in this repo).

`getPublicUrl(bucket, path)` — same formula both other projects use:
`${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`.

### Kept from the current design (explicit ask, not in spotify's version)

Spotify's UI only shows count-based progress ("3 / 7 tables", "12 / 40 files"). Nikita wants two
things the CURRENT 23_store build already has, carried over onto the new architecture:

- **Connection speed display.** The current `BackupSDK.measureSpeedBytesPerMs()` (4s probe against
  `/favicon.ico`) stays, but changes purpose: today it sizes chunks (`CHUNK_BUDGET_MS` /
  `SERVER_THROUGHPUT_BYTES_PER_MS` / `MAX_CHUNK_BYTES`), which goes away with chunking. It becomes
  **display-only** — run once when a files export/import starts, show e.g. "~2.4 MB/s" in the modal.
- **Byte-level progress, not just counts.** The files flow (export downloads, import's XHR upload)
  must show "23 MB / 230 MB", not "3 / 7 files". `BackupFileRef` already carries `size` (bytes) from
  the bucket listing — export sums completed files' `size` against the total; import already has
  every file's exact byte length in memory (parsed from the local tar) before upload starts, and
  `xhr.upload.onprogress` gives real in-flight bytes for the file currently uploading, so the running
  total is (bytes from already-finished files) + (current file's `event.loaded`). Tables stay
  count-based ("3 / 7 tables") — CSV rows are not large enough for byte progress to mean anything.

<br/>

## §3 Expected behavior

```
BEFORE (current)                              AFTER (this plan)
1 combined archive (tables + files)           2 independent archives (tables-only, files-only)
server downloads/gzips files (Vercel fn)      browser downloads files straight from Supabase CDN
speed probe + chunking to fit 60s             no chunking needed - no request ever carries file bytes
backup_23_tables() RPC (1 call, all tables)   1 select("*") per table via supabaseAdmin
import: upload whole archive to server        import files: signed upload URL, browser PUTs directly
GET /api/backup/manifest,/export,/import      GET/POST /api/backup/rows, GET/POST /api/backup/files
speed probe sizes chunks (functional)         speed probe is display-only ("~2.4 MB/s")
files progress: N / M files                   files progress: 23 MB / 230 MB (byte-accurate)
```

<br/>

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not
> start task N+1 until he approves ("approved - continue").

1. **`backupConfig.ts` + `tarClient.ts` + `csvClient.ts` (pure additions, nothing wired yet).**
   New `backupConfig.ts` with the table above (compile-time exhaustiveness check kept from today's
   `backupTables.ts`), `tarClient.ts`/`csvClient.ts` ported from spotify's (pure functions, no Node
   `zlib`). Naming/wording pass required before this is "done": T-prefix on every exported type
   (`TBackupTableConfig` not `BackupTableConfig` — interfaces aren't used in this codebase's backup
   code, keep `type`), no vague names (spotify's `res`/`err`-shaped locals must become
   `response`/`error`/etc.), no banned words (spotify's comments say "the browser downloads" — fine
   — but check every comment against the list, `no-banned-words` is `error` severity here). Nothing
   imports these yet, so the app still builds/runs on the OLD routes. STOP for review.

2. **New routes: `app/api/backup/rows/route.ts` + `app/api/backup/files/route.ts`, response types
   in `api.d.ts`, `backupTables.ts` rewritten as the re-export shim.** GET/POST rows: loop
   `BACKUP_TABLES`, plain `select("*")` (no `scopeSelect`), upsert on `config.onConflict`. GET/POST
   files: list buckets recursively (paths + size + contentType only, no download) for GET;
   `createSignedUploadUrl(path, { upsert: true })` per requested path for POST — bucket membership
   (`isBackupBucket`) is the only ownership check needed (admin-only, no per-file owner). Both gated
   by the existing `await requireAdmin()` (401/403 by its already-established convention). These are
   NEW routes alongside the old ones — old routes still work, nothing is deleted yet. STOP for review.

3. **Rewrite `app/sdk/BackupSDK/BackupSDK.ts`.** Replace `getManifest`/`exportBackup`/
   `importBackup`/`streamExport`/`base64ToBlob` with 4 methods: `exportTables`/`importTables`/
   `exportFiles`/`importFiles`, same behavior as spotify's `BackupSDK.ts` (coerce numeric/array/jsonb
   columns on import per `backupConfig.ts`, ≤500-row POST batches for rows, ≤100-file POST batches
   for files, XHR upload with real progress to each signed URL). Stay a class extending `BaseSDK`
   (this codebase's convention, not spotify's free functions) — use `this.getJson`/`this.request` for
   GET, and a small local `uploadToSignedUrlWithProgress` helper (XHR, not `BaseSDK`, same reason
   spotify's own version isn't through `BaseSDK`: needs `upload.onprogress`) for the PUT. Keep
   `export const backupSDK = new BackupSDK()` as the export shape callers already use.
   Keep `measureSpeedBytesPerMs()` verbatim (still a useful 4s probe) but drop its chunk-sizing
   callers (`CHUNK_BUDGET_MS`/`SERVER_THROUGHPUT_BYTES_PER_MS`/`MAX_CHUNK_BYTES`/
   `splitRefsIntoChunks` all go away with chunking) — `exportFiles`/`importFiles` call it once up
   front purely to report a speed number via `onProgress`/a dedicated callback. `exportFiles` tracks
   `bytesDone`/`bytesTotal` from each `BackupFileRef.size` as downloads complete (not just
   `filesDone`); `importFiles` tracks `bytesDone` as (completed files' byte length) + (current
   file's `event.loaded` from `xhr.upload.onprogress`) against the archive's total byte length
   (known locally — already unpacked). Tables stay count-based (`done`/`total` tables), no bytes.
   Old routes (`manifest`/`export`/`import`) are now unused by the SDK but still exist on disk — not
   deleted yet. STOP for review.

4. **Rewrite `useDbBackup.ts` + `DbBackupModal.tsx`.** Hook: 4 independent phases (tables
   export/import, files export/import) instead of 1 export + 1 import, same shape as spotify's
   `useDbBackup.ts` state machine, plus new state for the files flow's `bytesDone`/`bytesTotal` and a
   `connectionSpeedBytesPerMs` value (set once from `measureSpeedBytesPerMs()` at the start of a
   files export/import). Keep this codebase's `useToast`/`useScopedI18n` integration (do not import
   spotify's toast lib or its `ModalContainer` — this project already has `ModalQueryContainer` wired
   to `?modal=DbBackup` and must keep using it). Modal: tab switch ("Tables" / "Files") mirroring
   spotify's `DbBackupModal.tsx` layout, built from this codebase's own `Button`/`ProgressBar`
   components. Files tab shows the speed line ("~2.4 MB/s") and a byte-formatted progress label
   ("23 MB / 230 MB", a small local `formatBytes` helper — check `app/utils/` first in case one
   already exists before writing a new one) instead of a file count. New locale keys needed (tables
   export/import, files export/import, speed label, per-table/per-bucket result lines) — add to
   `app/locales/en.ts` AND the other 3 locale files at the SAME line numbers (check whatever
   line-count invariant `plan-01-language-switcher.md` established before touching these files).
   STOP for review.

5. **Delete the old architecture.** Remove `app/api/backup/manifest/route.ts`,
   `app/api/backup/export/route.ts`, `app/api/backup/import/route.ts`. Confirm nothing still
   references `splitRefsIntoChunks`/`downloadBucketFiles`/`downloadFilesByRef`/
   `createBackupArchive`/`parseBackupArchive`/`filterRowsByUuidColumns`/`BACKUP_CONFLICT_COLUMNS`/
   `BACKUP_UUID_COLUMNS`/`CHUNK_BUDGET_MS`/`SERVER_THROUGHPUT_BYTES_PER_MS`/`MAX_CHUNK_BYTES` (these
   move to/are superseded by `backupConfig.ts` + `tarClient.ts` + `csvClient.ts`'s client-side
   `coerceRowsForImport`-equivalent) before deleting them — `measureSpeedBytesPerMs` is the one
   symbol from the old SDK that's still called (kept per task 3, display-only now). Report (do not
   touch) that `supabaseAdmin.rpc("backup_23_tables")` is now unused — the SQL function itself stays
   in the DB untouched (shared-DB SQL changes are Nikita's call only, matching plan-09's established
   rule), just flag it in the doc as unused. STOP for review.

6. **Rewrite `dev_readme-backup.md`.** Same structure as today's doc (What's in the archive / Files
   table / Export flow / Import flow / Security / Cross-DB restore caveat) but describing the new
   two-flow architecture — mirror spotify's `dev_readme-backup.md` content/tone where it applies
   (e.g. why bytes never touch a Vercel function), not its literal per-user text (23_store has no
   per-user scoping to explain). Note in the doc that `backup_23_tables()` is no longer called by
   this feature. Update `plan-00-tracker.md`'s "DEV_README inconsistencies audit" row for
   `dev_readme-backup.md`'s stale 5-vs-7-table claim — this plan makes it moot (the whole file is
   rewritten), close that row. STOP for review.

7. **Lint + type-check pass.** `pnpm install` (no `node_modules` yet in this checkout), then
   `pnpm lint` and `pnpm type-check` on the whole repo, not just touched files (new/changed exports
   can surface `type-naming-prefix`/`imports-order` issues in files that import them). Fix every
   error; drive warnings on touched files to zero where reasonable (`no-explicit-any` is `warn` with
   `--max-warnings=-1`, so it won't fail `pnpm build`, but match the rest of the codebase's standard
   rather than leaving avoidable `any`). Validate the full diff line-by-line against
   `dev_readme-code-patterns.md` (all 15 rules + banned words) and `good-bad-examples.md` per
   plan-00-tracker rule 3. STOP for review — this is the last task, so also confirm with Nikita
   whether he wants a live click-through (export tables, export files, import both back) before
   calling the plan done, since no live Supabase run happens automatically in this environment.

<br/>

## Decisions made (do not re-open)

- Full architecture swap, not a partial merge — the old streaming/chunking/RPC path is deleted, not
  kept as a fallback.
- Admin-only gate stays exactly `requireAdmin()` as it exists today; no per-row/per-file scoping is
  introduced (23_store has no per-user data model in these tables).
- `backup_23_tables()` SQL function is left in the DB, unused, not dropped — SQL changes on shared
  infrastructure need Nikita's explicit sign-off (same rule as plan-09).
- UI framework stays 23_store's own (`ModalQueryContainer`, `Button`, `ProgressBar`, `useToast`,
  `useScopedI18n`) — only the underlying SDK/route architecture is replaced, not the whole UI layer
  torn out and replaced with spotify's raw components.
- SDK stays a `BaseSDK`-extending class (this codebase's convention) with 4 methods, not spotify's
  free-function module.
- The speed probe and byte-accurate progress are explicit Nikita asks, kept from the current build
  even though spotify's own version has neither — the speed probe changes from "sizes chunks" to
  "display-only", and progress changes from spotify's file-count-only to byte-accurate for the files
  flow specifically (tables stay count-based, bytes aren't meaningful there).

## Code patterns to follow

- `dev_readme-code-patterns.md` — all 15 rules, especially #13 (no vague names), #14 (banned words,
  `error` severity — this is the one that can hard-fail `pnpm lint`), #15 (no functions in deps).
- `good-bad-examples.md` — `<fnName>Resp` / `response` naming, no vague `results` in hook/store
  state, ref pattern for any function that would otherwise sit in a `useCallback` deps array.
- `eslint-local-rules/type-naming-prefix.js` — every new exported `type` needs a `T` prefix (no
  `interface`s in this feature, matching the existing `backupTables.ts` style).
- Read `19_spotify-clone/app/features/backup/dev_readme-backup.md` for the architecture reference —
  it already documents a 3rd, similarly-shaped port (`26_hot-delivery`, admin-gated, no per-row
  scoping) that's the closest precedent to what 23_store needs.

➡️ No next plan queued after this one — return to [plan-00-tracker.md](plan-00-tracker.md) for the
next P1/P2 item.
