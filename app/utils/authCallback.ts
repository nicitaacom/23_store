const SUPPORTED_LOCALES = new Set(["fi", "en", "ru", "se"])
const DEFAULT_LOCALE = "fi"

export function getLocaleFromCallbackPath(pathname: string) {
  const [firstSegment = ""] = pathname.split("/").filter(Boolean)

  if (SUPPORTED_LOCALES.has(firstSegment)) {
    return firstSegment
  }

  return DEFAULT_LOCALE
}

export function getLocalizedAppUrl(requestUrl: URL, pathname = "") {
  const locale = getLocaleFromCallbackPath(requestUrl.pathname)
  const normalizedPathname = pathname ? (pathname.startsWith("/") ? pathname : `/${pathname}`) : ""

  return `${requestUrl.origin}/${locale}${normalizedPathname}`
}

export function getAuthErrorRedirectUrl(requestUrl: URL, errorDescription: string) {
  return `${getLocalizedAppUrl(requestUrl, "/error")}?error_description=${encodeURIComponent(errorDescription)}`
}
