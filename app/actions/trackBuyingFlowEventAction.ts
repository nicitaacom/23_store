"use server"

import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

import { IBuyingFlowEventInput } from "@/ts/interfaces/IBuyingFlowEventInput"
import { TBuyingFlowEvent } from "@/ts/types/TBuyingFlowEvent"
import { decodeDeviceId, isValidDeviceId } from "@/utils/deviceId"
import { decryptDeviceId, DEVICE_ID_COOKIE_NAME } from "@/utils/deviceIdCookie"
import { getCookie } from "@/utils/helpersSSR"
import supabaseServer from "@/libs/supabase/supabaseServer"
import { BUYING_FLOW_CAPS, CHECKOUT_KINDS, TCheckoutKind } from "@/config/buyingFlowConfig"
import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"

const BUYING_FLOW_EVENTS: TBuyingFlowEvent[] = [
  "product_view",
  "add_to_cart",
  "cart_open",
  "checkout_click",
  "order_placed",
  "search",
]
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let buyingFlowRateLimiter: Ratelimit | null = null

function getBuyingFlowRateLimiter(): Ratelimit {
  if (buyingFlowRateLimiter) return buyingFlowRateLimiter

  buyingFlowRateLimiter = new Ratelimit({
    redis: new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }),
    limiter: Ratelimit.fixedWindow(
      RATE_LIMITS.buyingFlowEvent.maxAllowed,
      `${RATE_LIMITS.buyingFlowEvent.windowSec} s`,
    ),
    analytics: false,
  })

  return buyingFlowRateLimiter
}

function isBuyingFlowEvent(event: unknown): event is TBuyingFlowEvent {
  return typeof event === "string" && BUYING_FLOW_EVENTS.includes(event as TBuyingFlowEvent)
}

function isCheckoutKind(checkoutKind: unknown): checkoutKind is TCheckoutKind {
  return typeof checkoutKind === "string" && CHECKOUT_KINDS.includes(checkoutKind as TCheckoutKind)
}

function getInputError(input: IBuyingFlowEventInput): string | null {
  if (!isBuyingFlowEvent(input.event)) return "unknown event"
  if (input.checkoutKind !== undefined && !isCheckoutKind(input.checkoutKind)) return "unknown checkout kind"
  if (input.event === "checkout_click" && !input.checkoutKind) return "checkout kind is required"
  if (input.storedDeviceId !== null && typeof input.storedDeviceId !== "string") return "stored device id is invalid"
  if (input.searchQuery !== undefined && typeof input.searchQuery !== "string") return "search query is invalid"
  if (input.event === "search" && (!input.searchQuery || !input.searchQuery.trim())) return "search query is required"
  if (input.searchQuery && input.searchQuery.length > BUYING_FLOW_CAPS.searchQuery) return "search query is too long"
  if (input.productId !== undefined && typeof input.productId !== "string") return "product id is invalid"
  if (input.productId && input.productId.length > BUYING_FLOW_CAPS.productId) return "product id is too long"
  if (typeof input.pageUrl !== "string" || input.pageUrl.length > BUYING_FLOW_CAPS.url) return "page URL is invalid"
  if (typeof input.sessionId !== "string" || !SESSION_ID_PATTERN.test(input.sessionId)) return "session id is invalid"
  if (typeof input.locale !== "string" || !input.locale.trim() || input.locale.length > 20) return "locale is invalid"
  if (
    input.resultsCount !== undefined &&
    (!Number.isInteger(input.resultsCount) || input.resultsCount < 0 || input.resultsCount > 10000)
  )
    return "results count is invalid"

  try {
    new URL(input.pageUrl)
  } catch {
    return "page URL is invalid"
  }

  return null
}

async function resolveVisitorId(storedDeviceId: string | null): Promise<string | null> {
  const cookieDeviceId = decryptDeviceId(await getCookie(DEVICE_ID_COOKIE_NAME))
  if (cookieDeviceId && isValidDeviceId(cookieDeviceId)) return cookieDeviceId

  const transportDeviceId = storedDeviceId ? decodeDeviceId(storedDeviceId) : null
  return transportDeviceId && isValidDeviceId(transportDeviceId) ? transportDeviceId : null
}

export async function trackBuyingFlowEventAction(input: IBuyingFlowEventInput): Promise<{ skipped: boolean }> {
  try {
    const inputError = getInputError(input)
    if (inputError) {
      console.info(`Buying-flow event skipped: ${inputError}`)
      return { skipped: true }
    }

    const visitorId = await resolveVisitorId(input.storedDeviceId)
    if (!visitorId) {
      console.info("Buying-flow event skipped: visitor id is missing")
      return { skipped: true }
    }

    const { success } = await getBuyingFlowRateLimiter().limit(RATE_LIMITS.buyingFlowEvent.key(visitorId))
    if (!success) {
      console.info("Buying-flow event skipped: rate limit reached")
      return { skipped: true }
    }

    const supabase = await supabaseServer()
    const { error } = await supabase.from("23_buying_flow_events").insert({
      user_id: visitorId,
      session_id: input.sessionId,
      event: input.event,
      product_id: input.productId?.trim() || null,
      checkout_kind: input.checkoutKind || null,
      search_query: input.searchQuery?.trim() || null,
      results_count: input.resultsCount ?? null,
      url: input.pageUrl,
      locale: input.locale.trim(),
    })

    if (error) {
      console.info(`Buying-flow event skipped: ${error.message}`)
      return { skipped: true }
    }

    return { skipped: false }
  } catch (error) {
    console.info(`Buying-flow event skipped: ${error instanceof Error ? error.message : String(error)}`)
    return { skipped: true }
  }
}
