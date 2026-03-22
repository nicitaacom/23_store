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
    userAgent: metadata.userAgent,
    countryCode: metadata.countryCode,
    country: metadata.country,
    region: metadata.region,
    city: metadata.city,
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
      country: normalizeString(parsed.country) || getCountryNameFromCode(parsedCountryCode),
      region: normalizeString(parsed.region),
      city: normalizeString(parsed.city),
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
