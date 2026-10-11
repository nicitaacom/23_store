import { NextRequest, NextResponse } from "next/server"

import { authorizeStorageCleanup, runStorageCleanup } from "@/libs/storage/cleanup"
import { storageFailure } from "@/libs/storage/authorization"

export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: NextRequest) {
  if (!authorizeStorageCleanup(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { mode, start } = await request.json() as { mode?: string; start?: boolean }
    if (mode && !["guests", "staging", "both"].includes(mode)) return NextResponse.json({ error: "Invalid cleanup mode" }, { status: 400 })
    if (mode === "both") return NextResponse.json({ guests: await runStorageCleanup(false, start === true), staging: await runStorageCleanup(true, start === true) })
    return NextResponse.json(await runStorageCleanup(mode === "staging", start === true))
  } catch (error) { return storageFailure(error) }
}
