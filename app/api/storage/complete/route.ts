import { NextRequest, NextResponse } from "next/server"

import { checkStorageOrigin, storageFailure, verifyStorageActor } from "@/libs/storage/authorization"
import { completeStorageUpload } from "@/libs/storage/uploads"

export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  try {
    checkStorageOrigin(request)
    const { uploadId } = await request.json() as API.StorageCompleteRequest
    const actor = await verifyStorageActor(request)
    return NextResponse.json(await completeStorageUpload(actor, uploadId) satisfies API.StorageCompleteResponse)
  } catch (error) { return storageFailure(error) }
}
