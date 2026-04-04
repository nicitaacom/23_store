import { NextResponse } from "next/server"
import { trackUTMVisit } from "./trackUTMVisit"

export async function POST(req: Request) {
  const { userId, searchParams = {} } = (await req.json()) as API.UTMTrackVisitRequest

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId missing" } satisfies { error: string }, { status: 400 })
  }

  try {
    const result = await trackUTMVisit(userId, searchParams)
    return NextResponse.json(result satisfies API.UTMTrackVisitResponse, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) } satisfies { error: string },
      { status: 500 },
    )
  }
}
