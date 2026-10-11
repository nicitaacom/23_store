import { NextResponse } from "next/server"

import { isLocaleTag } from "@/utils/locale"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

export async function POST(request: Request) {
  const supabase = await supabaseRouteHandler()
  const { data: { user }, error: getUserError } = await supabase.auth.getUser()
  if (getUserError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null) as API.AccountUpdateLanguageRequest | null
  if (!body || !isLocaleTag(body.language)) return NextResponse.json({ error: "Invalid language" }, { status: 400 })

  // eslint-disable-next-line local-rules/use-rls-supabase-client -- 23_users has no UPDATE policy; getUser verifies the caller and only that user's language column is updated.
  const { data: updatedUser, error } = await supabaseAdmin
    .from("23_users")
    .update({ preferred_language: body.language })
    .eq("id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!updatedUser) return NextResponse.json({ error: "Account profile not found" }, { status: 404 })

  return NextResponse.json({ success: true } satisfies API.AccountUpdateLanguageResponse)
}
