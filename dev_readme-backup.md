# 🗄️ DB Backup & Restore (ADMIN only)

ADMIN-only feature to export the whole project as a `.tar.gz` and import it back. It backs up **both**
the `23_` Postgres tables **and** the Storage bucket files (table rows only hold image paths — the actual
images live in Storage, so a real backup must include them).

- Trigger: avatar dropdown → **DB Backup** item, visible only when `role === "ADMIN"`.
- Modal: `DbBackupModal` opened via `?modal=DbBackup`.

<br/>

## What's in the archive

A `.tar.gz` contains:

```
23_users.json                  # one <table>.json per backed-up table
23_users_cart.json
23_products.json
23_tickets.json
23_messages.json
storage-content-types.json     # mime type per stored file (so import restores the right contentType)
storage/23_public-images/<...> # raw bytes of every object in each bucket
storage/23_avatar-images/<...>
```

- **Tables** (`BACKUP_TABLES`, FK-safe order): `23_users → 23_users_cart → 23_products → 23_tickets → 23_messages`.
  `utm_stats` is **excluded** — it is shared across projects 14/23/28/29.
- **Buckets** (`BACKUP_BUCKETS`, mirrors `app/ts/types/TBuckets.ts`): `23_public-images`, `23_avatar-images`.

<br/>

## Files

| Area | File |
| --- | --- |
| Tables/buckets config, archive build/parse, estimate, split | `app/api/backup/backupTables.ts` |
| ADMIN gate (string error or null) | `app/api/backup/requireAdmin.ts` |
| Pre-flight estimate (list only, no download) | `app/api/backup/manifest/route.ts` |
| Export (streams live progress, supports `?half`) | `app/api/backup/export/route.ts` |
| Import (upsert rows + re-upload files) | `app/api/backup/import/route.ts` |
| Client SDK (manifest, export w/ progress, import w/ XHR progress) | `app/sdk/BackupSDK/BackupSDK.ts` |
| Hook (owns state, progress, download/upload) | `app/components/ui/Modals/DbBackup/hooks/useDbBackup.ts` |
| Modal UI (buttons, progress bars, results) | `app/components/ui/Modals/DbBackup/DbBackupModal.tsx` |
| Response types | `app/ts/namespaces/api/backup/api.d.ts` |
| Backup SQL function | `dev_readme-supbase-sql.md` → `backup_23_tables()` |

<br/>

## Required DB function

Export reads all table rows in one call via `supabaseAdmin.rpc("backup_23_tables")`. This RPC must exist
in Supabase — see the **DB BACKUP FUNCTION** section in `dev_readme-supbase-sql.md` (`SECURITY DEFINER`,
execute granted to `service_role` only; the route enforces ADMIN before calling).

<br/>

## Export flow (live progress)

The heavy work (downloading every file + gzipping) happens **server-side**, so a download-bytes bar can't
reflect it. Instead the export route **streams NDJSON** and reports progress per file as it packs them.

```
client: getManifest()  ->  { fileCount, totalBytes, estimatedMs, shouldSplit }
        |
        |  shouldSplit === false (estimate <= 50s)
        └─ GET /api/backup/export            (NDJSON stream)
              {"type":"progress","done":0,"total":340}
              {"type":"progress","done":1,"total":340}
              ...
              {"type":"done","fileName":"...","archive":"<base64 .tar.gz>"}
           -> client decodes base64 -> downloads one 23_backup-<date>.tar.gz
```

`onProgress(done/total)` drives the `ProgressBar` so the user sees real per-file progress (not 0→100).

> Progress is measured in **file count**, not bytes — many small files move smoothly, one huge file pauses
> the bar. `BackupFileRef.size` is available if byte-accurate progress is needed later.

<br/>

## Vercel 60s timeout → split into halves

Vercel Hobby caps a request at 60s (`export const maxDuration = 60`). If the manifest estimates the export
would exceed ~50s (`SPLIT_THRESHOLD_MS`), the client downloads the backup as **two halves in parallel**,
each bounded to ~half the bytes so both stay under the cap:

```
GET /api/backup/export?half=front   # tables + first ~half of files (by cumulative size)
GET /api/backup/export?half=back    # second ~half of files only (no tables — front carries them)
-> user gets 23_backup-<date>-front.tar.gz AND 23_backup-<date>-back.tar.gz  (keep BOTH)
```

`splitRefsByHalf()` splits the file list at the cumulative-size midpoint; `estimateExportMs()` assumes
~8 MB/s throughput + 40ms/file overhead. Tune `THROUGHPUT_BYTES_PER_MS` / `SPLIT_THRESHOLD_MS` in
`backupTables.ts` once real timings are known.

<br/>

## Import flow (append & replace-on-conflict — NOT override)

Upload one or both parts (the file input is `multiple`; parts import sequentially). Nothing is wiped:

- **Rows**: `upsert` on each table's PK → existing rows replaced, new rows added, missing rows untouched.
  - Rows with empty/invalid UUID values are **skipped** (reported as `skipped`) so one bad row can't fail
    the whole table with a `22P02 text = uuid` error.
- **Files**: `storage.upload(path, body, { upsert: true })` → existing path overwritten, new files added.

Per-part result is shown in the modal: `<table> → N rows (M skipped)` and `<bucket> → N files (M failed)`.
Upload progress uses `XMLHttpRequest` (`xhr.upload.onprogress`) because `fetch` cannot report upload progress.

> The upload bar reflects browser→server transfer only. After it hits 100%, the server still upserts rows
> and re-uploads files to Storage before the success toast — so a brief "stuck at ~100%" is expected.

<br/>

## Security

- Every route (`manifest`, `export`, `import`) is gated by `requireAdmin()` — returns 401 (unauthenticated)
  or 403 (not ADMIN). Non-admins hitting the routes directly are rejected.
- All DB/Storage access uses `supabaseAdmin` (service role), which bypasses RLS — bucket policies do not
  affect export/import.

<br/>

## Cross-DB restore caveat

`23_users.id`, `23_users_cart.id`, `23_products.owner_id` are UUID with FK to `auth.users`. Importing a
backup into a **different/fresh** Supabase project whose `auth.users` is empty will fail those rows on the FK
(reported per-table, not crashing). For same-project restore it works fine. `23_tickets.owner_id` and
`23_messages.sender_id` are TEXT (anonymous) with no auth FK, so they always restore.
