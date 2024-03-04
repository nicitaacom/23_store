import { setAnonymousId } from "@/actions/setAnonymousId"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  cookies().set("anonymousId", `anonymousId_${crypto.randomUUID()}`)

  return NextResponse.json({ status: 200 })
}
