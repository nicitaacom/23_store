"use server"

import { headers } from "next/headers"

import { getCountryNameFromCode, IUTMVisitMetadata } from "@/utils/utmVisitMetadata"
import { insertDBUTMVisitAction } from "@/actions/insertDBUTMVisitAction"
import supabaseServer from "@/libs/supabase/supabaseServer"

interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
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

export async function trackVisitAction(
  userId: string | undefined,
  searchParams: { [key: string]: string | string[] | undefined } = {},
  pageUrl?: string,
) {
  if (!userId) return

  const normalizedSearchParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
  const utmParams = extractUTMParams(normalizedSearchParams)
  const hasUTMParams = Object.values(utmParams).some(param => param !== undefined)
  const today = new Date().toISOString().split("T")[0]
  const supabase = await supabaseServer()

  const { data: recentVisit } = await supabase
    .from("utm_stats")
    .select("id, created_at")
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`)
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

  await insertDBUTMVisitAction(userId, finalParams, await getVisitMetadata(), pageUrl || null)
}
