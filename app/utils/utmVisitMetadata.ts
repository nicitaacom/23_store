export interface IUTMVisitMetadata {
  userAgent: string | null
  countryCode: string | null
  country: string | null
  region: string | null
  city: string | null
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

export function serializeUTMVisitMetadata(metadata: IUTMVisitMetadata): string {
  return JSON.stringify({
    userAgent: normalizeString(metadata.userAgent),
    countryCode: normalizeString(metadata.countryCode)?.toUpperCase() || null,
    country: normalizeReadableString(metadata.country),
    region: normalizeReadableString(metadata.region),
    city: normalizeReadableString(metadata.city),
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
