// DO NOT import anything here

declare namespace API {
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
    image_url?: string | null // optional: size variants (S/M/L) share one photo, so they have none
    options?: Record<string, string>
    group_id?: string
    price: number
    quantity: number // per-variant stock; 0 = sold out
  }

  type ProductsTranslateAndInsertRequest = {
    id: string
    price_id: string
    title: string
    description: string
    price: number
    on_stock: number
    img_url: string[]
    variants?: ProductsVariant[] | null
    personalization?: ProductsPersonalization | null
    category_id?: string | null
  }

  type ProductsTranslateAndInsertResponse = {
    ok: boolean
    error?: string
    translations?: ProductsTranslations
    evidence?: {
      requestId: string
      workerName: string
      workerStatus: "invoked" | "timeout"
      workerRequestId?: string
      workerVersion?: string
    }
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
    description?: string
    price: number
  }

  type ProductsAddResponse = {
    id: string
    product: string
  }

  // Mirrors app/ts/product/TPersonalization.ts - this file holds no imports on purpose
  type ProductsPrintArea = { widthMm: number; heightMm: number; minDpi?: number }
  type ProductsMockupRect = { leftPct: number; topPct: number; widthPct: number; heightPct: number }
  type ProductsPersonalizationConfig = {
    mockupUrl: string
    printArea: ProductsPrintArea
    mockupRect: ProductsMockupRect
  }
  type ProductsPersonalization = {
    isEnabled: boolean
    defaultConfig: ProductsPersonalizationConfig | null
    variantConfigs?: Record<string, ProductsPersonalizationConfig>
  }

  type ProductsUpdateRequest = {
    productId: string
    images?: string[]
    translations?: ProductsTranslations
    price?: number
    onStock?: number
    variants?: ProductsVariant[] | null
    category_id?: string | null
    personalization?: ProductsPersonalization | null
  }

  type ProductsDeleteRequest = {
    id: string
  }

  type ProductsUpdateResponse = {
    product: {
      price_id: string
      owner_id: string
      id: string
      translations: ProductsTranslations
      price: number
      img_url: string[]
      variants?: ProductsVariant[] | null
      on_stock: number
      personalization?: ProductsPersonalization | null
    }
  }

  type ProductsDeleteResponse = {
    id: string
  }

  type ProductsTranslateFieldRequest = {
    productId: string
    field: "title" | "description"
    value: string
    translations: ProductsTranslations
  }

  type ProductsTranslateFieldResponse = { product: ProductsUpdateResponse["product"] } | { error: string }

  type ProductsPopularRequest = {
    start: number
    end: number
  }

  type ProductsPopularResponse = {
    products: unknown[]
  }

  type ProductsCreateCheckoutSessionRequest = {
    products: Array<{
      productId: string
      variantId?: string | null
      designId?: string | null
      quantity: number
    }>
    email: string | null | undefined
    deliveryAddress?: ProductsCheckoutDeliveryAddress
  }

  type ProductsCreateCheckoutSessionResponse = { url: string }

  type ProductsCreatePayPalSessionRequest = {
    products: Array<{
      productId: string
      variantId?: string | null
      designId?: string | null
      quantity: number
    }>
    email: string | null | undefined
  }

  type ProductsCreatePayPalSessionResponse = { url: string }

  type ProductsWalletPaymentNetwork = "ETH" | "BNB" | "MATIC" | "SOL"
  type ProductsCreateWalletPaymentIntentRequest = {
    network: ProductsWalletPaymentNetwork
    senderAddress: string
    products: Array<{ productId: string; variantId?: string | null; quantity: number }>
  }
  type ProductsCreateWalletPaymentIntentResponse = {
    intentId: string
    network: ProductsWalletPaymentNetwork
    recipient: string
    tokenUnits: string
    transactionData: string
    chainId: string | null
    solanaCluster: string | null
  }
  type ProductsVerifyWalletPaymentRequest = { intentId: string; transactionHash: string }
  type ProductsVerifyWalletPaymentResponse = {
    valid: true
    quotaReset: boolean
    accountImageLimit: number
    accountImageRemaining?: number
    accountImageEpoch: number
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

  type ProductsReplanishmentRequestsRequest = {
    product_id: string
  }

  type ProductsReplanishmentRequestsResponse = { replanishment_requests_count: number } | { error: string }
}
