"use client"

import { useEffect, useRef, useState } from "react"

import { useI18n } from "@/locales/client"

type TAddressErrorCode =
  | "ADDRESS_PROVIDER_NOT_CONFIGURED"
  | "ADDRESS_PROVIDER_KEY_REJECTED"
  | "ADDRESS_PROVIDER_RATE_LIMITED"
  | "ADDRESS_PROVIDER_TIMEOUT"
  | "ADDRESS_PROVIDER_NETWORK_ERROR"
  | "ADDRESS_PROVIDER_UNAVAILABLE"
  | "ADDRESS_PROVIDER_INVALID_RESPONSE"
  | "ADDRESS_RESULT_NOT_CONFIRMED"
  | "ADDRESS_PROVIDER_BAD_REQUEST"
  | "ADDRESS_SELECTION_INVALID"

const ADDRESS_ERROR_CODES = new Set<TAddressErrorCode>([
  "ADDRESS_PROVIDER_NOT_CONFIGURED",
  "ADDRESS_PROVIDER_KEY_REJECTED",
  "ADDRESS_PROVIDER_RATE_LIMITED",
  "ADDRESS_PROVIDER_TIMEOUT",
  "ADDRESS_PROVIDER_NETWORK_ERROR",
  "ADDRESS_PROVIDER_UNAVAILABLE",
  "ADDRESS_PROVIDER_INVALID_RESPONSE",
  "ADDRESS_RESULT_NOT_CONFIRMED",
  "ADDRESS_PROVIDER_BAD_REQUEST",
  "ADDRESS_SELECTION_INVALID",
])

type TAddressSuggestion = API.YandexAddressSuggestion
type TSelectedAddress = API.ProductsCheckoutDeliveryAddress
type DeliveryAddressAutocompleteProps = {
  onSelectionChange: (address: TSelectedAddress | null) => void
}

async function readErrorCode(response: Response): Promise<TAddressErrorCode> {
  try {
    const body = await response.json() as { code?: unknown }
    const code = body.code
    if (typeof code === "string" && ADDRESS_ERROR_CODES.has(code as TAddressErrorCode)) return code as TAddressErrorCode
  } catch {
    // The status fallback below still gives the user a specific manual-entry path.
  }

  if (response.status === 503) return "ADDRESS_PROVIDER_UNAVAILABLE"
  if (response.status === 504) return "ADDRESS_PROVIDER_TIMEOUT"
  return "ADDRESS_PROVIDER_BAD_REQUEST"
}

