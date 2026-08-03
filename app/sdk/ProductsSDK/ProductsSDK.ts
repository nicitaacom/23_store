import { TProductDB } from "@/ts/product/TProductDB"
import { BaseSDK } from "@/sdk/BaseSDK"

export class ProductsSDK extends BaseSDK {
  async compressImage(imageFile: File) {
    const formData = new FormData()
    formData.append("image", imageFile)

    const response = await this.postFormData("/api/tinify", formData)
    // eslint-disable-next-line local-rules/no-banned-words -- Web API binary-body method name
    const compressedImageFile = await response.blob()

    return {
      compressedImageFile,
      contentType: response.headers.get("Content-Type") || compressedImageFile.type || imageFile.type || "image/jpeg",
    }
  }

  async translateAndInsertInDB(request: API.ProductsTranslateAndInsertRequest) {
    try {
      return await this.postJson<API.ProductsTranslateAndInsertRequest, API.ProductsTranslateAndInsertResponse>(
        "/api/products/translate-insert",
        request satisfies API.ProductsTranslateAndInsertRequest,
      )
    } catch (error) {
      console.error("[ProductsSDK.translateAndInsertInDB] request failed", {
        error: error instanceof Error ? error.message : String(error),
        productId: request.id,
        imageCount: request.img_url?.length ?? 0,
        variantsCount: request.variants?.length ?? 0,
        titlePreview: request.title?.slice(0, 120),
        descriptionPreview: request.description?.slice(0, 120),
      })
      throw error
    }
  }

  async selectSuggestedPrice(request: API.ProductsFetchSuggestedPriceRequest) {
    return this.postJson<API.ProductsFetchSuggestedPriceRequest, API.ProductsFetchSuggestedPriceResponse>(
      "/api/fetch-prices",
      request satisfies API.ProductsFetchSuggestedPriceRequest,
    )
  }

  async addProduct(request: API.ProductsAddRequest) {
    return this.postJson<API.ProductsAddRequest, API.ProductsAddResponse>(
      "/api/products/add",
      request satisfies API.ProductsAddRequest,
    )
  }

  async updateProduct(request: API.ProductsUpdateRequest) {
    return this.postJson<API.ProductsUpdateRequest, API.ProductsUpdateResponse>(
      "/api/products/update",
      request satisfies API.ProductsUpdateRequest,
    )
  }

  async translateField(request: API.ProductsTranslateFieldRequest) {
    return this.postJson<API.ProductsTranslateFieldRequest, API.ProductsTranslateFieldResponse>(
      "/api/products/translate-field",
      request,
    )
  }

  async updateDBReplanishmentRequests(request: API.ProductsReplanishmentRequestsRequest) {
    return this.postJson<API.ProductsReplanishmentRequestsRequest, API.ProductsReplanishmentRequestsResponse>(
      "/api/products/replanishment-requests",
      request satisfies API.ProductsReplanishmentRequestsRequest,
    )
  }

  async deleteProduct(request: API.ProductsDeleteRequest) {
    return this.postJson<API.ProductsDeleteRequest, API.ProductsDeleteResponse>(
      "/api/products/delete",
      request satisfies API.ProductsDeleteRequest,
    )
  }

  async getPopularProducts(start: number, end: number) {
    const response = await this.getJson<{ products?: TProductDB[] }>("/api/popular-products", {
      start,
      end,
    } satisfies API.ProductsPopularRequest)

    return response.products || []
  }

  async createCheckoutSession(request: API.ProductsCreateCheckoutSessionRequest) {
    const respJson = await this.postJson<API.ProductsCreateCheckoutSessionRequest, API.ProductsCreateCheckoutSessionResponse>(
      "/api/create-checkout-session",
      request satisfies API.ProductsCreateCheckoutSessionRequest,
    )
    return respJson.url
  }

  async createPayPalSession(request: API.ProductsCreatePayPalSessionRequest) {
    const respJson = await this.postJson<API.ProductsCreatePayPalSessionRequest, API.ProductsCreatePayPalSessionResponse>(
      "/api/create-paypal-session",
      request satisfies API.ProductsCreatePayPalSessionRequest,
    )
    return respJson.url
  }

  async createKlarnaSession() {
    return this.postJson<Record<string, never>, API.ProductsCreateKlarnaSessionResponse>("/api/create-klarna-session", {})
  }

  async verifyPayment(request: API.ProductsVerifyPaymentRequest) {
    return this.postJson<API.ProductsVerifyPaymentRequest, API.ProductsVerifyPaymentResponse>(
      "/api/verify-payment",
      request satisfies API.ProductsVerifyPaymentRequest,
    )
  }

  async completePayment(request: API.ProductsPaymentSuccessRequest) {
    return this.postJson<API.ProductsPaymentSuccessRequest, API.ProductsPaymentSuccessResponse>(
      "/api/payment/success",
      request satisfies API.ProductsPaymentSuccessRequest,
    )
  }

  async getCustomerEmail(request: API.ProductsCustomerRequest) {
    return this.postJson<API.ProductsCustomerRequest, API.ProductsCustomerResponse>(
      "/api/customer",
      request satisfies API.ProductsCustomerRequest,
    )
  }

  async getCoinmarketcapQuote(request: API.CoinmarketcapRequest) {
    return this.postJson<API.CoinmarketcapRequest, API.CoinmarketcapResponse>(
      "/api/coinmarketcap",
      request satisfies API.CoinmarketcapRequest,
    )
  }
}

export const productsSDK = new ProductsSDK()
