import { NextResponse } from "next/server"

import { TURNSTILE_COOKIE_MAX_AGE_SECONDS, TURNSTILE_COOKIE_NAME, TURNSTILE_COOKIE_VALUE } from "@/utils/turnstile"

type TVerifyTurnstileBody = {
  token?: string
}

type TTurnstileVerifyResponse = {
  success: boolean
  "error-codes"?: string[]
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as TVerifyTurnstileBody
  const token = body.token?.trim()

  if (!token) {
    return NextResponse.json({ success: false, error: "Missing Turnstile token" }, { status: 400 })
  }

  const formData = new URLSearchParams()
  formData.set("secret", process.env.TURNSTILE_SECRET_KEY)
  formData.set("response", token)

  const forwardedFor = request.headers.get("x-forwarded-for")
  const remoteIp = forwardedFor?.split(",")[0]?.trim()
  if (remoteIp) {
    formData.set("remoteip", remoteIp)
  }

  const verificationResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  })

  if (!verificationResponse.ok) {
    return NextResponse.json({ success: false, error: "Cloudflare Turnstile request failed" }, { status: verificationResponse.status })
  }

  const verificationResult = (await verificationResponse.json()) as TTurnstileVerifyResponse

  if (!verificationResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Cloudflare Turnstile verification failed",
        errorCodes: verificationResult["error-codes"] ?? [],
      },
      { status: 403 },
    )
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(TURNSTILE_COOKIE_NAME, TURNSTILE_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TURNSTILE_COOKIE_MAX_AGE_SECONDS,
  })

  return response
}
