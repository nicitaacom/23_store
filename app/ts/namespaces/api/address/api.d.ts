// DO NOT import anything here

declare namespace API {
  type YandexAddressSuggestion = { id: string; label: string; uri: string }

  type YandexAddressSuggestionsResponse = {
    provider: "yandex-geosuggest"
    requestId: string
    providerAttempts: number
    suggestions: YandexAddressSuggestion[]
  }

  type YandexAddressGeocodeResponse = {
    provider: "yandex-geocoder"
    requestId: string
    providerAttempts: number
    address: {
      formattedAddress: string
      line1: string
      city: string
      region: string
      postalCode: string
      countryCode: "DE"
    }
    coordinates: { longitude: number; latitude: number }
  }

  type ProductsCheckoutDeliveryAddress = YandexAddressGeocodeResponse["address"] & {
    coordinates: YandexAddressGeocodeResponse["coordinates"]
    providerUri: string
  }
}
