import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { getAuthErrorRedirectUrl, getLocalizedAppUrl } from "@/utils/authCallback"
import { syncPublicUserRecord } from "@/utils/publicUserSync"

export async function GET(request: Request) {
  // get data about code to exchange this code to cookies session
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  // get data about provider to save it in DB to throw error like
  // 'You already have signed in account with google - continue with google?'
  const provider = requestUrl.searchParams.get("provider")
  const cookieStore = await cookies()
  const cookieNames = cookieStore
    .getAll()
    .map(cookie => cookie.name)

  console.log("[auth:oauth][route] callback received", {
    pathname: requestUrl.pathname,
    provider,
    hasCode: Boolean(code),
    codeLength: code?.length ?? 0,
    errorDescription: requestUrl.searchParams.get("error_description"),
    cookieNames,
  })

  // 1. If supabase put something in error_description - show it on error page
  const error_description = requestUrl.searchParams.get("error_description")
  if (error_description) {
    console.error("[auth:oauth][route] provider returned error before code exchange", {
      provider,
      pathname: requestUrl.pathname,
      errorDescription: error_description,
    })
    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, error_description))
  }

  if (code) {
    // 2. Exchange cookies for session (to get session data)
    const supabase = createRouteHandlerClient(
      { cookies: () => cookieStore as unknown as ReturnType<typeof cookies> },
      { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    )
    const response = await supabase.auth.exchangeCodeForSession(code)
    console.log("[auth:oauth][route] exchangeCodeForSession completed", {
      provider,
      hasUser: Boolean(response.data.user),
      userId: response.data.user?.id ?? null,
      email: response.data.user?.email ?? null,
      error: response.error?.message ?? null,
    })
    if (response.error) {
      console.error("[auth:oauth][route] exchangeCodeForSession failed", {
        provider,
        error: response.error.message,
      })
      return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, response.error.message))
    }

    if (response.data.user && response.data.user.email) {
      const user_id = response?.data.user.id
      const email = response.data.user.email
      const syncedUser = await syncPublicUserRecord(response.data.user, { provider })

      const redirectTarget = getLocalizedAppUrl(requestUrl)
      console.log("[auth:oauth][route] authentication succeeded", {
        userId: user_id,
        email,
        provider,
        redirectTarget,
        avatarUrlFound: Boolean(syncedUser.avatarUrl),
      })

      const redirectResponse = NextResponse.redirect(redirectTarget)

      if (syncedUser.avatarUrl) redirectResponse.cookies.set("avatarUrl", syncedUser.avatarUrl, { path: "/" })
      else redirectResponse.cookies.delete("avatarUrl")

      return redirectResponse
    } else {
      console.error("[auth:oauth][route] exchange returned no user", {
        provider,
      })
      return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No user found after exchanging cookies for registration"))
    }
  } else {
    console.error("[auth:oauth][route] callback missing code", {
      provider,
      pathname: requestUrl.pathname,
    })
    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No code found to exchange cookies for session"))
  }
}