// http://localhost:6006/?path=/story/commerce-cartcomposition--one-line
export function DeliveryAddressAutocomplete({
  onSelectionChange,
}: DeliveryAddressAutocompleteProps) {
  const t = useI18n()
  const [addressValue, setAddressValue] = useState("")
  const [suggestions, setSuggestions] = useState<TAddressSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSelected, setIsSelected] = useState(false)
  const [hasNoResults, setHasNoResults] = useState(false)
  const [addressFailureCode, setAddressFailureCode] = useState<TAddressErrorCode | null>(null)
  const sequenceRef = useRef(0)
  const geocodeAbortRef = useRef<AbortController | null>(null)
  const suppressNextSearchRef = useRef(false)

  useEffect(() => {
    const query = addressValue.trim()

    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false
      return
    }

    if (query.length < 3) {
      return
    }

    const sequence = ++sequenceRef.current
    const abortController = new AbortController()
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/address/suggestions?text=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: abortController.signal,
        })
        if (!response.ok) {
          const errorCode = await readErrorCode(response)
          if (sequence === sequenceRef.current) setAddressFailureCode(errorCode)
          return
        }

        const body = await response.json() as API.YandexAddressSuggestionsResponse
        if (sequence !== sequenceRef.current) return
        if (body.provider !== "yandex-geosuggest" || !Array.isArray(body.suggestions)) {
          setAddressFailureCode("ADDRESS_PROVIDER_INVALID_RESPONSE")
          return
        }
        setSuggestions(body.suggestions)
        setHasNoResults(body.suggestions.length === 0)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
        if (sequence === sequenceRef.current) setAddressFailureCode("ADDRESS_PROVIDER_UNAVAILABLE")
      } finally {
        if (sequence === sequenceRef.current) setIsSearching(false)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      abortController.abort()
    }
  }, [addressValue])

  useEffect(() => () => {
    sequenceRef.current += 1
    geocodeAbortRef.current?.abort()
  }, [])

  async function selectSuggestion(suggestion: TAddressSuggestion) {
    const sequence = ++sequenceRef.current
    geocodeAbortRef.current?.abort()
    const abortController = new AbortController()
    geocodeAbortRef.current = abortController
    setSuggestions([])
    setHasNoResults(false)
    setAddressFailureCode(null)
    setIsSelected(false)
    setIsConfirming(true)
    setAddressValue(suggestion.label)
    suppressNextSearchRef.current = true
    onSelectionChange(null)

    try {
      const response = await fetch(`/api/address/geocode?uri=${encodeURIComponent(suggestion.uri)}`, {
        cache: "no-store",
        signal: abortController.signal,
      })
      if (!response.ok) {
        const errorCode = await readErrorCode(response)
        if (sequence === sequenceRef.current) setAddressFailureCode(errorCode)
        return
      }

      const body = await response.json() as API.YandexAddressGeocodeResponse
      if (sequence !== sequenceRef.current) return
      if (
        body.provider !== "yandex-geocoder" ||
        body.address?.countryCode !== "DE" ||
        !Number.isFinite(body.coordinates?.longitude) ||
        !Number.isFinite(body.coordinates?.latitude)
      ) {
        setAddressFailureCode("ADDRESS_PROVIDER_INVALID_RESPONSE")
        return
      }

      onSelectionChange({ ...body.address, coordinates: body.coordinates, providerUri: suggestion.uri })
      setIsSelected(true)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      if (sequence === sequenceRef.current) setAddressFailureCode("ADDRESS_PROVIDER_UNAVAILABLE")
    } finally {
      if (sequence === sequenceRef.current) setIsConfirming(false)
    }
  }

  return (
    <div className="relative rounded-md border border-border-color/20 bg-foreground/40 p-2" data-cy="delivery-address-autocomplete">
      <label className="mb-1 block text-xs font-medium text-title" htmlFor="delivery-address-input">
        {t("product.delivery_address_label")}
      </label>
      <input
        className="min-h-11 w-full rounded-md border border-border-color/40 bg-background px-3 py-2 text-sm text-title outline-none placeholder:text-subTitle focus:border-success focus:ring-1 focus:ring-success/30"
        id="delivery-address-input"
        role="combobox"
        type="text"
        autoComplete="shipping address-line1"
        aria-autocomplete="list"
        aria-controls="delivery-address-suggestions"
        aria-expanded={suggestions.length > 0}
        data-cy="delivery-address-input"
        placeholder={t("product.delivery_address_placeholder")}
        value={addressValue}
        onChange={event => {
          sequenceRef.current += 1
          geocodeAbortRef.current?.abort()
          setAddressValue(event.target.value)
          setSuggestions([])
          setHasNoResults(false)
          setIsSearching(false)
          setIsSelected(false)
          setIsConfirming(false)
          setAddressFailureCode(null)
          onSelectionChange(null)
        }}
      />

      {suggestions.length > 0 && (
        <ul
          className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border-color/40 bg-background shadow-lg"
          id="delivery-address-suggestions"
          role="listbox"
          data-cy="delivery-address-suggestions">
          {suggestions.map(suggestion => (
            <li key={suggestion.id} role="option" aria-selected="false">
              <button
                className="min-h-11 w-full px-3 py-2 text-left text-sm text-title hover:bg-success/10 focus:bg-success/10 focus:outline-none"
                type="button"
                data-cy="delivery-address-suggestion"
                onClick={() => void selectSuggestion(suggestion)}>
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 text-xs text-subTitle" data-cy="delivery-address-status" aria-live="polite">
        {isSearching
          ? t("product.delivery_address_searching")
          : isConfirming
            ? t("product.delivery_address_geocoding")
            : isSelected
              ? t("product.delivery_address_selected")
              : hasNoResults
                ? t("product.delivery_address_no_results")
                : addressFailureCode
                  ? (() => {
                    switch (addressFailureCode) {
                      case "ADDRESS_PROVIDER_NOT_CONFIGURED": return t("product.delivery_address_config_missing")
                      case "ADDRESS_PROVIDER_KEY_REJECTED": return t("product.delivery_address_key_rejected")
                      case "ADDRESS_PROVIDER_RATE_LIMITED": return t("product.delivery_address_rate_limited")
                      case "ADDRESS_PROVIDER_TIMEOUT": return t("product.delivery_address_timeout")
                      case "ADDRESS_PROVIDER_NETWORK_ERROR":
                      case "ADDRESS_PROVIDER_UNAVAILABLE": return t("product.delivery_address_unavailable")
                      case "ADDRESS_PROVIDER_INVALID_RESPONSE":
                      case "ADDRESS_RESULT_NOT_CONFIRMED":
                      case "ADDRESS_PROVIDER_BAD_REQUEST":
                      case "ADDRESS_SELECTION_INVALID": return t("product.delivery_address_search_error")
                    }
                  })()
                  : t("product.delivery_address_help")}
      </p>
    </div>
  )
}
