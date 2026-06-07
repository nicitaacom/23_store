import { NextResponse } from "next/server"
import { headers } from "next/headers"

// I need 2 - ask ChatGPT
//Ratelimit = @upstash/ratelimit
// It only works with @upstash/redis (REST client)
// OR
// "ioredis" only is exactly what @upstash/ratelimit.fixedWindow() does internally — just without the abstraction.
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

import { TRateLimiterName } from "@/sdk/RateLimitSDK/types/TRateLimiterName"
import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"

const limiterCache = new Map<string, Ratelimit>()
const redis = Redis.fromEnv()

export async function POST(req: Request) {
  const { limiterName, action, userTimezone, userId } = (await req.json()) as API.RateLimitRequest

  if (!limiterName || !userTimezone)
    return NextResponse.json(
      { error: `Something is missing \n limiterName: ${limiterName} \n userTimezone: ${userTimezone}` },
      { status: 400 },
    )

  // 1. get limiter (creates + caches)
  const rateLimiter = getRateLimiter(limiterName as TRateLimiterName)

  // 2. build limiter key (may throw if required value missing)
  let limiterKey: string
  try {
    limiterKey = getRateLimitKey({ userId, limiterName, action, userTimezone })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 })
  }

  if (!limiterCache.has(limiterName))
    return NextResponse.json({ error: `limiterCache doesn't include ${limiterName}` }, { status: 400 })

  /* -------- Rate limit setup ---------- */
  // on VPS you need to fetch IP instead of using this
  const reqHeaders = await headers()
  const ip = reqHeaders.get("x-real-ip") || reqHeaders.get("x-forwarded-for") || "127.0.0.1"
  const fullKey = `${ip}-${limiterKey}`

  function formatReset(reset: number, timezone: string) {
    const date = new Date(reset * 1000)
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date)
  }

  // ===== ACTION SWITCH =====
  if (action === "getRemaining") {
    const { remaining, reset } = await rateLimiter.getRemaining(fullKey)
    return NextResponse.json(
      {
        remaining,
        resetTime: formatReset(reset, userTimezone),
      },
      { status: 200 },
    )
  } else if (action === "rateLimit") {
    const { success, remaining, reset } = await rateLimiter.limit(fullKey)

    if (!success) {
      const retryAfter = Math.max(1, Math.floor((reset * 1000 - Date.now()) / 1000))
      return NextResponse.json(
        { error: `Please try again in ${retryAfter} seconds` },
        {
          status: 429,
          headers: { ["retry-after"]: `${retryAfter}` },
        },
      )
    }

    return NextResponse.json({ remaining, resetTime: formatReset(reset, userTimezone) }, { status: 200 })
  } else return NextResponse.json({ error: "action not recognized - use either rateLimit or getRemaining" }, { status: 400 })
}

function getRateLimitKey(payload: API.RateLimitRequest): string {
  const rateLimitDef = RATE_LIMITS[payload.limiterName as TRateLimiterName]
  if (!rateLimitDef) throw new Error(`Rate limit config not found for ${payload.limiterName}`)

  const keyBuilder = rateLimitDef.key as (() => string) | ((userId: string) => string)

  if (keyBuilder.length === 0) return (keyBuilder as () => string)()

  if (!payload.userId) throw new Error(`userId is required for limiter ${payload.limiterName}`)

  return (keyBuilder as (userId: string) => string)(payload.userId)
}

function getRateLimiter(rateLimiterName: TRateLimiterName) {
  if (limiterCache.has(rateLimiterName)) return limiterCache.get(rateLimiterName)!

  const spec = RATE_LIMITS[rateLimiterName]
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(spec.maxAllowed, `${spec.windowSec} s`),
    analytics: false,
  })

  limiterCache.set(rateLimiterName, limiter)
  return limiter
}
