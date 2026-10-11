import { NextRequest, NextResponse } from "next/server"

import { checkStorageOrigin, setStorageVisitorCookie, storageFailure, StorageRequestError, verifyStorageActor } from "@/libs/storage/authorization"
import { getRequestIp } from "@/utils/requestIp"
import { limitStorageUploads } from "@/libs/storage/state"
import { prepareStorageUpload } from "@/libs/storage/uploads"

export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  try {
    checkStorageOrigin(request)
    const input = await request.json() as API.StoragePrepareRequest
    if (!input || typeof input !== "object") throw new StorageRequestError("Invalid upload request")
    const actor = await verifyStorageActor(request, input.bucket === "23_support-guest-images")
    if (!await limitStorageUploads(actor.id, getRequestIp(request.headers) ?? "local", actor.guest)) throw new StorageRequestError("Upload rate limit exceeded", 429)
    const destination = await prepareStorageUpload(actor, input)
    return setStorageVisitorCookie(NextResponse.json(destination satisfies API.StoragePrepareResponse), actor)
  } catch (error) { return storageFailure(error) }
}
