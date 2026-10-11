import { NextRequest, NextResponse } from "next/server"

import { authorizeStoragePath, storageFailure, verifyStorageActor } from "@/libs/storage/authorization"
import { storageProvider } from "@/libs/storage/providers"
import { validateStorageReference } from "@/libs/storage/operations"

export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json() as API.StorageDownloadRequest
    validateStorageReference(reference)
    const actor = await verifyStorageActor(request)
    await authorizeStoragePath(actor, reference.bucket, reference.path)
    return NextResponse.json({ url: await storageProvider(reference.provider).signDownload(reference.bucket, reference.path) } satisfies API.StorageDownloadResponse)
  } catch (error) { return storageFailure(error) }
}
