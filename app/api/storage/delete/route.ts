import { NextRequest, NextResponse } from "next/server"

import { authorizeStoragePath, checkStorageOrigin, storageFailure, verifyStorageActor } from "@/libs/storage/authorization"
import { deleteStorageObject, validateStorageReference } from "@/libs/storage/operations"

export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  try {
    checkStorageOrigin(request)
    const { reference } = await request.json() as API.StorageDeleteRequest
    validateStorageReference(reference)
    const actor = await verifyStorageActor(request)
    await authorizeStoragePath(actor, reference.bucket, reference.path)
    await deleteStorageObject(reference)
    return NextResponse.json({ success: true })
  } catch (error) { return storageFailure(error) }
}
