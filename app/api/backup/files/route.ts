import { NextResponse } from "next/server"

import { requireAdmin } from "../requireAdmin"
import { BACKUP_BUCKETS, isBackupBucket, listFiles } from "../backupTables"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// GET /api/backup/files
//
// Returns every stored file's bucket/path/size/contentType — paths and sizes only, never Storage
// bytes. The browser downloads each file directly from Supabase's public CDN and packs them into
// one .tar.gz (see app/sdk/BackupSDK/BackupSDK.ts's exportFiles). Sizes drive the byte-accurate
// progress bar (23 MB / 230 MB), not just a file count.
export async function GET() {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  try {
    const files = await listFiles(supabaseAdmin)
    return NextResponse.json({ files } satisfies API.BackupFilesGetResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message } satisfies API.BackupFilesGetResponse, { status: 500 })
  }
}

type TFileRequest = { bucket?: string; path?: string }
type TFilesPostBody = { files?: TFileRequest[] }

const MAX_FILES_PER_REQUEST = 100

// POST /api/backup/files  { files: [{ bucket, path }] }
//
// The browser has decompressed + parsed the .tar.gz locally and asks for a signed upload URL per
// storage file. This schema has no per-file owner column, so bucket membership (isBackupBucket) is
// the whole boundary — requireAdmin() already gated the whole request. upsert is baked into the
// token so a re-import overwrites the existing object. The browser then PUTs each file's bytes
// directly to Supabase — bytes never pass through this function, so there is no memory/timeout
// ceiling on file size or count.
export async function POST(request: Request) {
  const { files } = (await request.json().catch(() => ({}))) as TFilesPostBody

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "files must be a non-empty array" } satisfies API.BackupFilesPostResponse, { status: 400 })
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `at most ${MAX_FILES_PER_REQUEST} files per request` } satisfies API.BackupFilesPostResponse,
      { status: 400 },
    )
  }

  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  const results: API.BackupUploadDestination[] = []
  for (const file of files) {
    const bucket = file.bucket
    const path = file.path
    if (!bucket || !isBackupBucket(bucket) || !path) {
      results.push({ bucket: bucket ?? "", path: path ?? "", skipped: true, reason: `invalid path — bucket must be one of ${BACKUP_BUCKETS.join(", ")}` })
      continue
    }

    const { data, error: urlError } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path, { upsert: true })
    if (urlError || !data) {
      results.push({ bucket, path, skipped: true, reason: urlError?.message ?? "could not create upload URL" })
      continue
    }
    results.push({ bucket, path, signedUrl: data.signedUrl })
  }

  return NextResponse.json({ results } satisfies API.BackupFilesPostResponse)
}
