import { headers } from "next/headers"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"
import { getCountryNameFromCode } from "@/utils/utmVisitMetadata"
import { insertDBUTMVisitAction } from "@/actions/insertDBUTMVisitAction"

const redis = Redis.fromEnv()
const utmVisitRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(RATE_LIMITS.utmVisit.maxAllowed, `${RATE_LIMITS.utmVisit.windowSec} s`),
  analytics: false,
})
const utmVisitIpRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(RATE_LIMITS.utmVisitIp.maxAllowed, `${RATE_LIMITS.utmVisitIp.windowSec} s`),
  analytics: false,
})

function extractUTMParams(searchParams: Record<string, string | undefined> = {}) {
  return {
    utm_source: searchParams.utm_source,
    utm_medium: searchParams.utm_medium,
    utm_campaign: searchParams.utm_campaign,
    utm_term: searchParams.utm_term,
    utm_content: searchParams.utm_content,
  }
}

export async function trackUTMVisit(userId: string | undefined, searchParams: Record<string, string | undefined> = {}) {
  if (!userId) return { tracked: false } satisfies API.UTMTrackVisitResponse

  const requestHeaders = headers()
  const utmParams = extractUTMParams(searchParams)
  const hasUTMParams = Object.values(utmParams).some(param => param !== undefined)
  const today = new Date().toISOString().slice(0, 10)
  const clientIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "127.0.0.1"
  const [{ success: userLimitAllowed }, { success: ipLimitAllowed }] = await Promise.all([
    utmVisitRateLimiter.limit(`${RATE_LIMITS.utmVisit.key(userId)}:${today}`),
    utmVisitIpRateLimiter.limit(`${RATE_LIMITS.utmVisitIp.key(clientIp)}:${today}`),
  ])

  if (!userLimitAllowed || !ipLimitAllowed) {
    return { tracked: false } satisfies API.UTMTrackVisitResponse
  }

  const finalParams = hasUTMParams
    ? utmParams
    : {
        utm_source: "organic",
        utm_medium: "direct",
        utm_campaign: undefined,
        utm_term: undefined,
        utm_content: undefined,
      }

  const countryCode = requestHeaders.get("x-vercel-ip-country")?.toUpperCase() || null
  const insertDBUTMVisitResponse = await insertDBUTMVisitAction(userId, finalParams, {
    userAgent: requestHeaders.get("user-agent") ?? "unknown",
    countryCode,
    country: getCountryNameFromCode(countryCode),
    region: requestHeaders.get("x-vercel-ip-country-region"),
    city: requestHeaders.get("x-vercel-ip-city"),
  })

  if (typeof insertDBUTMVisitResponse === "string") {
    throw new Error(insertDBUTMVisitResponse)
  }

  return { tracked: true } satisfies API.UTMTrackVisitResponse
}
