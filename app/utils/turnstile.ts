export const TURNSTILE_COOKIE_NAME = "cf_turnstile_verified"
export const TURNSTILE_COOKIE_VALUE = "1"
export const TURNSTILE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24
export const TURNSTILE_PATH_SEGMENT = "human-check"

export function isSafeNextPath(pathname: string | null | undefined) {
  return Boolean(pathname && pathname.startsWith("/") && !pathname.startsWith("//") && !pathname.includes("://"))
}

export function getSafeNextPath(pathname: string | null | undefined, fallbackLocale = "fi"): string {
  if (isSafeNextPath(pathname)) {
    return pathname as string
  }

  return `/${fallbackLocale}`
}
