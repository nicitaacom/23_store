import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { getAuthErrorRedirectUrl, getLocalizedAppUrl } from "@/utils/authCallback"
import { syncPublicUserRecord } from "@/utils/publicUserSync"

export async function GET(request: Request) {
  // Get code to exchange this code to cookies session in the future
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  // 1. Redirect to error page if supabase throw error on recover
  const error_description = requestUrl.searchParams.get("error_description")
  if (error_description) {
    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, error_description))
  }
  if (code) {
    // 2. Exchange cookies to set session and get session data
    const supabase = createRouteHandlerClient(
      { cookies },
      { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    )
    const response = await supabase.auth.exchangeCodeForSession(code)
    if (response.error) {
      return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, response.error.message))
    }
    if (response.data.user && response.data.user.email) {
      const syncedUser = await syncPublicUserRecord(response.data.user, { provider: "credentials" })

      const redirectResponse = NextResponse.redirect(
        `${getLocalizedAppUrl(requestUrl)}?modal=AuthModal&variant=resetPassword&code=${code}`,
      )

      if (syncedUser.avatarUrl) redirectResponse.cookies.set("avatarUrl", syncedUser.avatarUrl, { path: "/" })
      else redirectResponse.cookies.delete("avatarUrl")

      return redirectResponse
    } else {
      return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No user found after exchanging cookies for recovering"))
    }
  } else {
    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No code found to exchange cookies for session"))
  }
}
