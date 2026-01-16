import { NextResponse } from "next/server"
import { headers } from "next/headers"

// I need 2 - ask ChatGPT
//Ratelimit = @upstash/ratelimit
// It only works with @upstash/redis (REST client)
// OR
// "ioredis" only is exactly what @upstash/ratelimit.fixedWindow() does internally — just without the abstraction.
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

import moment from "moment-timezone"
import { TRateLimiterName } from "@/sdk/RateLimitSDK/types/TRateLimiterName"
import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"

const limiterCache = new Map<string, Ratelimit>()
const redis = Redis.fromEnv()

export async function POST(req: Request) {
  const { limiterName, action, userTimezone } = (await req.json()) as API.RateLimitRequest

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
    limiterKey = getRateLimitKey({ limiterName, action, userTimezone })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 })
  }

  if (!limiterCache.has(limiterName))
    return NextResponse.json({ error: `limiterCache doesn't include ${limiterName}` }, { status: 400 })

  /* -------- Rate limit setup ---------- */
  // on VPS you need to fetch IP instead of using this
  const ip = headers().get("x-real-ip") || headers().get("x-forwarded-for") || "127.0.0.1"
  const fullKey = `${ip}-${limiterKey}`

  function formatReset(reset: number, timezone: string) {
    return moment(reset * 1000)
      .tz(timezone)
      .format("YYYY-MM-DD HH:mm:ss")
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
  } else
    return NextResponse.json({ error: "action not recognized - use either rateLimit or getRemaining" }, { status: 400 })
}

function getRateLimitKey(payload: API.RateLimitRequest) {
  const rateLimitDef = RATE_LIMITS[payload.limiterName as TRateLimiterName]

  try {
    // prefer explicit fields
    // if ("userId" in payload && (payload as any).userId) return rateLimitDef.key((payload as any).userId)
    // fallback to no-arg
    return rateLimitDef.key()
  } catch (error) {
    // def.key should throw helpful message if param is required
    throw error instanceof Error ? error : new Error("Failed to build rate limit key")
  }
}

function getRateLimiter(rateLimiterName: TRateLimiterName) {
  if (limiterCache.has(rateLimiterName)) return limiterCache.get(rateLimiterName)!

  const spec = RATE_LIMITS[rateLimiterName]
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(spec.maxAllowed, `${spec.windowSec} s`),
  })

  limiterCache.set(rateLimiterName, limiter)
  return limiter
}
