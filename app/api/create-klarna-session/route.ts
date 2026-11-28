import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "Direct Klarna checkout is not configured." },
    { status: 503 },
  )
}
