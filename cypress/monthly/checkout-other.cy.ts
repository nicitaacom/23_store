import { recordBlockedRoute, recordResource, recordVerifiedRoute, recordVerifiedServiceOperation } from "./support"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TCheckoutResponse = { url?: string; error?: string }
type TProductFixture = {
  id: string
  priceId: string
  ownerId: string
  price: number
  translations: Record<string, { title: string; description: string }>
  imageUrls: string[]
}
type TStripeReadback = {
  sessionId: string
  customerId: string | null
  status: string
  paymentStatus: string
  amountCents: number
  currency: string
  urlHost: string
  paymentMethodTypes: string[]
  verificationReference: string
  clientReferenceId: string | null
  lineItem: { productId: string; priceId: string; name: string; quantity: number; unitAmount: number; images: string[]; livemode: boolean }
}

function getRunSuffix() {
  return String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
}

describe("monthly other checkout providers", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let sessionId = ""
  let stripeRequestId = ""
  let stripeCustomerRequestId = ""
  let product: TProductFixture | null = null

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    sessionId = ""
    stripeRequestId = ""
    stripeCustomerRequestId = ""
    product = null
    cy.visit("/")
  })

  afterEach(() => {
    const cleanupSession = () => {
      if (!sessionId) return cy.wrap(null, { log: false })
      const cleanedSessionId = sessionId
      return cy.task<string>("cleanupStripeTestCheckoutSession", {
        sessionId: cleanedSessionId,
        expectedCustomerEmail: accounts.owner.email,
      }).then(verificationReference => cy.task("appendE2EEvidence", {
        kind: "scenario-cleanup",
        status: "passed",
        scenarioId: "checkout-other",
        resourceId: accounts.owner.id,
        providerId: cleanedSessionId,
        verificationReference,
        at: new Date().toISOString(),
      }, { log: false }))
    }
    return cleanupSession().then(() => {
      if (!product) return null
      const fixture = product
      return cy.signIn(accounts.owner)
        .then(() => cy.visit("/en/"))
        .then(() => cy.request({ method: "POST", url: "/api/products/delete", body: { id: fixture.id } }))
        .then(response => {
          expect(response.status).to.equal(200)
          return cy.task("readRunProduct", fixture.id)
        }).then(readback => {
          expect(readback).to.equal(null)
          return cy.task<string>("verifyStripeResourcesInactive", { productId: fixture.id, priceId: fixture.priceId })
        })
    }).then(() => {
      if (!accounts?.owner?.id) return null
      return cy.task("cleanupRunCart", accounts.owner.id)
    })
  })

  it("creates a TEST-mode Stripe Checkout session restricted to PayPal and rejects it while unpaid", () => {
    let checkoutRequestId = ""
    let checkoutLineName = ""
    const suffix = getRunSuffix()
    const title = `E2E PayPal cart ${suffix}`
    const baseUrl = Cypress.config("baseUrl")
    if (!baseUrl) throw new Error("Cypress baseUrl is required for the PayPal checkout image readback")
    const imageUrl = new URL("/no-image-fallback.png", baseUrl).toString()

    cy.task<{ mode: string; verificationReference: string }>("requireVerifiedStripeTestMode")
      .should("deep.include", { mode: "test" })
      .then(() => cy.signIn(accounts.owner))
      .then(() => cy.task<TProductFixture>("createProductFixture", {
        ownerId: accounts.owner.id,
        key: `paypal-${suffix}`,
        title,
        description: "Run-owned Stripe TEST PayPal cart item for real product-price verification.",
        price: 1.43,
        onStock: 2,
        imageUrls: [imageUrl],
      }))
      .then(createdProduct => {
        product = createdProduct
        return cy.visit(`/en/products/${createdProduct.id}`)
          .then(() => cy.get(`[data-cy="add-to-cart-${createdProduct.id}"]`, { timeout: 30000 }).should("be.enabled").click())
          .then(() => cy.task("waitForRunCart", {
            ownerId: accounts.owner.id,
            expected: { [createdProduct.id]: { id: createdProduct.id, quantity: 1, variantId: null, designId: null } },
            timeoutMs: 30000,
          }))
          .then(() => cy.visit("/en/?modal=CartModal"))
          .then(() => cy.get('[data-cy="cart-subtotal"]').should("contain.text", "$1.43"))
          .then(() => cy.get('[data-cy="other-ways-to-pay"]').click())
          .then(() => {
            cy.intercept("POST", "/api/create-paypal-session").as("createPayPalCheckout")
            return cy.get('[data-cy="pay-with-paypal"]').should("be.enabled").click()
          })
          .then(() => cy.wait("@createPayPalCheckout", { timeout: 30000 }).then(interception => ({ createdProduct, interception })))
      })
      .then(({ createdProduct, interception }) => {
        if (!interception.response) throw new Error("PayPal checkout did not return an HTTP response")
        expect(interception.response.statusCode, "the application creates the PayPal checkout session").to.equal(200)
        expect(interception.request.body.products).to.deep.equal([{
          productId: createdProduct.id,
          variantId: null,
          designId: null,
          quantity: 1,
        }])
        const responseBody = interception.response.body as TCheckoutResponse
        expect(responseBody.error).to.equal(undefined)
        expect(responseBody.url).to.match(/^https:\/\/checkout\.stripe\.com\//)
        if (!responseBody.url) throw new Error("PayPal checkout route did not return its hosted URL")
        const hostedUrl = new URL(responseBody.url)
        const sessionMatch = hostedUrl.pathname.match(/\/(cs_test_[A-Za-z0-9]+)$/)
        expect(sessionMatch, "hosted URL contains a Stripe TEST session id").not.to.equal(null)
        if (!sessionMatch) throw new Error("PayPal checkout URL did not contain a Stripe TEST session id")
        sessionId = sessionMatch[1]
        const applicationRequestId = interception.response.headers["x-application-request-id"]
        stripeRequestId = String(interception.response.headers["x-stripe-request-id"] ?? "")
        stripeCustomerRequestId = String(interception.response.headers["x-stripe-customer-request-id"] ?? "")
        expect(applicationRequestId.length, "the app exposes a correlation id for account and product reads").to.be.greaterThan(0)
        expect(stripeRequestId.length, "Stripe exposes the real Checkout creation request id").to.be.greaterThan(0)
        expect(stripeCustomerRequestId.length, "Stripe exposes the real test customer creation request id").to.be.greaterThan(0)
        checkoutRequestId = String(applicationRequestId)
        checkoutLineName = createdProduct.translations.fi.title
        return recordResource("stripe_checkout_session", sessionId, accounts.owner.id, {
          provider: "stripe",
          paymentMethod: "paypal",
          mode: "test",
          amountCents: Math.round(createdProduct.price * 100),
          customerEmail: accounts.owner.email,
        })
      })
      .then(() => cy.task<TStripeReadback>("verifyStripeTestCheckoutSession", {
        sessionId,
        amountCents: Math.round((product?.price ?? 0) * 100),
        customerEmail: accounts.owner.email,
        expectedUserId: accounts.owner.id,
        paymentMethodType: "paypal",
        expectedLineItem: {
          name: checkoutLineName,
          quantity: 1,
          unitAmount: Math.round((product?.price ?? 0) * 100),
          imageUrl,
        },
      }))
      .then(stripeReadback => {
        expect(stripeReadback).to.include({
          sessionId,
          status: "open",
          paymentStatus: "unpaid",
          amountCents: Math.round((product?.price ?? 0) * 100),
          currency: "usd",
          urlHost: "checkout.stripe.com",
          clientReferenceId: accounts.owner.id,
        })
        expect(stripeReadback.paymentMethodTypes).to.include("paypal")
        expect(stripeReadback.customerId, "Stripe TEST session identifies the exact disposable customer").to.be.a("string")
        expect(stripeReadback.verificationReference).to.include("livemode-false")
        return recordResource("stripe_product", stripeReadback.lineItem.productId, accounts.owner.id, {
          provider: "stripe",
          mode: "test",
          source: "paypal-checkout-line-item",
          sessionId,
        }).then(() => recordResource("stripe_price", stripeReadback.lineItem.priceId, accounts.owner.id, {
          provider: "stripe",
          mode: "test",
          source: "paypal-checkout-line-item",
          sessionId,
        })).then(() => recordVerifiedRoute({
          method: "POST",
          route: "/api/create-paypal-session",
          scenarioId: "checkout-other",
          requestId: checkoutRequestId,
          providerId: sessionId,
          resourceId: accounts.owner.id,
          verificationReference: `${stripeReadback.verificationReference};payment-method:paypal;client-reference:${stripeReadback.clientReferenceId}`,
          details: { paymentMethod: "paypal", outcome: "open-unpaid-test-session", clientReferenceId: stripeReadback.clientReferenceId },
        })).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/libs/payment/getAuthenticatedPaymentUserId.ts",
          functionName: "getAuthenticatedPaymentUserId",
          callName: "getUser",
          requestId: checkoutRequestId,
          scenarioId: "checkout-other",
          resourceId: accounts.owner.id,
          providerId: sessionId,
          verificationReference: `supabase-auth:verified-account:${accounts.owner.id};stripe-client-reference:${stripeReadback.clientReferenceId}`,
          details: { providerRequestIdExposed: false, clientReferenceVerifiedByStripeReadback: true },
        })).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/create-paypal-session/route.ts",
          functionName: "POST",
          callName: "supabase-select",
          fingerprint: 'supabaseAdmin .from("23_products") .select("id,translations,price,img_url,variants") .in("id", productIds)',
          requestId: checkoutRequestId,
          scenarioId: "checkout-other",
          resourceId: product?.id,
          providerId: sessionId,
          verificationReference: `supabase:23_products:${product?.id}:saved-title-price-image-read-back`,
        })).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/create-paypal-session/route.ts",
          functionName: "POST",
          callName: "create",
          fingerprint: 'stripe.customers.create({ email: typeof body.email === "string" ? body.email : undefined })',
          requestId: String(stripeCustomerRequestId),
          scenarioId: "checkout-other",
          resourceId: accounts.owner.id,
          providerId: stripeReadback.customerId ?? undefined,
          verificationReference: `stripe-test-customer:${stripeReadback.customerId}:email:${accounts.owner.email}:mode-test`,
        })).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/create-paypal-session/route.ts",
          functionName: "POST",
          callName: "create",
          fingerprint: 'stripe.checkout.sessions.create({ payment_method_types: ["paypal"], mode: "payment", ...(getAuthenticatedPaymentUserIdResp ? { client_reference_id: getAuthenticatedPaymentUserIdResp } : {}), customer: customer.id, line_items: lineItems, success_url: `${getURL()}payment/?status=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${getURL()}/payment/?status=canceled`, })',
          requestId: String(stripeRequestId),
          scenarioId: "checkout-other",
          resourceId: accounts.owner.id,
          providerId: sessionId,
          verificationReference: `${stripeReadback.verificationReference};stripe-request:${stripeRequestId};client-reference:${stripeReadback.clientReferenceId}`,
        }))
      })
      .then(() => {
        cy.intercept("POST", "/api/verify-payment").as("verifyUnpaidPayPalCheckout")
        return cy.window().then(browserWindow => browserWindow.fetch("/api/verify-payment", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        }).then(async response => ({ statusCode: response.status, body: await response.json() as { valid?: boolean } })))
      })
      .then(result => cy.wait("@verifyUnpaidPayPalCheckout").then(interception => ({ result, interception })))
      .then(({ result, interception }) => {
        expect(result.statusCode, "an unpaid PayPal TEST session is not accepted as payment").to.equal(400)
        expect(result.body.valid).to.equal(false)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/verify-payment",
          scenarioId: "checkout-other",
          requestId: String(interception.id),
          providerId: sessionId,
          resourceId: accounts.owner.id,
          verificationReference: `stripe-checkout:${sessionId}:livemode-false:payment-status-unpaid;application-valid-false`,
          details: { paymentMethod: "paypal", expectedHttpStatus: 400 },
        })
      })
  })

  it("keeps Klarna explicitly blocked until the application has a real sandbox route", () => {
    return recordBlockedRoute(
      "POST",
      "/api/create-klarna-session",
      "checkout-other",
      "The current route uses Klarna's production API host and credentials embedded in source; it is not a verified sandbox integration, so the monthly suite does not call it.",
    )
  })
})
