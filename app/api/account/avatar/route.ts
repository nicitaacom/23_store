import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { getUserAvatarUrl, sanitizeAvatarUrl } from "@/utils/user"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

function isValidAvatarUrl(avatarUrl: string) {
  try {
    const parsedUrl = new URL(avatarUrl)
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as API.UpdateAvatarRequest
  const avatarUrl = sanitizeAvatarUrl(body.avatarUrl)

  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as unknown as ReturnType<typeof cookies> })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (avatarUrl && !isValidAvatarUrl(avatarUrl)) {
    return NextResponse.json({ error: "Avatar URL must be a valid http or https URL" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("23_users")
    .update({ avatar_url: avatarUrl || null })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const resolvedAvatarUrl = avatarUrl || getUserAvatarUrl(user)
  const response = NextResponse.json({
    avatarUrl,
    resolvedAvatarUrl,
  } satisfies API.UpdateAvatarResponse)

  if (resolvedAvatarUrl) response.cookies.set("avatarUrl", resolvedAvatarUrl, { path: "/" })
  else response.cookies.delete("avatarUrl")

  return response
}
