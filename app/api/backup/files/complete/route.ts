import { NextRequest, NextResponse } from "next/server"

import { checkStorageOrigin, storageFailure, verifyStorageActor } from "@/libs/storage/authorization"
import { completeBackupStorageUploads } from "@/libs/storage/uploads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Four files per request keep verification and provider-side copies bounded independently of archive size.
export async function POST(request: NextRequest) {
  try {
    checkStorageOrigin(request)
    const actor = await verifyStorageActor(request)
    const { uploadIds } = await request.json() as API.BackupFilesCompleteRequest
    const completeBackupStorageUploadsResp = await completeBackupStorageUploads(actor, uploadIds)
    return NextResponse.json({ results: completeBackupStorageUploadsResp } satisfies API.BackupFilesCompleteResponse)
  } catch (error) { return storageFailure(error) }
}
