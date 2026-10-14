import type { Interception } from "cypress/types/net-stubbing"

import {
  recordResource,
  recordVerifiedRoute,
  recordVerifiedServiceOperation,
  reservePaidScenarioOperation,
  settlePaidScenarioOperation,
} from "./support"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = {
  id: string
  priceId: string
  ownerId: string
  price: number
  translations: Record<string, { title: string; description: string }>
  imageUrls: string[]
}
type TYandexSuggestions = API.YandexAddressSuggestionsResponse
type TYandexGeocode = API.YandexAddressGeocodeResponse

const scenarioId = "address-geocoding"

function getHeader(interception: Interception, headerName: string) {
  const value = interception.response?.headers[headerName.toLowerCase()]
  if (Array.isArray(value)) return value[0]
  return typeof value === "string" ? value : undefined
}

function getRequestId(interception: Interception, body: { requestId?: string }) {
  return body.requestId || getHeader(interception, "x-request-id") || String(interception.id)
}

function recordYandexProviderCall(
  requestId: string,
  provider: "yandex-geosuggest" | "yandex-geocoder",
  attemptCount: number,
  productId: string,
  upstreamRequestId?: string,
) {
  return recordVerifiedServiceOperation({
    sourcePath: "app/libs/yandex/addressProvider.ts",
    functionName: "requestYandexAddressProvider",
    callName: "fetch",
    requestId,
    scenarioId,
    operationScenarioId: scenarioId,
    resourceId: productId,
    verificationReference: `yandex:${provider}:${requestId}:actual-provider-response:${attemptCount}-attempts`,
    details: {
      provider,
      providerAttempts: attemptCount,
      upstreamRequestId: upstreamRequestId ?? null,
    },
  })
}

