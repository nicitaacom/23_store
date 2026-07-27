import { NextResponse } from "next/server"

import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"
import { syncPublicUserRecord } from "@/utils/publicUserSync"

type TAPIAuthSyncPublicUser = {
  provider?: string | null
}

export async function POST(request: Request) {
  const body = ((await request.json().catch(() => ({}))) || {}) as TAPIAuthSyncPublicUser
  const supabase = await supabaseRouteHandler()
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  if (getUserError) {
    return NextResponse.json({ error: getUserError.message }, { status: 400 })
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const syncedUser = await syncPublicUserRecord(user, { provider: body.provider })
    const response = NextResponse.json({ ok: true, publicUserId: syncedUser.publicUserId })

    if (syncedUser.avatarUrl) response.cookies.set("avatarUrl", syncedUser.avatarUrl, { path: "/" })
    else response.cookies.delete("avatarUrl")

    return response
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to sync public user" }, { status: 400 })
  }
}
