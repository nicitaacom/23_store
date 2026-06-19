import { NextResponse } from "next/server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { requireAdmin } from "../requireAdmin"
import { BACKUP_BUCKETS, BackupFileRef, estimateExportMs, listBucketObjects } from "../backupTables"

export const runtime = "nodejs"
export const maxDuration = 60

// Budget below the Vercel Hobby 60s cap; over this the client splits export into two halves.
const SPLIT_THRESHOLD_MS = 50_000

// Pre-flight: list storage objects (no downloads) and estimate export time so the client
// can decide whether to fetch the backup in one request or as two halves (front + back).
export async function GET() {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  const refs: BackupFileRef[] = []
  for (const bucket of BACKUP_BUCKETS) {
    refs.push(...(await listBucketObjects(supabaseAdmin.storage, bucket)))
  }

  const estimatedMs = estimateExportMs(refs)

  return NextResponse.json(
    {
      fileCount: refs.length,
      totalBytes: refs.reduce((sum, r) => sum + r.size, 0),
      estimatedMs,
      shouldSplit: estimatedMs > SPLIT_THRESHOLD_MS,
    } satisfies API.BackupManifestResponse,
    { headers: { "Cache-Control": "no-store" } },
  )
}
