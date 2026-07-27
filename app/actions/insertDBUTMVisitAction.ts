"use server"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { IUTMVisitMetadata, serializeUTMVisitMetadata } from "@/utils/utmVisitMetadata"

interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export async function insertDBUTMVisitAction(
  userId: string,
  utmParams: UTMParams,
  metadata: IUTMVisitMetadata,
  pageUrl: string | null,
) {
  try {
    const supabase = await supabaseServer()
    // 1. Insert visit tracking data
    // Geo goes into both places: the real columns (this project reads and filters on them) and the
    // JSON in `user_agent` (projects 14/28/29 still read geo from there).
    const { error } = await supabase.from("utm_stats").insert({
      user_id: userId,
      source: utmParams.utm_source,
      medium: utmParams.utm_medium,
      campaign: utmParams.utm_campaign,
      url: pageUrl,
      user_agent: serializeUTMVisitMetadata(metadata),
      country_code: metadata.countryCode?.toUpperCase() ?? null,
      country: metadata.country ?? null,
      region: metadata.region ?? null,
      city: metadata.city ?? null,
    })
    if (error) throw Error(error.message)
  } catch (error) {
    return `Error tracking UTM visit: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
