import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedRoute } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = { id: string; priceId: string; ownerId: string; price: number; onStock: number }
type TProductRow = { id: string; owner_id: string; replanishment_requests_count: number } | null

describe("monthly real-service replenishment notification", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    cy.intercept("POST", "/api/send-email/request-replanishment").as("sendReplenishmentEmail")
    cy.intercept("POST", "/api/products/replanishment-requests").as("recordReplenishmentRequest")
    cy.signIn(accounts.owner)
    const suffix = String(Cypress.env("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
    cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `replenishment-${suffix}`,
      title: `E2E replenishment product ${suffix}`,
      description: "A run-owned out-of-stock item for the real notification journey.",
      price: 17.25,
      onStock: 0,
    }).then(createdProduct => {
      product = createdProduct
    })
  })

  afterEach(() => {
    if (!product) return
    const fixture = product
    cy.signIn(accounts.owner)
    cy.request({
      method: "POST",
      url: "/api/products/delete",
      body: { id: fixture.id },
      failOnStatusCode: false,
    }).then(response => {
      expect(response.status, "clean up the exact run-owned product").to.equal(200)
      return cy.task<TProductRow>("readRunProduct", fixture.id).should("equal", null)
    }).then(() => cy.task<string>("verifyStripeResourcesInactive", {
      productId: fixture.id,
      priceId: fixture.priceId,
    })).then(verificationReference => cy.task("appendE2EEvidence", {
      kind: "scenario-cleanup",
      status: "passed",
      scenarioId: "notifications",
      resourceId: fixture.id,
      providerId: fixture.priceId,
      verificationReference: `${verificationReference};supabase:23_products:${fixture.id}:absent`,
      at: new Date().toISOString(),
    }, { log: false }))
  })

  it("sends one run-owned restock notice and increments only its product request count", () => {
    if (!product) throw new Error("Run-owned out-of-stock product was not created")
    const fixture = product

    cy.visit(`/en/products/${fixture.id}`)
    cy.get(`[data-cy="request-product-replenishment"][data-product-id="${fixture.id}"]`)
      .should("be.visible")
      .and("be.enabled")
      .click()

    let emailInterception: Interception
    cy.wait<Interception>("@sendReplenishmentEmail", { timeout: 30000 }).then(interception => {
      emailInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.include({ owner_id: accounts.owner.id, subject: "Request replanishment" })
      const emailId = interception.response?.body?.resendId
      expect(typeof emailId, "the application exposes the provider's exact email id").to.equal("string")
      expect(String(emailId).length).to.be.greaterThan(0)
      return cy.task<{ emailId: string; lastEvent: string; verificationReference: string }>("verifyResendEmail", {
        emailId: String(emailId),
        to: accounts.owner.email,
        subject: "Request replanishment",
        timeoutMs: 30000,
      }).then(emailReadback => {
        expect(emailReadback.emailId).to.equal(emailId)
        expect(["delivered", "opened", "clicked"]).to.include(emailReadback.lastEvent)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/send-email/request-replanishment",
          scenarioId: "notifications",
          requestId: interception.id,
          providerId: emailReadback.emailId,
          resourceId: accounts.owner.id,
          verificationReference: emailReadback.verificationReference,
          details: { recipientRole: "run-owned-product-owner", deliveryEvent: emailReadback.lastEvent },
        })
      })
    })

    cy.wait<Interception>("@recordReplenishmentRequest", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.deep.equal({ product_id: fixture.id })
      return cy.task<TProductRow>("readRunProduct", fixture.id)
        .should("include", { id: fixture.id, owner_id: accounts.owner.id, replanishment_requests_count: 1 })
        .then(row => {
          expect(row?.replanishment_requests_count).to.equal(1)
          if (!row || !emailInterception) throw new Error("Run-owned replenishment state or email evidence is missing")
          return recordVerifiedRoute({
            method: "POST",
            route: "/api/products/replanishment-requests",
            scenarioId: "notifications",
            requestId: interception.id,
            resourceId: fixture.id,
            verificationReference: `supabase:23_products:${fixture.id}:replanishment_requests_count:${row.replanishment_requests_count};resend:${emailInterception.response?.body?.resendId}`,
          })
        })
    })
    cy.get(`[data-cy="request-product-replenishment"][data-product-id="${fixture.id}"]`).should("contain", "1")
  })
})
