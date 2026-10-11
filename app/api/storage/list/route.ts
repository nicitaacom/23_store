import { NextRequest, NextResponse } from "next/server"

import { activeStorageProvider } from "@/libs/storage/config"
import { authorizedStorageFolder, storageFailure, StorageRequestError, verifyStorageActor } from "@/libs/storage/authorization"
import { isStorageBucket } from "@/libs/storage/references"
import { storageProvider } from "@/libs/storage/providers"

export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  try {
    const input = await request.json() as API.StorageListRequest
    if (!isStorageBucket(input?.bucket)) throw new StorageRequestError("Invalid bucket")
    const actor = await verifyStorageActor(request)
    const folder = await authorizedStorageFolder(actor, input.bucket, input.entityId)
    const provider = storageProvider(activeStorageProvider())
    const page = await provider.list(input.bucket, folder, input.cursor ?? null)
    return NextResponse.json(page satisfies API.StorageListResponse)
  } catch (error) { return storageFailure(error) }
}
