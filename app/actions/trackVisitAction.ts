"use server"

import { headers } from "next/headers"

import { TTrackVisitResult } from "@/ts/types/TTrackVisitResult"
import { createDeviceId, decodeDeviceId, encodeDeviceId, isValidDeviceId } from "@/utils/deviceId"
import { decryptDeviceId, DEVICE_ID_COOKIE_NAME, encryptDeviceId } from "@/utils/deviceIdCookie"
import { getCookie, setCookie } from "@/utils/helpersSSR"
import { getCountryNameFromCode, IUTMVisitMetadata } from "@/utils/utmVisitMetadata"
import {
  getRedisDeviceIdByFingerprint,
  getRedisDeviceIdByIp,
  getRedisDeviceIdByUserId,
  getRedisDeviceIdOwner,
  setRedisDeviceIdByFingerprint,
  setRedisDeviceIdByIp,
  setRedisDeviceIdByUserId,
  setRedisDeviceIdOwner,
} from "@/libs/deviceIdRedis"
import { getRequestIp, isTrustworthyIp } from "@/utils/requestIp"
import { getUser } from "@/actions/getUser"
import { getVisitorDayEnd, getVisitorDayStart } from "@/utils/visitorDayBounds"
import { insertDBUTMVisitAction } from "@/actions/insertDBUTMVisitAction"
import supabaseServer from "@/libs/supabase/supabaseServer"

interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

type SyncDeviceIdLayersParams = {
  deviceId: string
  userId: string | null
  cookieDeviceId: string | null
  trustworthyIp: string | null
  fingerprint: string | null
  visitorDayEnd: Date
}

function extractUTMParams(searchParams: { [key: string]: string | undefined } = {}): UTMParams {
  return {
    utm_source: searchParams.utm_source,
    utm_medium: searchParams.utm_medium,
    utm_campaign: searchParams.utm_campaign,
    utm_term: searchParams.utm_term,
    utm_content: searchParams.utm_content,
  }
}

async function getVisitMetadata(): Promise<IUTMVisitMetadata> {
  const requestHeaders = await headers()
  const countryCode = requestHeaders.get("x-vercel-ip-country") || requestHeaders.get("cf-ipcountry")

  return {
    userAgent: requestHeaders.get("user-agent"),
    countryCode,
    country: getCountryNameFromCode(countryCode),
    region: requestHeaders.get("x-vercel-ip-country-region"),
    city: requestHeaders.get("x-vercel-ip-city"),
  }
}

/** The signed-in account, read from the verified session - never a value the browser sent. */
async function getSessionUserId(): Promise<string | null> {
  try {
    const getUserResp = await getUser()

    return getUserResp?.id ?? null
  } catch {
    return null
  }
}

/**
 * Layers 0-3, tried in order, first answer wins: the signed-in account, then localStorage (the
 * transport form the browser sent), then the httpOnly cookie, then the IP -> deviceId Redis key.
 * Every candidate goes through `isValidDeviceId`, so an edited localStorage value falls through
 * exactly as an empty one would.
 *
 * The account goes first because it is the only exact signal here - the session already proved who
 * this is, while localStorage, the cookie and the IP each only suggest it. So a person who clears
 * site data on every visit, or signs in on a machine they have never used, keeps the deviceId their
 * account already had instead of being counted as somebody new.
 */
async function resolveDeviceIdBeforeFingerprint(
  userId: string | null,
  storedDeviceId: string | null,
  cookieDeviceId: string | null,
  trustworthyIp: string | null,
): Promise<string | null> {
  if (userId) {
    const getRedisDeviceIdByUserIdResp = await getRedisDeviceIdByUserId(userId)
    if (getRedisDeviceIdByUserIdResp && isValidDeviceId(getRedisDeviceIdByUserIdResp)) return getRedisDeviceIdByUserIdResp
  }

  const clientDeviceId = storedDeviceId ? decodeDeviceId(storedDeviceId) : null
  if (clientDeviceId && isValidDeviceId(clientDeviceId)) return clientDeviceId
  if (cookieDeviceId && isValidDeviceId(cookieDeviceId)) return cookieDeviceId
  if (!trustworthyIp) return null

  const getRedisDeviceIdByIpResp = await getRedisDeviceIdByIp(trustworthyIp)

  return getRedisDeviceIdByIpResp && isValidDeviceId(getRedisDeviceIdByIpResp) ? getRedisDeviceIdByIpResp : null
}

/** Layer 4 - the fingerprint -> deviceId Redis key, reached only after layers 1-3 all missed. */
async function resolveDeviceIdFromFingerprint(fingerprint: string): Promise<string | null> {
  const getRedisDeviceIdByFingerprintResp = await getRedisDeviceIdByFingerprint(fingerprint)
  if (!getRedisDeviceIdByFingerprintResp || !isValidDeviceId(getRedisDeviceIdByFingerprintResp)) return null

  return getRedisDeviceIdByFingerprintResp
}

