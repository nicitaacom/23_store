import "server-only"

const YANDEX_API_KEY_ENV = "YANDEX_GEOCODING_API_KEY"
const YANDEX_PUBLIC_API_KEY_ENV = "NEXT_PUBLIC_YANDEX_GEOCODING_API_KEY"
const YANDEX_SUGGEST_ORIGIN = "https://suggest-maps.yandex.ru"
const YANDEX_GEOCODER_ORIGIN = "https://geocode-maps.yandex.ru"
const REQUEST_TIMEOUTS_MS = [3_500, 7_500] as const
const MIN_RETRY_DELAY_MS = 300
const MAX_RETRY_DELAY_MS = 2_000

export type TYandexAddressProvider = "yandex-geosuggest" | "yandex-geocoder"

export class AddressProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly providerAttempts: number,
    readonly providerStatus?: number,
    readonly retryAfter?: string | null,
    readonly providerRequestId?: string | null,
  ) {
    super(message)
    this.name = "AddressProviderError"
  }
}

export type TYandexProviderResponse = {
  data: unknown
  providerAttempts: number
  providerStatus: number
  providerRequestId: string | null
}

function getYandexApiKey() {
  // Keep the server-only name preferred, while accepting the existing public Yandex key
  // configured for the delivery-address autocomplete feature.
  const key = process.env[YANDEX_API_KEY_ENV] ?? process.env[YANDEX_PUBLIC_API_KEY_ENV]
  if (!key?.trim()) {
    throw new AddressProviderError(
      "Address suggestions are not configured. Enter the address manually or contact the store owner.",
      "ADDRESS_PROVIDER_NOT_CONFIGURED",
      0,
    )
  }

  return key
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500
}

function retryDelay(retryAfter: string | null) {
  if (!retryAfter) return MIN_RETRY_DELAY_MS

  const seconds = Number(retryAfter)
  const requestedDelay = Number.isFinite(seconds) ? seconds * 1_000 : Date.parse(retryAfter) - Date.now()
  if (!Number.isFinite(requestedDelay) || requestedDelay <= 0) return MIN_RETRY_DELAY_MS
  return Math.min(Math.max(requestedDelay, MIN_RETRY_DELAY_MS), MAX_RETRY_DELAY_MS)
}

function pauseBeforeRetry(retryAfter: string | null) {
  return new Promise(resolve => setTimeout(resolve, retryDelay(retryAfter)))
}

function providerErrorForStatus(
  status: number,
  providerAttempts: number,
  retryAfter: string | null,
  providerRequestId: string | null,
) {
  if (status === 401 || status === 403) {
    return new AddressProviderError(
      "Yandex rejected the address-search API key. You can enter the address manually; the store owner needs to restore Yandex access.",
      "ADDRESS_PROVIDER_KEY_REJECTED",
      providerAttempts,
      status,
      retryAfter,
      providerRequestId,
    )
  }

  if (status === 429) {
    return new AddressProviderError(
      "Yandex address search is still rate-limited after an automatic retry. Enter the address manually and contact the store owner if this continues.",
      "ADDRESS_PROVIDER_RATE_LIMITED",
      providerAttempts,
      status,
      retryAfter,
      providerRequestId,
    )
  }

  if (status === 408) {
    return new AddressProviderError(
      "Yandex address search timed out after an automatic retry. Enter the address manually and contact the store owner if this continues.",
      "ADDRESS_PROVIDER_TIMEOUT",
      providerAttempts,
      status,
      retryAfter,
      providerRequestId,
    )
  }

  if (status >= 500) {
    return new AddressProviderError(
      "Yandex address search is unavailable after an automatic retry. Enter the address manually and contact the store owner if this continues.",
      "ADDRESS_PROVIDER_UNAVAILABLE",
      providerAttempts,
      status,
      retryAfter,
      providerRequestId,
    )
  }

  return new AddressProviderError(
    "Yandex could not process this address search. Check the address text and enter it manually if needed.",
    "ADDRESS_PROVIDER_BAD_REQUEST",
    providerAttempts,
    status,
    retryAfter,
    providerRequestId,
  )
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
}

