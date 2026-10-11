import { NextRequest, NextResponse } from "next/server"

import { relinkBackupStorageBatch } from "./batch"
import { checkStorageOrigin, storageFailure, verifyStorageActor } from "@/libs/storage/authorization"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Each ADMIN request handles one inventory, profile, table or authentication page.
export async function POST(request: NextRequest) {
  try {
    checkStorageOrigin(request)
    const actor = await verifyStorageActor(request)
    const body = await request.json() as API.BackupStorageRelinkRequest
    return NextResponse.json(await relinkBackupStorageBatch(actor, body))
  } catch (error) { return storageFailure(error) }
}