/**
 * One device belongs to one account. Two people signing in on the same shared browser both resolve
 * the same deviceId - correct, the machine is one visitor - but only the account that claimed it
 * keeps a layer 0 mapping to it. Without this the second person's own phone would resolve the first
 * person's deviceId, and hold it for 30 days.
 */
async function claimDeviceIdForAccount(userId: string, deviceId: string): Promise<void> {
  const getRedisDeviceIdOwnerResp = await getRedisDeviceIdOwner(deviceId)
  if (getRedisDeviceIdOwnerResp && getRedisDeviceIdOwnerResp !== userId) return

  await setRedisDeviceIdOwner(deviceId, userId)
  await setRedisDeviceIdByUserId(userId, deviceId)
}

/**
 * Re-points every layer at the winning id: the account key (skipped for a signed-out visitor, and
 * for a device another account already claimed), the IP key (skipped for an untrustworthy IP), the
 * fingerprint key (skipped when no fingerprint was sent, which is every layer 0-3 hit), and the
 * cookie - re-set only when the existing one decrypts to a different id.
 */
async function syncDeviceIdLayers({
  deviceId,
  userId,
  cookieDeviceId,
  trustworthyIp,
  fingerprint,
  visitorDayEnd,
}: SyncDeviceIdLayersParams): Promise<void> {
  if (userId) await claimDeviceIdForAccount(userId, deviceId)
  if (trustworthyIp) await setRedisDeviceIdByIp(trustworthyIp, deviceId, visitorDayEnd)
  if (fingerprint) await setRedisDeviceIdByFingerprint(fingerprint, deviceId)
  if (cookieDeviceId === deviceId) return

  await setCookie(DEVICE_ID_COOKIE_NAME, encryptDeviceId(deviceId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: visitorDayEnd,
    path: "/",
  })
}

/** One row per deviceId per visitor day - a second visit inside the same day adds nothing. */
async function insertDBVisitOncePerDay(
  deviceId: string,
  searchParams: { [key: string]: string | string[] | undefined },
  pageUrl: string | undefined,
  visitorDayStart: Date,
): Promise<void> {
  const normalizedSearchParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
  const utmParams = extractUTMParams(normalizedSearchParams)
  const hasUTMParams = Object.values(utmParams).some(param => param !== undefined)
  const supabase = await supabaseServer()

  const { data: recentVisit } = await supabase
    .from("utm_stats")
    .select("id, created_at")
    .eq("user_id", deviceId)
    .gte("created_at", visitorDayStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentVisit) return

  const finalParams = hasUTMParams
    ? utmParams
    : {
        utm_source: "organic",
        utm_medium: "direct",
        utm_campaign: undefined,
        utm_term: undefined,
        utm_content: undefined,
      }

  await insertDBUTMVisitAction(deviceId, finalParams, await getVisitMetadata(), pageUrl || null)
}

/**
 * Attributes one visit to one deviceId, resolved through 5 layers (see
 * `app/[locale]/(site)/stats/dev_readme-device-id.md`), and records at most one `utm_stats` row per
 * deviceId per visitor day.
 *
 * Called twice at most. The browser has no way to tell whether layers 0, 2 and 3 hit - the account
 * and IP mappings sit in Redis and the cookie is httpOnly - so the server asks for a fingerprint only
 * when it needs one, and the `fingerprint` argument ends the exchange: `null` means "not computed
 * yet, ask me", `""` means "computed and the browser gave nothing", so a new id is minted instead of
 * asking twice.
 */
export async function trackVisitAction(
  storedDeviceId: string | null,
  searchParams: { [key: string]: string | string[] | undefined } = {},
  pageUrl?: string,
  timezone?: string,
  fingerprint: string | null = null,
): Promise<TTrackVisitResult> {
  const requestHeaders = await headers()
  const requestIp = getRequestIp(requestHeaders)
  const trustworthyIp = isTrustworthyIp(requestIp) ? requestIp : null
  const encryptedDeviceIdCookie = await getCookie(DEVICE_ID_COOKIE_NAME)
  const cookieDeviceId = decryptDeviceId(encryptedDeviceIdCookie)
  const getSessionUserIdResp = await getSessionUserId()

  const resolvedDeviceId = await resolveDeviceIdBeforeFingerprint(
    getSessionUserIdResp,
    storedDeviceId,
    cookieDeviceId,
    trustworthyIp,
  )
  if (!resolvedDeviceId && fingerprint === null) return { needsFingerprint: true }

  const fingerprintDeviceId = resolvedDeviceId || !fingerprint ? null : await resolveDeviceIdFromFingerprint(fingerprint)
  const deviceId = resolvedDeviceId ?? fingerprintDeviceId ?? createDeviceId()
  const visitorDayEnd = getVisitorDayEnd(timezone)

  await syncDeviceIdLayers({
    deviceId,
    userId: getSessionUserIdResp,
    cookieDeviceId,
    trustworthyIp,
    fingerprint,
    visitorDayEnd,
  })
  await insertDBVisitOncePerDay(deviceId, searchParams, pageUrl, getVisitorDayStart(timezone))

  return { storedDeviceId: encodeDeviceId(deviceId) }
}
