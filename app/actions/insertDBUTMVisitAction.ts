"use server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export async function insertDBUTMVisitAction(userId: string, utmParams: UTMParams, userAgent: string | null) {
  try {
    // 1. Insert visit tracking data
    const { error } = await supabaseAdmin.from("utm_stats").insert({
      user_id: userId,
      visited_at: new Date().toISOString(),
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_term: utmParams.utm_term,
      utm_content: utmParams.utm_content,
      user_agent: userAgent,
    })
    if (error) throw Error(error.message)
  } catch (error) {
    return `Error tracking UTM visit: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
