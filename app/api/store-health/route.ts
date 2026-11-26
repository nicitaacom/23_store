import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { reportSupabaseOutage } from "@/libs/storeAlerts"

export const dynamic = "force-dynamic"

function authorizeCheck(header: string | null) {
  if (!process.env.CRON_SECRET || !header) return false
  const sent = Buffer.from(header)
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET}`)
  return sent.length === expected.length && timingSafeEqual(sent, expected)
}

export async function GET(request: Request) {
  if (!authorizeCheck(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    await reportSupabaseOutage(500)
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  let status = 0
  try {
    const response = await fetch(new URL("/rest/v1/23_products?select=id&limit=1", url), {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(7000),
    })
    status = response.status
    await response.body?.cancel()
    if (response.ok) return NextResponse.json({ ok: true, supabaseStatus: status })
  } catch {
    status = 0
  }

  await reportSupabaseOutage(status)
  return NextResponse.json({ ok: false, supabaseStatus: status }, { status: 503 })
}
