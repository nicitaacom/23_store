import { NextResponse } from "next/server"

import { requireAdmin } from "../requireAdmin"
import { BACKUP_BUCKETS, BackupFileRef, listBucketObjects } from "../backupTables"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET() {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  const refs: BackupFileRef[] = []
  for (const bucket of BACKUP_BUCKETS) {
    refs.push(...(await listBucketObjects(supabaseAdmin.storage, bucket)))
  }

  const totalBytes = refs.reduce((sum, r) => sum + r.size, 0)

  return NextResponse.json(
    {
      fileCount: refs.length,
      totalBytes,
      // Only sizes are sent — paths are not needed client-side and would bloat the response.
      refSizes: refs.map(r => r.size),
    } satisfies API.BackupManifestResponse,
    { headers: { "Cache-Control": "no-store" } },
  )
}
