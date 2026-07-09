import { NextResponse } from "next/server"

import {
  BACKUP_CONFLICT_COLUMNS,
  BACKUP_TABLES,
  BackupFile,
  filterRowsByUuidColumns,
  parseBackupArchive,
} from "../backupTables"
import { requireAdmin } from "../requireAdmin"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"
export const maxDuration = 60 // re-uploading storage files can be slow; upload both halves separately if needed

export async function POST(request: Request) {
  const adminError = await requireAdmin()
  if (adminError)
    return NextResponse.json({ error: adminError } satisfies API.BackupImportResponse, {
      status: adminError === "Unauthorized" ? 401 : 403,
    })

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File))
    return NextResponse.json({ error: "No backup file provided" } satisfies API.BackupImportResponse, { status: 400 })

  let snapshot: Awaited<ReturnType<typeof parseBackupArchive>>["snapshot"]
  let files: BackupFile[]
  try {
    ;({ snapshot, files } = await parseBackupArchive(Buffer.from(await file.arrayBuffer())))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Invalid backup archive: ${message}` } satisfies API.BackupImportResponse, { status: 400 })
  }

  // Upsert in FK-safe order so parent rows exist before children reference them
  const results: API.BackupImportTableResult[] = []
  for (const table of BACKUP_TABLES) {
    const rawRows = snapshot[table] ?? []
    // Drop rows with empty/invalid uuid values so they can't fail the whole table with a 22P02 type error
    const { rows, skipped } = filterRowsByUuidColumns(table, rawRows)
    if (rows.length === 0) {
      results.push({ table, imported: 0, skipped: skipped || undefined })
      continue
    }

    const { error } = await supabaseAdmin.from(table).upsert(rows as never, { onConflict: BACKUP_CONFLICT_COLUMNS[table] })
    results.push({ table, imported: error ? 0 : rows.length, skipped: skipped || undefined, error: error?.message })
  }

  // Re-upload storage files (upsert overwrites existing objects at the same path).
  const buckets: API.BackupImportBucketResult[] = []
  const byBucket = new Map<string, BackupFile[]>()
  for (const f of files) byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f])

  for (const [bucket, bucketFiles] of byBucket) {
    let uploaded = 0
    let failed = 0
    for (const f of bucketFiles) {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(f.path, f.body, { contentType: f.contentType, upsert: true })
      if (error) failed += 1
      else uploaded += 1
    }
    buckets.push({ bucket, uploaded, failed: failed || undefined })
  }

  return NextResponse.json({ results, buckets } satisfies API.BackupImportResponse, { status: 200 })
}
