import { NextResponse } from "next/server"

import { addressProviderErrorResponseDetails, requestYandexAddressProvider } from "@/libs/yandex/addressProvider"

export const maxDuration = 20

type TYandexSuggestResult = {
  title?: { text?: unknown }
  subtitle?: { text?: unknown }
  uri?: unknown
  address?: { formatted_address?: unknown }
}

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function getSuggestions(data: unknown): API.YandexAddressSuggestionsResponse["suggestions"] | null {
  const results = getObject(data)?.results
  if (!Array.isArray(results)) return null

  return results.flatMap((result: TYandexSuggestResult) => {
    const uri = typeof result?.uri === "string" ? result.uri : ""
    const title = typeof result?.title?.text === "string" ? result.title.text.trim() : ""
    const subtitle = typeof result?.subtitle?.text === "string" ? result.subtitle.text.trim() : ""
    const formattedAddress = typeof result?.address?.formatted_address === "string"
      ? result.address.formatted_address.trim()
      : ""
    const label = formattedAddress || [title, subtitle].filter(Boolean).join(", ")

    return uri && label ? [{ id: uri, label, uri }] : []
  })
}

function withProviderEvidence(response: NextResponse, requestId: string, attempts: number, providerRequestId: string | null = null) {
  response.headers.set("x-request-id", requestId)
  response.headers.set("x-yandex-provider", "yandex-geosuggest")
  response.headers.set("x-yandex-attempt-count", String(attempts))
  if (providerRequestId) response.headers.set("x-yandex-provider-request-id", providerRequestId)
  return response
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID()
  const search = new URL(request.url).searchParams.get("text")?.trim() ?? ""

  if (search.length < 3) {
    return withProviderEvidence(
      NextResponse.json({ error: "Enter at least three characters to search for an address.", code: "ADDRESS_QUERY_TOO_SHORT" }, { status: 400 }),
      requestId,
      0,
    )
  }
  if (search.length > 180) {
    return withProviderEvidence(
      NextResponse.json({ error: "Address search must be 180 characters or fewer.", code: "ADDRESS_QUERY_TOO_LONG" }, { status: 400 }),
      requestId,
      0,
    )
  }

  try {
    const providerResponse = await requestYandexAddressProvider("yandex-geosuggest", "/v1/suggest", {
      text: search,
      lang: "en",
      results: "7",
      types: "house,street",
      countries: "de",
      print_address: "1",
      attrs: "uri",
    }, data => getSuggestions(data) !== null)
    const suggestions = getSuggestions(providerResponse.data)
    if (!suggestions) {
      return withProviderEvidence(
        NextResponse.json(
          {
            error: "Yandex returned address suggestions in a format the store could not read. Enter the address manually.",
            code: "ADDRESS_PROVIDER_INVALID_RESPONSE",
          },
          { status: 502 },
        ),
        requestId,
        providerResponse.providerAttempts,
        providerResponse.providerRequestId,
      )
    }

    return withProviderEvidence(
      NextResponse.json({
        provider: "yandex-geosuggest",
        requestId,
        providerAttempts: providerResponse.providerAttempts,
        suggestions,
      } satisfies API.YandexAddressSuggestionsResponse),
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
