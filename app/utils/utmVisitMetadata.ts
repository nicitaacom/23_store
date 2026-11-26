export interface IUTMVisitMetadata {
  userAgent: string | null
  countryCode: string | null
  country: string | null
  region: string | null
  city: string | null
  geoSource?: "cloudflare" | "vercel" | null
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function decodeURIComponentSafely(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeReadableString(value: unknown): string | null {
  const normalizedValue = normalizeString(value)
  if (!normalizedValue) return null

  // Geo headers can arrive percent-encoded, e.g. "Santa%20Clara".
  return decodeURIComponentSafely(normalizedValue)
}

export function getCountryNameFromCode(countryCode: string | null): string | null {
  if (!countryCode) return null

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" })
    return displayNames.of(countryCode.toUpperCase()) || countryCode.toUpperCase()
  } catch {
    return countryCode.toUpperCase()
  }
}

function readCountryCode(value: string | null): string | null {
  const code = value?.trim().toUpperCase()
  return code && /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null
}

export function readUTMVisitGeography(requestHeaders: Headers) {
  const cloudflareCountryHeader = requestHeaders.has("cf-ray") ? requestHeaders.get("cf-ipcountry") : null
  const cloudflareCountryCode = readCountryCode(cloudflareCountryHeader)
  const vercelCountryCode = readCountryCode(requestHeaders.get("x-vercel-ip-country"))
  const countryCode = cloudflareCountryHeader ? cloudflareCountryCode : vercelCountryCode
  const geoSource = countryCode ? cloudflareCountryHeader ? "cloudflare" : "vercel" : null
  const visitMetadata: IUTMVisitMetadata = {
    userAgent: requestHeaders.get("user-agent"),
    countryCode,
    country: getCountryNameFromCode(countryCode),
    region: geoSource === "cloudflare" ? requestHeaders.get("cf-region") :
      geoSource === "vercel" ? requestHeaders.get("x-vercel-ip-country-region") : null,
    city: geoSource === "cloudflare" ? requestHeaders.get("cf-ipcity") :
      geoSource === "vercel" ? requestHeaders.get("x-vercel-ip-city") : null,
    geoSource,
  }
  return { cloudflareCountryCode, vercelCountryCode, visitMetadata }
}

export function serializeUTMVisitMetadata(metadata: IUTMVisitMetadata): string {
  return JSON.stringify({
    userAgent: normalizeString(metadata.userAgent),
    countryCode: normalizeString(metadata.countryCode)?.toUpperCase() || null,
    country: normalizeReadableString(metadata.country),
    region: normalizeReadableString(metadata.region),
    city: normalizeReadableString(metadata.city),
    geoSource: metadata.geoSource ?? null,
  })
}

export function parseUTMVisitMetadata(value: string | null): IUTMVisitMetadata {
  if (!value) {
    return {
      userAgent: null,
      countryCode: null,
      country: null,
      region: null,
      city: null,
    }
  }

  try {
    const parsed = JSON.parse(value) as Partial<IUTMVisitMetadata>
    const parsedCountryCode = normalizeString(parsed.countryCode)?.toUpperCase() || null

    return {
      userAgent: normalizeString(parsed.userAgent),
      countryCode: parsedCountryCode,
      country: normalizeReadableString(parsed.country) || getCountryNameFromCode(parsedCountryCode),
      region: normalizeReadableString(parsed.region),
      city: normalizeReadableString(parsed.city),
      geoSource: parsed.geoSource === "cloudflare" || parsed.geoSource === "vercel" ? parsed.geoSource : null,
    }
  } catch {
    return {
      userAgent: value,
      countryCode: null,
      country: null,
      region: null,
      city: null,
    }
  }
}
