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
    const { error } = await supabase.from("utm_stats").insert({
      user_id: userId,
      source: utmParams.utm_source,
      medium: utmParams.utm_medium,
      campaign: utmParams.utm_campaign,
      url: pageUrl,
      user_agent: serializeUTMVisitMetadata(metadata),
    })
    if (error) throw Error(error.message)
  } catch (error) {
    return `Error tracking UTM visit: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
