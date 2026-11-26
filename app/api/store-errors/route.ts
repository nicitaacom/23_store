import { createHash } from "node:crypto"
import { after, NextResponse } from "next/server"

import { reportErrorToast } from "@/libs/storeAlerts"
import { getRequestIp, isTrustworthyIp } from "@/utils/requestIp"

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const host = request.headers.get("host") ?? requestUrl.host
  const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.slice(0, -1)
  const origin = request.headers.get("origin")
  if (origin !== `${protocol}://${host}`) return new NextResponse(null, { status: 403 })

  const fingerprint = await request.text()
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) return new NextResponse(null, { status: 400 })

  const ip = getRequestIp(request.headers)
  if (isTrustworthyIp(ip)) {
    const clientKey = createHash("sha256").update(ip).digest("hex")
    after(() => reportErrorToast(fingerprint, clientKey))
  }
  return new NextResponse(null, { status: 204 })
}
