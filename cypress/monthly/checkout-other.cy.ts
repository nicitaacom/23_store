import type { Interception } from "cypress/types/net-stubbing"

import { recordBlockedRoute, recordResource, recordVerifiedRoute } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TCheckoutResponse = { url?: string; error?: string }
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
}

const checkoutAmountCents = 143
const checkoutProductName = "E2E disposable Stripe TEST PayPal checkout"

describe("monthly other checkout providers", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let sessionId = ""

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    sessionId = ""
    cy.visit("/")
  })

  afterEach(() => {
    if (!sessionId) return
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
  })

  it("creates a TEST-mode Stripe Checkout session restricted to PayPal and rejects it while unpaid", () => {
    let checkoutRequestId = ""

    cy.task<{ mode: string; verificationReference: string }>("requireVerifiedStripeTestMode")
      .should("deep.include", { mode: "test" })
      .then(() => {
        cy.intercept("POST", "/api/create-paypal-session").as("createPayPalCheckout")
        return cy.window().then(browserWindow => browserWindow.fetch("/api/create-paypal-session", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: accounts.owner.email,
            payPalProductsQuery: encodeURIComponent(JSON.stringify([{
              name: checkoutProductName,
              quantity: 1,
              unitAmount: checkoutAmountCents,
            }])),
          }),
        }).then(async response => ({ statusCode: response.status, body: await response.json() as TCheckoutResponse })))
      })
      .then(result => cy.wait<Interception>("@createPayPalCheckout").then(interception => ({ result, interception })))
      .then(({ result, interception }) => {
        expect(result.statusCode, "the application creates the PayPal checkout session").to.equal(200)
        expect(result.body.error).to.equal(undefined)
        expect(result.body.url).to.match(/^https:\/\/checkout\.stripe\.com\//)
        if (!result.body.url) throw new Error("PayPal checkout route did not return its hosted URL")
        const hostedUrl = new URL(result.body.url)
        const sessionMatch = hostedUrl.pathname.match(/\/(cs_test_[A-Za-z0-9]+)$/)
        expect(sessionMatch, "hosted URL contains a Stripe TEST session id").not.to.equal(null)
        if (!sessionMatch) throw new Error("PayPal checkout URL did not contain a Stripe TEST session id")
        sessionId = sessionMatch[1]
        checkoutRequestId = String(interception.id)
        return recordResource("stripe_checkout_session", sessionId, accounts.owner.id, {
          provider: "stripe",
          paymentMethod: "paypal",
          mode: "test",
          amountCents: checkoutAmountCents,
          customerEmail: accounts.owner.email,
        })
      })
      .then(() => cy.task<TStripeReadback>("verifyStripeTestCheckoutSession", {
        sessionId,
        amountCents: checkoutAmountCents,
        customerEmail: accounts.owner.email,
        paymentMethodType: "paypal",
      }))
      .then(stripeReadback => {
        expect(stripeReadback).to.include({
          sessionId,
          status: "open",
          paymentStatus: "unpaid",
          amountCents: checkoutAmountCents,
          currency: "usd",
          urlHost: "checkout.stripe.com",
        })
        expect(stripeReadback.paymentMethodTypes).to.include("paypal")
        expect(stripeReadback.customerId, "Stripe TEST session identifies the exact disposable customer").to.be.a("string")
        expect(stripeReadback.verificationReference).to.include("livemode-false")
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/create-paypal-session",
          scenarioId: "checkout-other",
          requestId: checkoutRequestId,
          providerId: sessionId,
          resourceId: accounts.owner.id,
          verificationReference: `${stripeReadback.verificationReference};payment-method:paypal`,
          details: { paymentMethod: "paypal", outcome: "open-unpaid-test-session" },
        })
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
      .then(result => cy.wait<Interception>("@verifyUnpaidPayPalCheckout").then(interception => ({ result, interception })))
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
