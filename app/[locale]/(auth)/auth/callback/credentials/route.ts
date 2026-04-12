import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { getAuthErrorRedirectUrl, getLocalizedAppUrl } from "@/utils/authCallback"
import { getPreferredAvatarUrl, getUserAvatarUrl } from "@/utils/user"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Get code to exchange this code to cookies session in the future
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  // Redirect to error page if supabase throw error on recover
  const error_description = requestUrl.searchParams.get("error_description")
  if (error_description) {
    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, error_description))
  }

  /* Exchange code for cookies - update row that user confirmed email */
  if (code) {
    // Exchange code to get cookies session
    const supabase = createRouteHandlerClient({ cookies })
    const response = await supabase.auth.exchangeCodeForSession(code)
    if (response.error) {
      return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, response.error.message))
    }

    // Update row that user verified email
    if (response.data.user && response.data.user.email) {
      const email = response.data.user.email
      const { data: userResponse } = await supabaseAdmin
        .from("23_users")
        .select("avatar_url")
        .eq("id", response.data.user.id)
        .maybeSingle()

      const avatarUrlFromAuth = getUserAvatarUrl(response.data.user)
      const avatarUrl = getPreferredAvatarUrl(userResponse?.avatar_url, response.data.user)
      await supabaseAdmin
        .from("23_users")
        .update({
          email_confirmed_at: response.data.user.updated_at,
          providers: ["credentials"],
          ...(!userResponse?.avatar_url && avatarUrlFromAuth ? { avatar_url: avatarUrlFromAuth } : {}),
        })
        .eq("id", response.data.user.id)

      // Trigger pusher to 'auth:completed' to show in another tab message like 'Authencication completed - thank you'
      await pusherServer.trigger(email, "auth:completed", null)

      const redirectResponse = NextResponse.redirect(getLocalizedAppUrl(requestUrl))

      if (avatarUrl) redirectResponse.cookies.set("avatarUrl", avatarUrl, { path: "/" })
      else redirectResponse.cookies.delete("avatarUrl")

      return redirectResponse
    }

    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No user found after exchanging cookies for registration"))
  } else {
    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No user found after exchanging cookies for registration"))
  }
}
