import { NextResponse } from "next/server"
import { selectDBUTMStats } from "./selectDBUTMStats"

export async function GET() {
  const result = await selectDBUTMStats()

  if (typeof result === "string") {
    return NextResponse.json({ error: result } satisfies { error: string }, { status: 500 })
  }

  return NextResponse.json(result satisfies API.UTMSelectDBStatsResponse, { status: 200 })
}