export async function requestYandexAddressProvider(
  provider: TYandexAddressProvider,
  path: string,
  parameters: Record<string, string>,
  isExpectedResponse?: (data: unknown) => boolean,
): Promise<TYandexProviderResponse> {
  const apiKey = getYandexApiKey()
  const providerOrigin = provider === "yandex-geosuggest" ? YANDEX_SUGGEST_ORIGIN : YANDEX_GEOCODER_ORIGIN
  const url = new URL(path, providerOrigin)
  url.searchParams.set("apikey", apiKey)
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value)

  let lastFailure: AddressProviderError | null = null

  for (const [attemptIndex, timeoutMs] of REQUEST_TIMEOUTS_MS.entries()) {
    if (attemptIndex > 0) await pauseBeforeRetry(lastFailure?.retryAfter ?? null)

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      })
      const providerRequestId = response.headers.get("x-request-id") ?? response.headers.get("x-yandex-request-id")
      const retryAfter = response.headers.get("retry-after")

      if (!response.ok) {
        const failure = providerErrorForStatus(response.status, attemptIndex + 1, retryAfter, providerRequestId)
        if (attemptIndex === 0 && isRetryableStatus(response.status)) {
          lastFailure = failure
          continue
        }
        throw failure
      }

      let data: unknown
      try {
        data = await response.json()
      } catch {
        const failure = new AddressProviderError(
          "Yandex returned a response the store could not read.",
          "ADDRESS_PROVIDER_INVALID_RESPONSE",
          attemptIndex + 1,
          response.status,
          retryAfter,
          providerRequestId,
        )
        if (attemptIndex === 0) {
          lastFailure = failure
          continue
        }
        throw failure
      }

      if (isExpectedResponse && !isExpectedResponse(data)) {
        const failure = new AddressProviderError(
          "Yandex returned address data in a format the store could not read.",
          "ADDRESS_PROVIDER_INVALID_RESPONSE",
          attemptIndex + 1,
          response.status,
          retryAfter,
          providerRequestId,
        )
        if (attemptIndex === 0) {
          lastFailure = failure
          continue
        }
        throw failure
      }

      return {
        data,
        providerAttempts: attemptIndex + 1,
        providerStatus: response.status,
        providerRequestId,
      }
    } catch (error) {
      if (error instanceof AddressProviderError) throw error

      const failure = new AddressProviderError(
        isTimeoutError(error)
          ? "Yandex address search timed out after an automatic retry. Enter the address manually and contact the store owner if this continues."
          : "The store could not reach Yandex address search after an automatic retry. Check your connection or enter the address manually.",
        isTimeoutError(error) ? "ADDRESS_PROVIDER_TIMEOUT" : "ADDRESS_PROVIDER_NETWORK_ERROR",
        attemptIndex + 1,
        undefined,
      )
      if (attemptIndex === 0) {
        lastFailure = failure
        continue
      }
      throw failure
    }
  }

  throw lastFailure ?? new AddressProviderError(
    "Yandex address search did not complete. Enter the address manually and contact the store owner if this continues.",
    "ADDRESS_PROVIDER_UNAVAILABLE",
    REQUEST_TIMEOUTS_MS.length,
  )
}

export function addressProviderErrorResponseDetails(error: unknown) {
  if (!(error instanceof AddressProviderError)) {
    return {
      code: "ADDRESS_PROVIDER_UNAVAILABLE",
      message: "Address search failed. Enter the address manually and contact the store owner if this continues.",
      providerAttempts: 0,
      providerStatus: null,
      providerRequestId: null,
    }
  }

  return {
    code: error.code,
    message: error.message,
    providerAttempts: error.providerAttempts,
    providerStatus: error.providerStatus ?? null,
    providerRequestId: error.providerRequestId ?? null,
  }
}
