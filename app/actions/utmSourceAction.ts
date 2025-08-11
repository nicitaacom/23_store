"use server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export async function utmSourceAction(utm_source: string) {
  const { data } = await supabaseAdmin.from("utm_stats").select("clicks").eq("utm_source", utm_source).single()
  if (!data) return
  await supabaseAdmin
    .from("utm_stats")
    .update({ clicks: data?.clicks + 1 })
    .eq("utm_source", utm_source)
}
