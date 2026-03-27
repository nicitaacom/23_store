import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { getAuthErrorRedirectUrl, getLocalizedAppUrl } from "@/utils/authCallback"
import { getPreferredAvatarUrl } from "@/utils/user"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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
    const supabase = createRouteHandlerClient({ cookies })
    const response = await supabase.auth.exchangeCodeForSession(code)
    if (response.error) {
      return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, response.error.message))
    }
    if (response.data.user && response.data.user.email) {
      const { data: userResponse } = await supabaseAdmin
        .from("users")
        .select("avatar_url")
        .eq("id", response.data.user.id)
        .maybeSingle()
      const avatarUrl = getPreferredAvatarUrl(userResponse?.avatar_url, response.data.user)

      // 3. If provider_response !=== 'credentials' - add one more provider
      // For case when user signIn with google first and then recover password
      const { data: provider_response } = await supabaseAdmin
        .from("users")
        .select("providers")
        .eq("id", response.data.user.id)
        .single()
      // Check is provider exist (for case if user login 2 times with the same provider)
      const existingProvider = provider_response?.providers?.filter(providerLabel => providerLabel === "credentials")
      if (!existingProvider![0]) {
        const { error: update_provider_error } = await supabaseAdmin
          .from("users")
          .update({ providers: [...provider_response?.providers!, "credentials"] })
          .eq("id", response.data.user.id)
        if (update_provider_error) throw update_provider_error
      }

      const redirectResponse = NextResponse.redirect(
        `${getLocalizedAppUrl(requestUrl)}?modal=AuthModal&variant=resetPassword&code=${code}`,
      )

      if (avatarUrl) redirectResponse.cookies.set("avatarUrl", avatarUrl, { path: "/" })
      else redirectResponse.cookies.delete("avatarUrl")

      return redirectResponse
    } else {
      return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No user found after exchanging cookies for recovering"))
    }
  } else {
    return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl, "No code found to exchange cookies for session"))
  }
}