describe("weekly real Yandex address autocomplete and Stripe TEST checkout", function () {
  this.timeout(360000)

  let accounts: TRunAccounts
  let product: TProductFixture | null = null
  let stripeSessionId = ""
  let paidOperationKey = ""
  let paidOperationReserved = false
  let paidOperationSettled = false
  let actualProviderCalls = 0

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    stripeSessionId = ""
    paidOperationKey = ""
    paidOperationReserved = false
    paidOperationSettled = false
    actualProviderCalls = 0
    cy.signIn(accounts.owner)
    cy.intercept("GET", "/api/address/suggestions*").as("yandexAddressSuggestions")
    cy.intercept("GET", "/api/address/geocode*").as("yandexAddressGeocode")
    cy.intercept("POST", "/api/create-checkout-session").as("stripeCheckoutSession")
  })

  afterEach(() => {
    let cleanupChain: Cypress.Chainable<unknown> = cy.wrap<unknown>(null, { log: false })

    if (stripeSessionId) {
      const currentSessionId = stripeSessionId
      cleanupChain = cleanupChain.then(() => cy.task<string>("cleanupStripeTestCheckoutSession", {
        sessionId: currentSessionId,
        expectedCustomerEmail: accounts.owner.email,
      })).then(verificationReference => {
        stripeSessionId = ""
        return cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId: "checkout-stripe",
          resourceId: currentSessionId,
          providerId: currentSessionId,
          verificationReference,
          at: new Date().toISOString(),
        }, { log: false })
      })
    }

    if (accounts?.owner?.id) {
      cleanupChain = cleanupChain.then(() => cy.task("cleanupRunCart", accounts.owner.id))
    }

    if (product) {
      const fixture = product
      cleanupChain = cleanupChain.then(() => cy.visit("/en/"))
        .then(() => cy.request({
          method: "POST",
          url: "/api/products/delete",
          body: { id: fixture.id },
          failOnStatusCode: false,
        }))
        .then(response => {
          expect(response.status, "delete only the exact address-test product through the application").to.equal(200)
          return cy.task<TProductFixture | null>("readRunProduct", fixture.id)
        })
        .then(readback => {
          expect(readback, "deleted Supabase product row").to.equal(null)
          return cy.task<string>("verifyStripeResourcesInactive", {
            productId: fixture.id,
            priceId: fixture.priceId,
          })
        })
        .then(verificationReference => cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId,
          resourceId: fixture.id,
          verificationReference,
          at: new Date().toISOString(),
        }, { log: false }))
    }

    if (paidOperationReserved && paidOperationKey && !paidOperationSettled) {
      cleanupChain = cleanupChain.then(() => settlePaidScenarioOperation({
        operationKey: paidOperationKey,
        status: "unknown",
        details: { scenarioId, actualProviderCalls, reason: "The browser scenario ended before all real provider results were checked" },
      }))
    }

    return cleanupChain
  })

  it("uses real Yandex results in a real Stripe TEST checkout session", () => {
    const runId = String(Cypress.expose("E2E_RUN_ID"))
    const suffix = runId.replace(/[^a-z0-9-]/gi, "-").slice(-18)
    const title = `E2E address checkout ${suffix}`
    const baseUrl = Cypress.config("baseUrl")
    if (!baseUrl) throw new Error("Cypress baseUrl is required for the real image check")
    const imageUrl = new URL("/no-image-fallback.png", baseUrl).toString()
    const operationKey = `${runId}:address-geocoding:${suffix}`
    let geocodeResponse: TYandexGeocode | null = null
    let selectedAddressLabel = ""
    paidOperationKey = operationKey

    return cy.then(() => reservePaidScenarioOperation({
      operationKey,
      provider: "yandex-maps",
      capability: "address suggestions and selected-address geocoding",
      estimateName: "yandex_address_lookup",
      paidCallCount: 3,
    })).then(result => {
      expect(result.allowed, "paid budget for real Yandex calls").to.equal(true)
      paidOperationReserved = true
    }).then(() => cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `address-${suffix}`,
      title,
      description: "Run-owned checkout item for real address autocomplete.",
      price: 6.25,
      onStock: 5,
      imageUrls: [imageUrl],
    })).then(createdProduct => {
      product = createdProduct
      return cy.request({ url: imageUrl, encoding: "binary" }).then(imageResponse => {
        expect(imageResponse.status).to.equal(200)
        expect(imageResponse.headers["content-type"]).to.match(/^image\//)
        expect(imageResponse.body.length).to.be.greaterThan(512)
      }).then(() => cy.visit(`/en/products/${createdProduct.id}`))
        .then(() => cy.get(`[data-cy="add-to-cart-${createdProduct.id}"]`, { timeout: 30000 }).should("be.enabled").click())
        .then(() => cy.task("waitForRunCart", {
          ownerId: accounts.owner.id,
          expected: { [createdProduct.id]: { id: createdProduct.id, quantity: 1, variantId: null } },
          timeoutMs: 30000,
        }))
        .then(cartReadback => {
          expect(cartReadback).to.have.property("verificationReference")
          return cy.visit("/en/?modal=CartModal")
        })
        .then(() => cy.get('[data-cy="cart-total"]', { timeout: 30000 }).should("be.visible"))
        .then(() => cy.get('[data-cy="delivery-address-input"]').type("Berlin", { delay: 250, timeout: 30000 }))
        .then(() => cy.wait<Interception>("@yandexAddressSuggestions", { timeout: 30000 }))
        .then(interception => {
          const response = interception.response?.body as TYandexSuggestions
          expect(interception.response?.statusCode).to.equal(200)
          expect(response.provider).to.equal("yandex-geosuggest")
          expect(response.suggestions).to.have.length.greaterThan(0)
          expect(response.providerAttempts).to.be.within(1, 2)
          expect(getHeader(interception, "x-yandex-provider")).to.equal("yandex-geosuggest")
          expect(Number(getHeader(interception, "x-yandex-attempt-count"))).to.equal(response.providerAttempts)
          actualProviderCalls += response.providerAttempts
          const requestId = getRequestId(interception, response)
          const upstreamRequestId = getHeader(interception, "x-yandex-provider-request-id")
          return recordYandexProviderCall(requestId, "yandex-geosuggest", response.providerAttempts, createdProduct.id, upstreamRequestId)
            .then(() => recordVerifiedRoute({
              method: "GET",
              route: "/api/address/suggestions",
              scenarioId,
              requestId,
              resourceId: createdProduct.id,
              verificationReference: `yandex:geosuggest:${requestId}:actual-result-count:${response.suggestions.length}`,
            }))
        })
        .then(() => cy.get('[data-cy="delivery-address-input"]').clear().type("Berlin Alexanderplatz 1", { delay: 250, timeout: 30000 }))
        .then(() => cy.wait<Interception>("@yandexAddressSuggestions", { timeout: 30000 }))
        .then(interception => {
          const response = interception.response?.body as TYandexSuggestions
          expect(interception.response?.statusCode).to.equal(200)
          expect(response.provider).to.equal("yandex-geosuggest")
          expect(response.suggestions).to.have.length.greaterThan(0)
          expect(response.providerAttempts).to.be.within(1, 2)
          actualProviderCalls += response.providerAttempts
          const requestId = getRequestId(interception, response)
          const upstreamRequestId = getHeader(interception, "x-yandex-provider-request-id")
          return recordYandexProviderCall(requestId, "yandex-geosuggest", response.providerAttempts, createdProduct.id, upstreamRequestId)
            .then(() => recordVerifiedRoute({
              method: "GET",
              route: "/api/address/suggestions",
              scenarioId,
              requestId,
              resourceId: createdProduct.id,
              verificationReference: `yandex:geosuggest:${requestId}:actual-result-count:${response.suggestions.length}`,
            }))
        })
        .then(() => cy.get('[data-cy="delivery-address-suggestion"]', { timeout: 30000 }).first().then($button => {
          selectedAddressLabel = $button.text().trim()
          return cy.wrap($button).click()
        }))
        .then(() => cy.wait<Interception>("@yandexAddressGeocode", { timeout: 30000 }))
        .then(interception => {
          const response = interception.response?.body as TYandexGeocode
          geocodeResponse = response
          expect(interception.response?.statusCode).to.equal(200)
          expect(response.provider).to.equal("yandex-geocoder")
          expect(response.address.formattedAddress.trim().length).to.be.greaterThan(0)
          expect(response.address.countryCode).to.equal("DE")
          expect(response.coordinates.longitude).to.be.within(-180, 180)
          expect(response.coordinates.latitude).to.be.within(-90, 90)
          expect(response.providerAttempts).to.be.within(1, 2)
          actualProviderCalls += response.providerAttempts
          const requestId = getRequestId(interception, response)
          const upstreamRequestId = getHeader(interception, "x-yandex-provider-request-id")
          return recordYandexProviderCall(requestId, "yandex-geocoder", response.providerAttempts, createdProduct.id, upstreamRequestId)
            .then(() => recordVerifiedRoute({
              method: "GET",
              route: "/api/address/geocode",
              scenarioId,
              requestId,
              resourceId: createdProduct.id,
              verificationReference: `yandex:geocoder:${requestId}:formatted-address-and-wgs84-coordinates`,
            }))
        })
        .then(() => cy.get('[data-cy="delivery-address-input"]').should("have.value", selectedAddressLabel))
        .then(() => cy.get('[data-cy="delivery-address-status"]').should("contain.text", "confirmed"))
        .then(() => cy.get('[data-cy="other-ways-to-pay"]').click())
        .then(() => cy.get('[data-cy="pay-with-stripe"]').should("be.enabled").click())
        .then(() => cy.wait<Interception>("@stripeCheckoutSession", { timeout: 30000 }))
        .then(checkoutInterception => {
          expect(checkoutInterception.response?.statusCode).to.equal(200)
          const checkoutRequest = checkoutInterception.request.body as unknown as API.ProductsCreateCheckoutSessionRequest
          expect(checkoutRequest.products).to.deep.equal([{
            productId: createdProduct.id,
            variantId: null,
            designId: null,
            quantity: 1,
          }])
          const lineItem = {
            imageUrl,
            name: createdProduct.translations.fi.title,
            quantity: 1,
            unitAmount: Math.round(createdProduct.price * 100),
          }

          const checkoutResponse = checkoutInterception.response?.body as { url?: unknown }
          expect(checkoutResponse.url).to.be.a("string")
          const checkoutUrl = new URL(String(checkoutResponse.url))
          expect(checkoutUrl.origin).to.equal("https://checkout.stripe.com")
          const sessionId = /cs_test_[A-Za-z0-9]+/.exec(checkoutUrl.href)?.[0]
          expect(sessionId, "actual Stripe TEST Checkout Session id in the returned hosted URL").to.be.a("string")
          if (!sessionId) throw new Error("Stripe Checkout response did not contain a TEST session id")
          stripeSessionId = sessionId
          const selectedGeocode = geocodeResponse
          if (!selectedGeocode) throw new Error("Yandex geocoder did not return the selected address")

          return cy.task<{ verificationReference: string; lineItem: { productId: string; priceId: string } }>("verifyStripeTestCheckoutSession", {
            sessionId,
            amountCents: lineItem.unitAmount * lineItem.quantity,
            customerEmail: accounts.owner.email,
            expectedUserId: accounts.owner.id,
            expectedLineItem: {
              name: lineItem.name,
              quantity: lineItem.quantity,
              unitAmount: lineItem.unitAmount,
              imageUrl: lineItem.imageUrl,
            },
            expectedDeliveryAddress: {
              formattedAddress: selectedGeocode.address.formattedAddress,
              latitude: selectedGeocode.coordinates.latitude,
              longitude: selectedGeocode.coordinates.longitude,
            },
          }).then(sessionReadback => ({ sessionId, checkoutUrl, lineName: lineItem.name, sessionReadback, checkoutInterception }))
        })
        .then(({ sessionId, checkoutUrl, lineName, sessionReadback, checkoutInterception }) => {
          expect(sessionReadback.lineItem.productId).to.be.a("string")
          const stripeRequestId = getHeader(checkoutInterception, "x-stripe-request-id")
          const applicationRequestId = getHeader(checkoutInterception, "x-application-request-id")
          expect(stripeRequestId, "Stripe returned the request id for this TEST checkout").to.be.a("string")
          expect(applicationRequestId, "checkout route exposes a correlation id for its Supabase product read").to.be.a("string")
          return recordResource("stripe_checkout_session", sessionId, accounts.owner.id, {
            provider: "stripe",
            mode: "test",
            scenarioId: "checkout-stripe",
            addressProvider: "yandex-geocoder",
          }).then(() => recordResource("stripe_product", sessionReadback.lineItem.productId, accounts.owner.id, {
            provider: "stripe",
            mode: "test",
            source: "checkout-session-line-item",
            sessionId,
          })).then(() => recordResource("stripe_price", sessionReadback.lineItem.priceId, accounts.owner.id, {
            provider: "stripe",
            mode: "test",
            source: "checkout-session-line-item",
            sessionId,
          })).then(() => recordVerifiedRoute({
            method: "POST",
            route: "/api/create-checkout-session",
            scenarioId: "checkout-stripe",
            requestId: String(checkoutInterception.id),
            resourceId: sessionId,
            verificationReference: `${sessionReadback.verificationReference};stripe-line-item:${sessionReadback.lineItem.productId}:title-price-image;stripe-session:yandex-address-coordinates`,
          })).then(() => recordVerifiedServiceOperation({
            sourcePath: "app/api/create-checkout-session/route.ts",
            functionName: "POST",
            callName: "supabase-select",
            fingerprint: "supabaseAdmin .from(\"23_products\") .select(\"id, translations, price, img_url, variants\") .in(\"id\", productIds)",
            requestId: String(applicationRequestId),
            scenarioId: "checkout-stripe",
            resourceId: createdProduct.id,
            providerId: sessionId,
            verificationReference: `supabase:23_products:${createdProduct.id}:authoritative-title-price-image-used;${sessionReadback.verificationReference}`,
            details: { providerNativeRequestIdExposed: false, stripeLineItemMatchedSavedProduct: true },
          })).then(() => recordVerifiedServiceOperation({
            sourcePath: "app/api/create-checkout-session/route.ts",
            functionName: "POST",
            callName: "create",
            requestId: String(stripeRequestId),
            scenarioId: "checkout-stripe",
            resourceId: sessionId,
            providerId: sessionReadback.lineItem.productId,
            verificationReference: `${sessionReadback.verificationReference};stripe-request:${stripeRequestId};cart-item-read-back`,
            details: { mode: "test", itemTitle: lineName, itemCount: 1 },
          })).then(() => cy.visit(checkoutUrl.href))
            .then(() => cy.origin(checkoutUrl.origin, { args: { lineName } }, ({ lineName: expectedName }) => {
            cy.contains(expectedName, { timeout: 30000 }).should("be.visible")
          })).then(() => cy.task<string>("cleanupStripeTestCheckoutSession", {
            sessionId,
            expectedCustomerEmail: accounts.owner.email,
          })).then(verificationReference => {
            stripeSessionId = ""
            return cy.task("appendE2EEvidence", {
              kind: "scenario-cleanup",
              status: "passed",
              scenarioId: "checkout-stripe",
              resourceId: sessionId,
              providerId: sessionId,
              verificationReference,
              at: new Date().toISOString(),
            }, { log: false })
          }).then(() => settlePaidScenarioOperation({
            operationKey,
            status: "completed",
            providerResourceId: sessionId,
            details: { actualProviderCalls, maximumReservedCalls: 6, yandexSelectionReachedStripeTestSession: true },
          })).then(() => {
            paidOperationSettled = true
            return cy.visit("/en/")
          })
        })
    })
  })
})
