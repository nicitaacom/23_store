// middleware.ts
/**
 * Combined middleware:
 *  - i18n (next-international)
 *  - verifies app-level JWT (auth_token) on the Edge runtime (experimental-edge)
 *  - attaches trusted headers: x-user-id, x-user (base64 JSON)
 *
 * Flow:
 * // 1. run i18n middleware (may rewrite)
 * // 2. quick-exit public/static routes (matcher covers most)
 * // 3. read auth_token cookie
 * // 4. verify JWT (jose)
 * // 5. attach x-user-id and x-user (base64) headers for server-actions
 * // 6. if invalid -> clear cookie and continue unauthenticated
 *
 * Note: jsonwebtoken is NOT safe to use in Edge. See notes below.
 */

import { createI18nMiddleware } from "next-international/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"

// ---------- i18n setup (keep yours) ----------
const I18nMiddleware = createI18nMiddleware({
  locales: ["en", "fi", "ru", "se"] as TLocaleTag[],
  defaultLocale: "fi" as TLocaleTag,
  urlMappingStrategy: "rewrite",
  resolveLocaleFromRequest: () => "fi",
})

// ---------- runtime (fix for build error) ----------
export const runtime = "nodejs"

// ---------- helpers ----------
function getJwtSecretKey(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET missing")
  return new TextEncoder().encode(s)
}

/** cross-runtime base64 (Edge: btoa, Node: Buffer) */
function toBase64(input: string): string {
  if (typeof globalThis.btoa === "function") return globalThis.btoa(input)
  // @ts-ignore runtime may provide Buffer in Node
  return Buffer.from(input).toString("base64")
}

// TODO implement refresh-token because it's better for UX and security
/**
 * Verify auth_token using jose.
 * Returns `{ userId, payload }` on success or `null` on failure.
 */
async function verifyAuthToken(token: string): Promise<{ userId: string; payload: Record<string, unknown> } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    const userId = (payload as any)?.user?.id ?? (payload as any)?.sub
    if (!userId || typeof userId !== "string") return null
    return { userId, payload: payload as Record<string, unknown> }
  } catch {
    return null
  }
}

// ---------- middleware entry ----------
export async function middleware(request: NextRequest) {
  // 1. run i18n middleware first
  const i18nResult = I18nMiddleware(request)
  if (i18nResult instanceof Response) return i18nResult as Response

  // 2. quick-exit if no auth cookie
  const token = request.cookies.get("auth_token")?.value
  if (!token) return NextResponse.next()

  // 3. verify token
  const verified = await verifyAuthToken(token)
  if (!verified) {
    // 4. invalid -> clear cookie and continue unauthenticated
    const res = NextResponse.next()
    res.cookies.set({
      name: "auth_token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
    return res
  }

  // 5. valid -> attach trusted headers for downstream server-actions
  const headers = new Headers(request.headers)
  headers.set("x-user-id", verified.userId)
  try {
    const userObj = (verified.payload as any).user ?? { id: verified.userId }
    headers.set("x-user", toBase64(JSON.stringify(userObj)))
  } catch {
    /* ignore serialization issues */
  }

  return NextResponse.next({ request: { headers } })
}

// keep your original matcher (skip api, static, _next, etc.)
export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt|embed|auth/callback).*)"],
}
