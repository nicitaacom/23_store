import { NextResponse } from "next/server"

import { addressProviderErrorResponseDetails, requestYandexAddressProvider } from "@/libs/yandex/addressProvider"

export const maxDuration = 20

type TYandexComponent = { kind?: unknown; name?: unknown }

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function getAddressComponents(address: Record<string, unknown>) {
  const rawComponents = address.Components ?? address.component
  return Array.isArray(rawComponents) ? rawComponents as TYandexComponent[] : []
}

function findComponent(components: TYandexComponent[], ...kinds: string[]) {
  return components.find(component => kinds.includes(String(component.kind ?? "").toLowerCase()))?.name
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getGeocodedAddress(data: unknown): API.YandexAddressGeocodeResponse["address"] | null {
  const featureMembers = getObject(getObject(getObject(data)?.response)?.GeoObjectCollection)?.featureMember
  if (!Array.isArray(featureMembers) || featureMembers.length === 0) return null

  const geoObject = getObject(getObject(featureMembers[0])?.GeoObject)
  const metadata = getObject(getObject(geoObject?.metaDataProperty)?.GeocoderMetaData)
  const providerAddress = getObject(metadata?.Address)
  if (!providerAddress) return null

  const components = getAddressComponents(providerAddress)
  const formattedAddress = textValue(providerAddress.formatted) || textValue(metadata?.text) || textValue(geoObject?.name)
  const street = textValue(findComponent(components, "street"))
  const house = textValue(findComponent(components, "house"))
  const line1 = [street, house].filter(Boolean).join(" ") || formattedAddress
  const city = textValue(findComponent(components, "locality")) || textValue(findComponent(components, "district"))
  const region = textValue(findComponent(components, "province", "area", "region"))
  const postalCode = textValue(providerAddress.postal_code) || textValue(findComponent(components, "postal_code"))
  const rawCountryCode = textValue(providerAddress.country_code).toUpperCase()
  const countryCode = rawCountryCode === "DEU" || rawCountryCode === "DE" ? "DE" : ""

  if (!formattedAddress || !line1 || !countryCode) return null
  return { formattedAddress, line1, city, region, postalCode, countryCode }
}

function getCoordinates(data: unknown): API.YandexAddressGeocodeResponse["coordinates"] | null {
  const featureMembers = getObject(getObject(getObject(data)?.response)?.GeoObjectCollection)?.featureMember
  if (!Array.isArray(featureMembers) || featureMembers.length === 0) return null

  const geoObject = getObject(getObject(featureMembers[0])?.GeoObject)
  const point = getObject(geoObject?.Point)
  const position = typeof point?.pos === "string" ? point.pos.trim().split(/\s+/) : []
  if (position.length !== 2) return null

  const longitude = Number(position[0])
  const latitude = Number(position[1])
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return null
  }
  return { longitude, latitude }
}

function withProviderEvidence(response: NextResponse, requestId: string, attempts: number, providerRequestId: string | null = null) {
  response.headers.set("x-request-id", requestId)
  response.headers.set("x-yandex-provider", "yandex-geocoder")
  response.headers.set("x-yandex-attempt-count", String(attempts))
  if (providerRequestId) response.headers.set("x-yandex-provider-request-id", providerRequestId)
  return response
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID()
  const uri = new URL(request.url).searchParams.get("uri")?.trim() ?? ""
  if (!uri.startsWith("ymapsbm1://geo?data=") || uri.length > 2_048) {
    return withProviderEvidence(
      NextResponse.json({ error: "Select an address from the Yandex suggestions before confirming it.", code: "ADDRESS_SELECTION_INVALID" }, { status: 400 }),
      requestId,
      0,
    )
  }

  try {
    const providerResponse = await requestYandexAddressProvider("yandex-geocoder", "/v1/", {
      uri,
      lang: "en_US",
      format: "json",
      results: "1",
    }, data => getGeocodedAddress(data) !== null && getCoordinates(data) !== null)
    const address = getGeocodedAddress(providerResponse.data)
    const coordinates = getCoordinates(providerResponse.data)
    if (!address || !coordinates) {
      return withProviderEvidence(
        NextResponse.json(
          {
            error: "Yandex could not confirm this suggestion as a delivery address. Choose another result or enter the address manually.",
            code: "ADDRESS_RESULT_NOT_CONFIRMED",
          },
          { status: 422 },
        ),
        requestId,
        providerResponse.providerAttempts,
        providerResponse.providerRequestId,
      )
    }

    return withProviderEvidence(
      NextResponse.json({
        provider: "yandex-geocoder",
        requestId,
        providerAttempts: providerResponse.providerAttempts,
        address,
        coordinates,
      } satisfies API.YandexAddressGeocodeResponse),
      requestId,
      providerResponse.providerAttempts,
      providerResponse.providerRequestId,
    )
  } catch (error) {
    const details = addressProviderErrorResponseDetails(error)
    const status = details.code === "ADDRESS_PROVIDER_KEY_REJECTED" || details.code === "ADDRESS_PROVIDER_NOT_CONFIGURED"
      ? 503
      : details.code === "ADDRESS_PROVIDER_TIMEOUT"
        ? 504
        : 502
    return withProviderEvidence(
      NextResponse.json({ error: details.message, code: details.code, requestId, providerAttempts: details.providerAttempts }, { status }),
      requestId,
      details.providerAttempts,
      details.providerRequestId,
    )
  }
}
