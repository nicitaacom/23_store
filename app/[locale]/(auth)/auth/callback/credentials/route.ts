import { pusherServer } from "@/libs/pusher"
import { getAuthErrorRedirectUrl, getLocalizedAppUrl } from "@/utils/authCallback"
import { syncPublicUserRecord } from "@/utils/publicUserSync"
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
      const syncedUser = await syncPublicUserRecord(response.data.user, { provider: "credentials" })

      // Trigger pusher to 'auth:completed' to show in another tab message like 'Authencication completed - thank you'
      await pusherServer.trigger(email, "auth:completed", null)

      const redirectResponse = NextResponse.redirect(getLocalizedAppUrl(requestUrl))

      if (syncedUser.avatarUrl) redirectResponse.cookies.set("avatarUrl", syncedUser.avatarUrl, { path: "/" })
      else redirectResponse.cookies.delete("avatarUrl")

      return redirectResponse
    }

    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No user found after exchanging cookies for registration"))
  } else {
    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No user found after exchanging cookies for registration"))
  }
}
