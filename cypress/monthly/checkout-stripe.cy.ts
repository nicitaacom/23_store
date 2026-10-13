import type { Interception } from "cypress/types/net-stubbing"

import { recordResource, recordVerifiedRoute } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TCheckoutResponse = { url?: string; error?: string }
type TStripeReadback = {
  sessionId: string
  status: string
  paymentStatus: string
  amountCents: number
  currency: string
  urlHost: string
  verificationReference: string
}
type TVerifyPaymentResponse = { valid?: boolean }

const checkoutAmountCents = 117
const checkoutProductName = "E2E disposable Stripe TEST checkout"

describe("monthly Stripe TEST checkout session", function () {
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
    return cy.task<string>("cleanupStripeTestCheckoutSession", { sessionId: cleanedSessionId })
      .then(verificationReference => cy.task("appendE2EEvidence", {
        kind: "scenario-cleanup",
        status: "passed",
        scenarioId: "checkout-stripe",
        providerId: cleanedSessionId,
        verificationReference,
        at: new Date().toISOString(),
      }, { log: false }))
  })

  it("creates a real hosted TEST session, verifies it in Stripe, and confirms payment is not falsely accepted", () => {
    let sessionUrl = ""
    let checkoutRequestId = ""

    cy.task<{ mode: string; verificationReference: string }>("requireVerifiedStripeTestMode")
      .should("deep.include", { mode: "test" })
      .then(() => {
        cy.intercept("POST", "/api/create-checkout-session").as("createStripeCheckout")
        return cy.window().then(browserWindow => browserWindow.fetch("/api/create-checkout-session", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: accounts.owner.email,
            stripeProductsQuery: encodeURIComponent(JSON.stringify([{
              name: checkoutProductName,
              quantity: 1,
              unitAmount: checkoutAmountCents,
            }])),
          }),
        }).then(async response => ({ statusCode: response.status, body: await response.json() as TCheckoutResponse })))
      })
      .then(result => cy.wait<Interception>("@createStripeCheckout").then(interception => ({ result, interception })))
      .then(({ result, interception }) => {
        expect(result.statusCode, "application creates a Checkout session").to.equal(200)
        expect(result.body.error).to.equal(undefined)
        expect(result.body.url).to.match(/^https:\/\/checkout\.stripe\.com\//)
        if (!result.body.url) throw new Error("Stripe Checkout route did not return its hosted URL")
        sessionUrl = result.body.url
        const hostedUrl = new URL(sessionUrl)
        const sessionMatch = hostedUrl.pathname.match(/\/(cs_test_[A-Za-z0-9]+)$/)
        expect(sessionMatch, "hosted URL contains a Stripe TEST session id").not.to.equal(null)
        if (!sessionMatch) throw new Error("Stripe Checkout URL did not contain a TEST session id")
        sessionId = sessionMatch[1]
        checkoutRequestId = String(interception.id)
        return recordResource("stripe_checkout_session", sessionId, accounts.owner.id, {
          provider: "stripe",
          mode: "test",
          amountCents: checkoutAmountCents,
          customerEmail: accounts.owner.email,
        })
      })
      .then(() => cy.task<TStripeReadback>("verifyStripeTestCheckoutSession", {
        sessionId,
        amountCents: checkoutAmountCents,
        customerEmail: accounts.owner.email,
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
        expect(stripeReadback.verificationReference).to.include("livemode-false")
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/create-checkout-session",
          scenarioId: "checkout-stripe",
          requestId: checkoutRequestId,
          providerId: sessionId,
          resourceId: accounts.owner.id,
          verificationReference: stripeReadback.verificationReference,
          details: { hostedCheckout: true, outcome: "open-unpaid-test-session" },
        })
      })
      .then(() => {
        cy.intercept("POST", "/api/verify-payment").as("verifyUnpaidStripeCheckout")
        return cy.window().then(browserWindow => browserWindow.fetch("/api/verify-payment", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        }).then(async response => ({ statusCode: response.status, body: await response.json() as TVerifyPaymentResponse })))
      })
      .then(result => cy.wait<Interception>("@verifyUnpaidStripeCheckout").then(interception => ({ result, interception })))
      .then(({ result, interception }) => {
        expect(result.statusCode, "the application rejects an unpaid test session").to.equal(400)
        expect(result.body.valid).to.equal(false)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/verify-payment",
          scenarioId: "checkout-stripe",
          requestId: String(interception.id),
          providerId: sessionId,
          resourceId: accounts.owner.id,
          verificationReference: `stripe-checkout:${sessionId}:livemode-false:payment-status-unpaid;application-valid-false`,
          details: { expectedHttpStatus: 400, providerPaymentStatus: "unpaid" },
        })
      })
      .then(() => {
        expect(sessionUrl).to.include(sessionId)
      })
  })
})
