import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { createI18nMiddleware } from "next-international/middleware"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
// import { getI18n } from "@/locales/server"

// import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"
import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"
import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { TURNSTILE_COOKIE_NAME, TURNSTILE_COOKIE_VALUE, TURNSTILE_PATH_SEGMENT, getSafeNextPath } from "@/utils/turnstile"

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

const redis = Redis.fromEnv()
const localePageRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RATE_LIMITS.localePage.maxAllowed, `${RATE_LIMITS.localePage.windowSec} s`),
  analytics: false,
})
const LOCALE_PATH_PREFIXES = ["/fi", "/en", "/ru", "/se"] as const

// ---------- helper ----------
function isRouteProtectedForUser(pathname: string, role?: string) {
  if (!role) return false
  const routes = ROLE_PROTECTED_ROUTES[role] ?? []
  return routes.some(route => pathname.startsWith(route))
}

function encodeBase64Fn(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binaryString = ""

  bytes.forEach(byte => {
    binaryString += String.fromCharCode(byte)
  })

  return btoa(binaryString)
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "127.0.0.1"
  return request.headers.get("x-real-ip") || "127.0.0.1"
}

function getLocalePrefix(pathname: string) {
  const matchedPrefix = LOCALE_PATH_PREFIXES.find(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))

  return matchedPrefix || "/fi"
}

function isHumanCheckPath(pathname: string) {
  return (
    pathname === `/${TURNSTILE_PATH_SEGMENT}` ||
    LOCALE_PATH_PREFIXES.some(prefix => pathname === `${prefix}/${TURNSTILE_PATH_SEGMENT}`)
  )
}

function isTurnstileEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)
}

async function enforceLocalePageRateLimit(request: NextRequest, hasVerifiedTurnstile: boolean) {
  if (hasVerifiedTurnstile) return null
  if (request.method !== "GET") return null
  const normalizedPathname = request.nextUrl.pathname !== "/" ? request.nextUrl.pathname.replace(/\/+$/, "") : "/"
  const isLocalizedPage =
    normalizedPathname === "/" ||
    LOCALE_PATH_PREFIXES.some(prefix => normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`))
  if (isHumanCheckPath(normalizedPathname)) return null
  if (!isLocalizedPage) return null

  const clientIp = getClientIp(request)
  let success = false
  let reset = 0

  try {
    const rateLimitResponse = await localePageRateLimiter.limit(clientIp)
    success = rateLimitResponse.success
    reset = rateLimitResponse.reset
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new NextResponse(
      `Rate limit middleware misconfigured: failed to connect to Upstash Redis. Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Original error: ${errorMessage}`,
      {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      },
    )
  }

  if (success) return null

  const retryAfter = Math.max(1, Math.ceil(reset - Date.now() / 1000))
  return new NextResponse("Too many requests", {
    status: 429,
    headers: {
      "retry-after": `${retryAfter}`,
      "x-ratelimit-limit": `${RATE_LIMITS.localePage.maxAllowed}`,
    },
  })
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const turnstileEnabled = isTurnstileEnabled()
  const hasVerifiedTurnstile = request.cookies.get(TURNSTILE_COOKIE_NAME)?.value === TURNSTILE_COOKIE_VALUE
  const authErrorDescription = request.nextUrl.searchParams.get("error_description")
  const hasSupabaseAuthError = Boolean(
    authErrorDescription && (request.nextUrl.searchParams.has("error") || request.nextUrl.searchParams.has("error_code")),
  )

  if (authErrorDescription && hasSupabaseAuthError && !pathname.includes("/error")) {
    console.error("[auth:oauth][middleware] auth provider redirected with error", {
      pathname,
      error: request.nextUrl.searchParams.get("error"),
      errorCode: request.nextUrl.searchParams.get("error_code"),
      errorDescription: authErrorDescription,
      fullUrl: request.nextUrl.toString(),
    })
    const errorUrl = request.nextUrl.clone()
    errorUrl.pathname = `${getLocalePrefix(pathname)}/error`
    errorUrl.search = ""
    errorUrl.searchParams.set("error_description", authErrorDescription)

    return NextResponse.redirect(errorUrl)
  }

  // 1. i18n routing
  const i18nResult = I18nMiddleware(request)
  if (pathname.includes("/auth/callback/")) {
    if (i18nResult instanceof Response) return i18nResult
    return NextResponse.next()
  }
  if (i18nResult instanceof Response) return i18nResult // e.g. redirect by i18n

  if (turnstileEnabled) {
    if (isHumanCheckPath(pathname) && hasVerifiedTurnstile) {
      const safeNextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"), request.nextUrl.locale || "fi")
      const nextUrl = new URL(safeNextPath, request.nextUrl.origin)
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = nextUrl.pathname
      redirectUrl.search = nextUrl.search
      return NextResponse.redirect(redirectUrl)
    }

    if (!hasVerifiedTurnstile && !isHumanCheckPath(pathname)) {
      const challengeUrl = request.nextUrl.clone()
      challengeUrl.pathname = `${getLocalePrefix(pathname)}/${TURNSTILE_PATH_SEGMENT}`
      challengeUrl.search = ""
      challengeUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)

      return NextResponse.redirect(challengeUrl)
    }
  }

  const localePageRateLimitResponse = await enforceLocalePageRateLimit(request, hasVerifiedTurnstile)
  if (localePageRateLimitResponse) return localePageRateLimitResponse

  const res = NextResponse.next()

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
    res.headers.set("x-user", encodeBase64Fn(JSON.stringify(user)))
  }

  // 6. role-based protected routes
  const userRole = user?.role // TODO - implemet user.user_metadata.role (with dashboard)

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
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt|embed).*)"],
}
