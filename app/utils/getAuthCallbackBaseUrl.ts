export function getAuthCallbackBaseUrl() {
  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL?.trim().replace(/\/+$/, "")

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin
  }

  return productionUrl || ""
}
