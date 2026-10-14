import type { Interception } from "cypress/types/net-stubbing"

import { recordResource, recordVerifiedRoute, recordVerifiedServiceOperation } from "./support"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = {
  id: string
  priceId: string
  ownerId: string
  price: number
  onStock: number
  translations: Record<string, { title: string; description: string }>
  imageUrls: string[]
}
type TCheckoutResponse = { url?: string; error?: string }
type TStripeReadback = {
  sessionId: string
  status: string
  paymentStatus: string
  amountCents: number
  currency: string
  urlHost: string
  clientReferenceId: string | null
  lineItem: {
    productId: string
    priceId: string
    name: string
    quantity: number
    unitAmount: number
    images: string[]
    livemode: boolean
  }
  verificationReference: string
}
const scenarioId = "checkout-stripe"

function getHeader(interception: Interception, headerName: string) {
  const value = interception.response?.headers[headerName.toLowerCase()]
  if (Array.isArray(value)) return value[0]
  return typeof value === "string" ? value : undefined
}

function getRunSuffix() {
  return String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
}

describe("weekly Stripe TEST checkout from the actual cart", function () {
  this.timeout(240000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null
  let sessionId = ""

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    sessionId = ""
    cy.intercept("POST", "/api/create-checkout-session").as("createStripeCheckout")
    cy.intercept("POST", "/api/verify-payment").as("verifyUnpaidStripeCheckout")
    cy.signIn(accounts.owner)
    cy.task("cleanupRunCart", accounts.owner.id)
  })

  afterEach(() => {
    let cleanupChain: Cypress.Chainable<unknown> = cy.wrap<unknown>(null, { log: false })

    if (sessionId) {
      const cleanupSessionId = sessionId
      cleanupChain = cleanupChain.then(() => cy.task<string>("cleanupStripeTestCheckoutSession", {
        sessionId: cleanupSessionId,
        expectedCustomerEmail: accounts.owner.email,
      })).then(verificationReference => {
        sessionId = ""
        return cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId,
          resourceId: cleanupSessionId,
          providerId: cleanupSessionId,
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
      cleanupChain = cleanupChain.then(() => cy.signIn(accounts.owner))
        .then(() => cy.visit("/en/"))
        .then(() => cy.request({
          method: "POST",
          url: "/api/products/delete",
          body: { id: fixture.id },
          failOnStatusCode: false,
        }))
        .then(response => {
          expect(response.status, "delete the exact run-owned checkout fixture").to.equal(200)
          return cy.task("readRunProduct", fixture.id)
        })
        .then(readback => {
          expect(readback, "the run-owned product row is absent after cleanup").to.equal(null)
          return cy.task<string>("verifyStripeResourcesInactive", { productId: fixture.id, priceId: fixture.priceId })
        })
        .then(verificationReference => cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId,
          resourceId: fixture.id,
          providerId: fixture.priceId,
          verificationReference: `${verificationReference};supabase:23_products:${fixture.id}:absent`,
          at: new Date().toISOString(),
        }, { log: false }))
    }

    return cleanupChain
  })

  it("checks the actual product, price, image, and unpaid TEST session before accepting payment", () => {
    const suffix = getRunSuffix()
    const title = `E2E Stripe cart ${suffix}`
    const baseUrl = Cypress.config("baseUrl")
    if (!baseUrl) throw new Error("Cypress baseUrl is required for the checkout image readback")
    const imageUrl = new URL("/no-image-fallback.png", baseUrl).toString()
    let checkoutRequestId = ""
    let checkoutLineName = ""

    return cy.task<{ mode: string; verificationReference: string }>("requireVerifiedStripeTestMode")
      .should("deep.include", { mode: "test" })
      .then(() => cy.task<TProductFixture>("createProductFixture", {
        ownerId: accounts.owner.id,
        key: `checkout-${suffix}`,
        title,
        description: "Run-owned Stripe TEST checkout item created for real cart verification.",
        price: 6.25,
        onStock: 4,
        imageUrls: [imageUrl],
      }))
      .then(createdProduct => {
        product = createdProduct
        expect(createdProduct.ownerId).to.equal(accounts.owner.id)
        expect(createdProduct.translations.fi.title).to.equal(`${title} FI`)
        expect(createdProduct.imageUrls).to.deep.equal([imageUrl])
        return cy.request({ url: imageUrl, encoding: "binary" }).then(imageResponse => {
          expect(imageResponse.status).to.equal(200)
          expect(imageResponse.headers["content-type"]).to.match(/^image\//)
          expect(imageResponse.body.length).to.be.greaterThan(512)
          return cy.visit(`/en/products/${createdProduct.id}`)
        })
      })
      .then(() => {
        if (!product) throw new Error("Run-owned Stripe TEST product was not created")
        const fixture = product
        return cy.get(`[data-cy="add-to-cart-${fixture.id}"]`, { timeout: 30000 }).should("be.enabled").click()
          .then(() => cy.task<{ cart: Record<string, unknown>; verificationReference: string }>("waitForRunCart", {
            ownerId: accounts.owner.id,
            expected: {
              [fixture.id]: { id: fixture.id, quantity: 1, variantId: null, designId: null },
            },
            timeoutMs: 30000,
          }))
      })
      .then(cartReadback => {
        expect(cartReadback.cart).to.have.property(product?.id ?? "")
        return cy.visit("/en/?modal=CartModal")
      })
      .then(() => {
        if (!product) throw new Error("Run-owned Stripe TEST product is missing before checkout")
        const expectedPriceCents = Math.round(product.price * 100)
        const expectedTotal = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(product.price)
        cy.get('[data-cy="cart-subtotal"]').should("have.text", expectedTotal)
        cy.get('[data-cy="cart-total"]').should("have.text", expectedTotal)
        cy.get('[data-cy="other-ways-to-pay"]').click()
        cy.get('[data-cy="pay-with-stripe"]').should("be.enabled").click()
        const fixture = product
        return cy.wait<{ products: Array<{ productId: string; variantId: string | null; designId: string | null; quantity: number }> }, TCheckoutResponse>("@createStripeCheckout", { timeout: 30000 }).then(interception => {
          if (!interception.response) throw new Error("Checkout route did not return an HTTP response")
          expect(interception.response.statusCode).to.equal(200)
          expect(interception.request.body.products).to.deep.equal([{
            productId: fixture.id,
            variantId: null,
            designId: null,
            quantity: 1,
          }])
          checkoutLineName = fixture.translations.fi.title

          const responseBody = interception.response.body
          expect(responseBody.error).to.equal(undefined)
          expect(responseBody.url).to.be.a("string")
          const checkoutUrl = new URL(String(responseBody.url))
          expect(checkoutUrl.origin).to.equal("https://checkout.stripe.com")
          const sessionIdMatch = /\/(cs_test_[A-Za-z0-9]+)$/.exec(checkoutUrl.pathname)
          expect(sessionIdMatch, "hosted URL contains an actual Stripe TEST Checkout Session id").not.to.equal(null)
          if (!sessionIdMatch) throw new Error("Stripe TEST Checkout session id is missing")
          sessionId = sessionIdMatch[1]
          const stripeRequestId = getHeader(interception, "x-stripe-request-id")
          const applicationRequestId = getHeader(interception, "x-application-request-id")
          expect(stripeRequestId, "server exposes the actual Stripe request id for this session creation").to.be.a("string")
          expect(applicationRequestId, "server exposes a correlation id for its Supabase read").to.be.a("string")
          checkoutRequestId = String(interception.id)

          return recordResource("stripe_checkout_session", sessionId, accounts.owner.id, {
            provider: "stripe",
            mode: "test",
            customerEmail: accounts.owner.email,
            sourceProductId: fixture.id,
          }).then(() => cy.task<TStripeReadback>("verifyStripeTestCheckoutSession", {
            sessionId,
            amountCents: expectedPriceCents,
            customerEmail: accounts.owner.email,
            expectedUserId: accounts.owner.id,
            expectedLineItem: {
              name: checkoutLineName,
              quantity: 1,
              unitAmount: expectedPriceCents,
              imageUrl,
            },
          })).then(stripeReadback => recordResource("stripe_product", stripeReadback.lineItem.productId, accounts.owner.id, {
            provider: "stripe",
            mode: "test",
            source: "checkout-session-line-item",
            sessionId,
          }).then(() => recordResource("stripe_price", stripeReadback.lineItem.priceId, accounts.owner.id, {
            provider: "stripe",
            mode: "test",
            source: "checkout-session-line-item",
            sessionId,
          })).then(() => ({ stripeReadback, stripeRequestId, applicationRequestId, checkoutUrl })))
        })
      })
      .then(({ stripeReadback, stripeRequestId, applicationRequestId, checkoutUrl }) => {
        expect(stripeReadback).to.include({
          sessionId,
          status: "open",
          paymentStatus: "unpaid",
          amountCents: Math.round((product?.price ?? 0) * 100),
          currency: "usd",
          urlHost: "checkout.stripe.com",
        })
        expect(stripeReadback.verificationReference).to.include("livemode-false")
        expect(stripeReadback.lineItem).to.include({
          name: checkoutLineName,
          quantity: 1,
          unitAmount: Math.round((product?.price ?? 0) * 100),
          livemode: false,
        })
        expect(stripeReadback.lineItem.images).to.include(imageUrl)

        return recordVerifiedRoute({
          method: "POST",
          route: "/api/create-checkout-session",
          scenarioId,
          requestId: checkoutRequestId,
          providerId: sessionId,
          resourceId: accounts.owner.id,
          verificationReference: `${stripeReadback.verificationReference};line-item:${stripeReadback.lineItem.productId}:title-price-image-match`,
          details: { lineItemCount: 1, imageMatchesCart: true, titleAndPriceMatchCart: true },
        }).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/create-checkout-session/route.ts",
          functionName: "POST",
          callName: "supabase-select",
          fingerprint: "supabaseAdmin .from(\"23_products\") .select(\"id, translations, price, img_url, variants\") .in(\"id\", productIds)",
          requestId: String(applicationRequestId),
          scenarioId,
          resourceId: product?.id,
          providerId: sessionId,
          verificationReference: `supabase:23_products:${product?.id}:authoritative-title-price-image-used;${stripeReadback.verificationReference}`,
          details: { providerNativeRequestIdExposed: false, stripeLineItemMatchedSavedProduct: true },
        })).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/create-checkout-session/route.ts",
          functionName: "POST",
          callName: "create",
          requestId: String(stripeRequestId),
          scenarioId,
          resourceId: sessionId,
          providerId: stripeReadback.lineItem.productId,
          verificationReference: `${stripeReadback.verificationReference};stripe-request:${stripeRequestId};cart-item-read-back`,
          details: { mode: "test", itemTitle: checkoutLineName, quantity: 1, unitAmount: stripeReadback.lineItem.unitAmount },
        })).then(() => cy.visit(checkoutUrl.href))
          .then(() => cy.origin(checkoutUrl.origin, { args: { checkoutLineName } }, ({ checkoutLineName: expectedName }) => {
            cy.contains(expectedName, { timeout: 30000 }).should("be.visible")
          }))
      })
      .then(() => cy.request({
        method: "POST",
        url: "/api/verify-payment",
        body: { session_id: sessionId },
        failOnStatusCode: false,
      }).then(response => cy.wait<{ session_id: string }, { valid: boolean }>("@verifyUnpaidStripeCheckout").then(interception => ({ response, interception }))))
      .then(({ response, interception }) => {
        expect(response.status, "the application does not mark an unpaid Stripe session as paid").to.equal(400)
        expect(response.body).to.deep.equal({ valid: false })
        const stripeRequestId = response.headers["x-stripe-request-id"]
        expect(stripeRequestId, "server exposes Stripe's actual payment-status read request id").to.be.a("string")
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/verify-payment",
          scenarioId,
          requestId: String(interception.id),
          providerId: sessionId,
          resourceId: accounts.owner.id,
          verificationReference: `stripe:${sessionId}:test:unpaid:application-valid-false`,
          details: { expectedHttpStatus: 400, providerPaymentStatus: "unpaid" },
        }).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/verify-payment/route.ts",
          functionName: "POST",
          callName: "retrieve",
          requestId: String(stripeRequestId),
          scenarioId,
          providerId: sessionId,
          resourceId: accounts.owner.id,
          verificationReference: `stripe:${sessionId}:test:unpaid:payment-status-read-back`,
        }))
      })
  })

  it("explains malformed cart input before making any Stripe request", () => {
    cy.intercept("POST", "/api/create-checkout-session").as("rejectMalformedStripeCheckout")

    return cy.request({
      method: "POST",
      url: "/api/create-checkout-session",
      body: { products: "not a cart", email: accounts.owner.email },
      failOnStatusCode: false,
    }).then(response => cy.wait<{ products: string }, { error: string }>("@rejectMalformedStripeCheckout")
      .then(interception => ({ response, interception })))
      .then(({ response, interception }) => {
        expect(response.status).to.equal(400)
        expect(response.body.error).to.equal("Your cart is empty or has invalid item details. Review the items before starting payment.")
        expect(response.headers).not.to.have.property("x-stripe-request-id")
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/create-checkout-session",
          scenarioId,
          requestId: String(interception.id),
          resourceId: accounts.owner.id,
          verificationReference: "checkout-input:malformed-cart:clear-http-400:no-stripe-request-started",
          details: { validationCase: "malformed-cart", stripeRequestStarted: false },
        })
      })
  })

  it("builds Stripe line items from saved product data when the client supplies conflicting values", () => {
    const suffix = getRunSuffix()
    const title = `E2E trusted Stripe data ${suffix}`
    const baseUrl = Cypress.config("baseUrl")
    if (!baseUrl) throw new Error("Cypress baseUrl is required for the checkout image readback")
    const imageUrl = new URL("/no-image-fallback.png", baseUrl).toString()
    const forgedImageUrl = new URL(`/no-image-fallback.png?client-value=${suffix}`, baseUrl).toString()

    return cy.task<{ mode: string; verificationReference: string }>("requireVerifiedStripeTestMode")
      .should("deep.include", { mode: "test" })
      .then(() => cy.task<TProductFixture>("createProductFixture", {
        ownerId: accounts.owner.id,
        key: `checkout-trust-${suffix}`,
        title,
        description: "Run-owned product for checkout data integrity verification.",
        price: 8.37,
        onStock: 3,
        imageUrls: [imageUrl],
      }))
      .then(createdProduct => {
        product = createdProduct
        const forgedName = `client-supplied title ${suffix}`
        const forgedUnitAmount = Math.round(createdProduct.price * 100) - 1
        return cy.request({
          method: "POST",
          url: "/api/create-checkout-session",
          body: {
            products: [{
              productId: createdProduct.id,
              variantId: null,
              designId: null,
              quantity: 1,
              name: forgedName,
              unitAmount: forgedUnitAmount,
              imageUrl: forgedImageUrl,
            }],
            email: accounts.owner.email,
          },
          failOnStatusCode: false,
        }).then(response => {
          expect(response.status, "actual checkout route accepts the saved product reference").to.equal(200)
          expect(response.body.error).to.equal(undefined)
          const checkoutUrl = new URL(String(response.body.url))
          expect(checkoutUrl.origin).to.equal("https://checkout.stripe.com")
          const sessionIdMatch = /\/(cs_test_[A-Za-z0-9]+)$/.exec(checkoutUrl.pathname)
          expect(sessionIdMatch).not.to.equal(null)
          if (!sessionIdMatch) throw new Error("Stripe TEST checkout session id is missing")
          sessionId = sessionIdMatch[1]

          const applicationRequestId = response.headers["x-application-request-id"]
          const stripeRequestId = response.headers["x-stripe-request-id"]
          expect(applicationRequestId).to.be.a("string")
          expect(stripeRequestId).to.be.a("string")

          return recordResource("stripe_checkout_session", sessionId, accounts.owner.id, {
            provider: "stripe",
            mode: "test",
            customerEmail: accounts.owner.email,
            sourceProductId: createdProduct.id,
            clientFieldsConflicted: true,
          }).then(() => cy.task<TStripeReadback>("verifyStripeTestCheckoutSession", {
            sessionId,
            amountCents: Math.round(createdProduct.price * 100),
            customerEmail: accounts.owner.email,
          expectedUserId: accounts.owner.id,
            expectedLineItem: {
              name: createdProduct.translations.fi.title,
              quantity: 1,
              unitAmount: Math.round(createdProduct.price * 100),
              imageUrl,
            },
          })).then(stripeReadback => {
            expect(stripeReadback.lineItem.name).not.to.equal(forgedName)
            expect(stripeReadback.lineItem.unitAmount).not.to.equal(forgedUnitAmount)
            expect(stripeReadback.lineItem.images).not.to.include(forgedImageUrl)
            return recordResource("stripe_product", stripeReadback.lineItem.productId, accounts.owner.id, {
              provider: "stripe",
              mode: "test",
              source: "checkout-session-line-item",
              sessionId,
            }).then(() => recordResource("stripe_price", stripeReadback.lineItem.priceId, accounts.owner.id, {
              provider: "stripe",
              mode: "test",
              source: "checkout-session-line-item",
              sessionId,
            })).then(() => recordVerifiedRoute({
              method: "POST",
              route: "/api/create-checkout-session",
              scenarioId,
              requestId: String(applicationRequestId),
              resourceId: createdProduct.id,
              providerId: sessionId,
              verificationReference: `${stripeReadback.verificationReference};saved-product:${createdProduct.id}:title-price-image-used;client-fields-ignored`,
              details: { clientTitleIgnored: true, clientPriceIgnored: true, clientImageIgnored: true },
            })).then(() => recordVerifiedServiceOperation({
              sourcePath: "app/api/create-checkout-session/route.ts",
              functionName: "POST",
              callName: "supabase-select",
              fingerprint: "supabaseAdmin .from(\"23_products\") .select(\"id, translations, price, img_url, variants\") .in(\"id\", productIds)",
              requestId: String(applicationRequestId),
              scenarioId,
              resourceId: createdProduct.id,
              providerId: sessionId,
              verificationReference: `supabase:23_products:${createdProduct.id}:saved-data-used;${stripeReadback.verificationReference}`,
              details: { providerNativeRequestIdExposed: false, clientFieldsIgnored: true },
            })).then(() => recordVerifiedServiceOperation({
              sourcePath: "app/api/create-checkout-session/route.ts",
              functionName: "POST",
              callName: "create",
              requestId: String(stripeRequestId),
              scenarioId,
              resourceId: sessionId,
              providerId: stripeReadback.lineItem.productId,
              verificationReference: `${stripeReadback.verificationReference};stripe-request:${stripeRequestId};saved-title-price-image-read-back`,
              details: { mode: "test", forgedClientFieldsIgnored: true },
            }))
          })
        })
      })
  })
})
