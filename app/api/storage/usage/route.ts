import { NextResponse } from "next/server"

import { requireAdmin } from "@/api/backup/requireAdmin"
import { selectStorageUsage } from "@/libs/storage/usage"
import { storageFailure } from "@/libs/storage/authorization"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET() {
  const error = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 })
  try { return NextResponse.json(await selectStorageUsage() satisfies API.StorageUsageResponse) }
  catch (error) { return storageFailure(error) }
}
