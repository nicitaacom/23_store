import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createI18nMiddleware } from "next-international/middleware"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
// import { getI18n } from "@/locales/server"

// import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"
import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"

/**
 * Combined middleware:
 *  - i18n (next-international)
 *  - Supabase auth verification (Server Actions compatible)
 *  - attaches trusted headers: x-user-id, x-user (base64 JSON)
 *  - dual-tier rate-limits per user/IP
 *  - role-based protected route access
 *
 * Flow:
 * // 1. run i18n middleware (may rewrite)
 * // 2. quick-exit public/static routes
 * // 3. initialize Supabase middleware client
 * // 4. check user session
 * // 5. enforce rate limits
 * // 6. attach headers x-user-id and x-user
 * // 7. redirect/forbid protected routes based on role
 */

// ---------- i18n setup ----------
const I18nMiddleware = createI18nMiddleware({
  locales: ["fi", "en", "ru", "se"] as TLocaleTag[],
  defaultLocale: "fi" as TLocaleTag,
  urlMappingStrategy: "rewrite",
  resolveLocaleFromRequest: () => "fi", // bybass default broser language settings to set default locale to be "fi"
})

// ---------- role-based protected routes ----------
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  admin: ["/admin", "/settings"],
  support: ["/support"],
  user: ["/dashboard", "/account"],
}

// ---------- helper ----------
function isRouteProtectedForUser(pathname: string, role?: string) {
  if (!role) return false
  const routes = ROLE_PROTECTED_ROUTES[role] ?? []
  return routes.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  // 1. i18n routing
  const res = NextResponse.next()
  const i18nResult = I18nMiddleware(request)
  if (i18nResult instanceof Response) return i18nResult // e.g. redirect by i18n

  // 2. init Supabase middleware client
  const supabase = createMiddlewareClient({ req: request, res })

  // 3. check session
  const { data } = await supabase.auth.getSession()
  const session = data.session
  const user = session?.user

  // 4. dual-tier rate limiting
  // if (user) {
  //   const t = await getI18n()
  //   const rateLimitSDK = new RateLimitSDK()
  //   await rateLimitSDK.rateLimit(t, "authPerDay")
  //   await rateLimitSDK.rateLimit(t, "authPer15Min")
  // }

  // 5. attach headers
  if (user) {
    res.headers.set("x-user-id", user.id)
    res.headers.set("x-user", Buffer.from(JSON.stringify(user)).toString("base64"))
  }

  // 6. role-based protected routes
  const userRole = user?.role // TODO - implemet user.user_metadata.role (with dashboard)
  const pathname = request.nextUrl.pathname

  // unauthenticated access to user-protected pages
  if (!user && isRouteProtectedForUser(pathname, "user")) {
    const url = request.nextUrl.clone()
    url.pathname = `/${request.nextUrl.locale || "fi"}/login`
    return NextResponse.redirect(url)
  }

  // logged in but trying to access admin-only pages
  if (user && isRouteProtectedForUser(pathname, "admin") && userRole !== "admin") {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // 7. return same res so Supabase cookies sync
  return res
}

// 8. middleware matcher
export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt|embed|auth/callback).*)"],
}
