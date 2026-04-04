// DO NOT import anything here

declare module API {
  type ProductsTranslationValue = {
    title: string
    description: string
  }

  type ProductsTranslations = {
    en: ProductsTranslationValue
    fi: ProductsTranslationValue
    ru: ProductsTranslationValue
    se: ProductsTranslationValue
  }

  type ProductsVariant = {
    id: string
    label: string
    image_url: string
  }

  type ProductsTranslateRequest = {
    title: string
    description: string
  }

  type ProductsTranslateResponse = ProductsTranslations

  type ProductsTranslateAndInsertRequest = {
    id: string
    price_id: string
    owner_id: string
    title: string
    description: string
    price: number
    on_stock: number
    img_url: string[]
    variants?: ProductsVariant[] | null
  }

  type ProductsTranslateAndInsertResponse = {
    ok: boolean
    error?: string
    translations?: ProductsTranslations
  }

  type ProductsFetchSuggestedPriceRequest = {
    title: string
    description: string
  }

  type ProductsFetchSuggestedPriceResponse = {
    price?: number
  }

  type ProductsAddRequest = {
    title: string
    description: string
    price: number
    images?: string[]
  }

  type ProductsAddResponse = {
    id: string
    product: string
  }

  type ProductsUpdateRequest = {
    productId: string
    images?: string[]
    translations?: ProductsTranslations
    price?: number
    onStock?: number
    variants?: ProductsVariant[] | null
  }

  type ProductsUpdateResponse = Record<string, unknown>

  type ProductsDeleteRequest = {
    id: string
  }

  type ProductsDeleteResponse = Record<string, unknown>

  type ProductsPopularRequest = {
    start: number
    end: number
  }

  type ProductsPopularResponse = {
    products: any[]
  }

  type ProductsCreateCheckoutSessionRequest = {
    stripeProductsQuery: string
    email: string | null | undefined
  }

  type ProductsCreatePayPalSessionRequest = {
    payPalProductsQuery: string
    email: string | null | undefined
  }

  type ProductsCreateKlarnaSessionResponse = Record<string, unknown>

  type ProductsVerifyPaymentRequest = {
    session_id: string
  }

  type ProductsVerifyPaymentResponse = {
    valid: boolean
  }

  type ProductsPaymentSuccessRequest = {
    cartProducts: Record<string, { quantity: number }>
  }

  type ProductsPaymentSuccessResponse = {
    status: number
  }

  type ProductsCustomerRequest = {
    session_id: string | null
  }

  type ProductsCustomerResponse = {
    customerEmail: string | null
  }
}
