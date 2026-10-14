import type { Interception } from "cypress/types/net-stubbing"

import { recordResource, recordVerifiedRoute, recordVerifiedServiceOperation } from "./support"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = { id: string; priceId: string; ownerId: string; price: number; onStock: number }
type TProductRow = { id: string; owner_id: string; replanishment_requests_count: number } | null

describe("monthly real-service replenishment notification", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null
  let emailRequestCount = 0
  let replenishmentRequestCount = 0

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    emailRequestCount = 0
    replenishmentRequestCount = 0
    cy.intercept("POST", "/api/send-email/request-replanishment", request => {
      emailRequestCount += 1
      request.continue(response => {
        response.setDelay(1500)
      })
    }).as("sendReplenishmentEmail")
    cy.intercept("POST", "/api/products/replanishment-requests", request => {
      replenishmentRequestCount += 1
      request.continue()
    }).as("recordReplenishmentRequest")
    cy.signIn(accounts.owner)
    const suffix = String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
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

    const runId = String(Cypress.expose("E2E_RUN_ID"))
    const emailSubject = `23 Store weekly E2E message ${runId}`
    const emailHtml = `<p>Run-owned email delivery check ${runId}</p>`
    cy.request({
      method: "POST",
      url: "/api/send-email",
      body: { to: accounts.owner.email, subject: emailSubject, html: emailHtml },
      failOnStatusCode: false,
    }).then(response => {
      expect(response.status, "general email route accepted a real provider send").to.equal(200)
      const emailId = response.body?.resendId
      const applicationRequestId = response.headers["x-application-request-id"]
      expect(typeof emailId, "general email route returns the provider email id").to.equal("string")
      expect(typeof applicationRequestId, "general email route exposes a correlation id").to.equal("string")
      return recordResource("resend_message", String(emailId), accounts.owner.id, {
        provider: "resend",
        subject: emailSubject,
        scenario: "general-send-email-route",
      }).then(() => cy.task<{ emailId: string; lastEvent: string; requestId: string; verificationReference: string }>("verifyRunOwnedEmail", {
        ownerId: accounts.owner.id,
        emailId: String(emailId),
        subject: emailSubject,
        timeoutMs: 30000,
      }).then(emailReadback => {
        expect(emailReadback.emailId).to.equal(emailId)
        expect(["delivered", "opened", "clicked"]).to.include(emailReadback.lastEvent)
        return recordVerifiedRoute({
          method: "GET",
          route: "/api/e2e/resend-status",
          scenarioId: "notifications",
          requestId: emailReadback.requestId,
          providerId: emailReadback.emailId,
          resourceId: accounts.owner.id,
          verificationReference: emailReadback.verificationReference,
          details: { deliveryEvent: emailReadback.lastEvent },
        }).then(() => recordVerifiedRoute({
          method: "POST",
          route: "/api/send-email",
          scenarioId: "notifications",
          requestId: String(applicationRequestId),
          providerId: emailReadback.emailId,
          resourceId: accounts.owner.id,
          verificationReference: emailReadback.verificationReference,
          details: { recipientRole: "run-owned-product-owner", deliveryEvent: emailReadback.lastEvent },
        })).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/send-email/route.ts",
          functionName: "POST",
          callName: "send",
          requestId: String(applicationRequestId),
          scenarioId: "notifications",
          providerId: emailReadback.emailId,
          resourceId: accounts.owner.id,
          verificationReference: emailReadback.verificationReference,
          details: {
            applicationRequestId: String(applicationRequestId),
            statusReadbackRequestId: emailReadback.requestId,
            providerNativeRequestIdExposed: false,
            deliveryEvent: emailReadback.lastEvent,
          },
        }))
      }))
    })

    cy.visit(`/en/products/${fixture.id}`)
    cy.get(`[data-cy="request-product-replenishment"][data-product-id="${fixture.id}"]`)
      .should("be.visible")
      .and("be.enabled")
      .click()
    cy.wait(250)
    cy.get(`[data-cy="request-product-replenishment"][data-product-id="${fixture.id}"]`)
      .should("be.enabled")
      .click()
    cy.wait(250)
    cy.get(`[data-cy="request-product-replenishment"][data-product-id="${fixture.id}"]`)
      .should("be.enabled")
      .click()

    let emailInterception: Interception
    cy.wait<Interception>("@sendReplenishmentEmail", { timeout: 30000 }).then(interception => {
      expect(emailRequestCount, "three rapid user clicks produce one real email request").to.equal(1)
      emailInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.include({ owner_id: accounts.owner.id, subject: "Request replanishment" })
      const emailId = interception.response?.body?.resendId
      expect(typeof emailId, "the application exposes the provider's exact email id").to.equal("string")
      expect(String(emailId).length).to.be.greaterThan(0)
      expect(interception.response?.headers["x-resend-email-id"]).to.equal(emailId)
      const applicationRequestId = interception.response?.headers["x-application-request-id"]
      expect(typeof applicationRequestId, "the route exposes its correlation id for awaited service operations").to.equal("string")
      return cy.task<{ emailId: string; lastEvent: string; requestId: string; verificationReference: string }>("verifyRunOwnedEmail", {
        ownerId: accounts.owner.id,
        emailId: String(emailId),
        subject: "Request replanishment",
        timeoutMs: 30000,
      }).then(emailReadback => {
        expect(emailReadback.emailId).to.equal(emailId)
        expect(["delivered", "opened", "clicked"]).to.include(emailReadback.lastEvent)
        return recordVerifiedRoute({
          method: "GET",
          route: "/api/e2e/resend-status",
          scenarioId: "notifications",
          requestId: emailReadback.requestId,
          providerId: emailReadback.emailId,
          resourceId: accounts.owner.id,
          verificationReference: emailReadback.verificationReference,
          details: { deliveryEvent: emailReadback.lastEvent },
        }).then(() => recordVerifiedRoute({
          method: "POST",
          route: "/api/send-email/request-replanishment",
          scenarioId: "notifications",
          requestId: String(applicationRequestId),
          providerId: emailReadback.emailId,
          resourceId: accounts.owner.id,
          verificationReference: emailReadback.verificationReference,
          details: { recipientRole: "run-owned-product-owner", deliveryEvent: emailReadback.lastEvent },
        })).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/send-email/request-replanishment/route.ts",
          functionName: "POST",
          callName: "supabase-select",
          requestId: String(applicationRequestId),
          scenarioId: "notifications",
          resourceId: accounts.owner.id,
          verificationReference: `supabase:23_users:${accounts.owner.id}:email-present;resend:${emailReadback.emailId}:recipient-matched-by-provider-readback`,
          details: {
            applicationRequestId: String(applicationRequestId),
            statusReadbackRequestId: emailReadback.requestId,
            providerNativeRequestIdExposed: false,
            recipientValueRecorded: false,
          },
        })).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/api/send-email/request-replanishment/route.ts",
          functionName: "POST",
          callName: "send",
          requestId: String(applicationRequestId),
          scenarioId: "notifications",
          providerId: emailReadback.emailId,
          resourceId: accounts.owner.id,
          verificationReference: emailReadback.verificationReference,
          details: {
            applicationRequestId: String(applicationRequestId),
            providerNativeRequestIdExposed: false,
            deliveryEvent: emailReadback.lastEvent,
          },
        }))
      })
    })

    cy.wait<Interception>("@recordReplenishmentRequest", { timeout: 30000 }).then(interception => {
      expect(replenishmentRequestCount, "one email journey records one restock request").to.equal(1)
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
