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
  setRedisDeviceIdByFingerprint,
  setRedisDeviceIdByIp,
} from "@/libs/deviceIdRedis"
import { getRequestIp, isTrustworthyIp } from "@/utils/requestIp"
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

/**
 * Layers 1-3, tried in order, first answer wins: localStorage (the transport form the browser sent),
 * then the httpOnly cookie, then the IP -> deviceId Redis key. Every candidate goes through
 * `isValidDeviceId`, so an edited localStorage value falls through exactly as an empty one would.
 */
async function resolveDeviceIdFromStorageAndIp(
  storedDeviceId: string | null,
  cookieDeviceId: string | null,
  trustworthyIp: string | null,
): Promise<string | null> {
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
 * Re-points every layer at the winning id: the IP key (skipped for an untrustworthy IP), the
 * fingerprint key (skipped when no fingerprint was sent, which is every layer 1-3 hit), and the
 * cookie - re-set only when the existing one decrypts to a different id.
 */
async function syncDeviceIdLayers({
  deviceId,
  cookieDeviceId,
  trustworthyIp,
  fingerprint,
  visitorDayEnd,
}: SyncDeviceIdLayersParams): Promise<void> {
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
 * Attributes one visit to one deviceId, resolved through 4 layers (see
 * `app/[locale]/(site)/stats/dev_readme-utm.md`), and records at most one `utm_stats` row per
 * deviceId per visitor day.
 *
 * Called twice at most. The browser has no way to tell whether layers 2 and 3 hit - the cookie is
 * httpOnly and the IP mapping sits in Redis - so the server asks for a fingerprint only when it needs
 * one, and the `fingerprint` argument ends the exchange: `null` means "not computed yet, ask me",
 * `""` means "computed and the browser gave nothing", so a new id is minted instead of asking twice.
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

  const resolvedDeviceId = await resolveDeviceIdFromStorageAndIp(storedDeviceId, cookieDeviceId, trustworthyIp)
  if (!resolvedDeviceId && fingerprint === null) return { needsFingerprint: true }

  const fingerprintDeviceId = resolvedDeviceId || !fingerprint ? null : await resolveDeviceIdFromFingerprint(fingerprint)
  const deviceId = resolvedDeviceId ?? fingerprintDeviceId ?? createDeviceId()
  const visitorDayEnd = getVisitorDayEnd(timezone)

  await syncDeviceIdLayers({ deviceId, cookieDeviceId, trustworthyIp, fingerprint, visitorDayEnd })
  await insertDBVisitOncePerDay(deviceId, searchParams, pageUrl, getVisitorDayStart(timezone))

  return { storedDeviceId: encodeDeviceId(deviceId) }
}
