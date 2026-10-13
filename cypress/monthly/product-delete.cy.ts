import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedRoute } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = { id: string; priceId: string; ownerId: string; price: number; onStock: number }
type TProductRow = { id: string; owner_id: string } | null

describe("monthly real-service product deletion", function () {
  this.timeout(240000)
  let accounts: TRunAccounts
  let fixtures: TProductFixture[] = []
  let deletedIds = new Set<string>()
  let deleteInterceptions: Interception[] = []

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    fixtures = []
    deletedIds = new Set()
    deleteInterceptions = []
    cy.intercept("POST", "/api/products/delete").as("deleteProduct")
    cy.signIn(accounts.owner)
    const suffix = String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-12)
    const makeFixture = (key: string, title: string) => cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `${key}-${suffix}`,
      title: `E2E ${title} ${suffix}`,
      description: "Run-owned product created for the actual delete flow.",
      price: 9.5,
      onStock: 4,
    }).then(fixture => {
      fixtures.push(fixture)
    })
    makeFixture("delete-single", "single-delete")
      .then(() => makeFixture("delete-bulk-a", "bulk-delete-A"))
      .then(() => makeFixture("delete-bulk-b", "bulk-delete-B"))
  })

  afterEach(() => {
    const remaining = fixtures.filter(fixture => !deletedIds.has(fixture.id))
    if (!remaining.length) return
    cy.signIn(accounts.owner)
    remaining.forEach(fixture => {
      cy.request({
        method: "POST",
        url: "/api/products/delete",
        body: { id: fixture.id },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status, `cleanup for ${fixture.id}`).to.equal(200)
        deletedIds.add(fixture.id)
        return cy.task<TProductRow>("readRunProduct", fixture.id).should("equal", null)
      }).then(() => cy.task<string>("verifyStripeResourcesInactive", {
        productId: fixture.id,
        priceId: fixture.priceId,
      })).then(verificationReference => cy.task("appendE2EEvidence", {
        kind: "scenario-cleanup",
        status: "passed",
        scenarioId: "product-delete",
        resourceId: fixture.id,
        providerId: fixture.priceId,
        verificationReference: `${verificationReference};supabase:23_products:${fixture.id}:absent`,
        at: new Date().toISOString(),
      }, { log: false }))
    })
  })

  it("cancels one delete, confirms one delete, then deletes only selected run-owned products in bulk", () => {
    const [singleProduct, bulkProductA, bulkProductB] = fixtures
    if (!singleProduct || !bulkProductA || !bulkProductB) throw new Error("Run-owned deletion fixtures were not created")

    cy.visit("/?modal=AdminPanel")
    cy.get('[data-cy="admin-action-delete"]').click()
    const singleCard = `[data-cy="delete-product"][data-product-id="${singleProduct.id}"]`
    cy.get(singleCard).should("be.visible").find('[data-cy="request-product-delete"]').click()
    cy.get('[data-cy="cancel-product-delete"]').should("be.enabled").click()
    cy.get(singleCard).should("be.visible")
    cy.task<TProductRow>("readRunProduct", singleProduct.id).should(row => {
      expect(row?.id).to.equal(singleProduct.id)
    })
    cy.get("@deleteProduct.all").should("have.length", 0)

    cy.get(singleCard).find('[data-cy="request-product-delete"]').click()
    cy.get('[data-cy="confirm-product-delete"]').should("be.enabled").click()
    cy.wait<Interception>("@deleteProduct", { timeout: 30000 }).then(interception => {
      deleteInterceptions.push(interception)
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.body).to.deep.equal({ id: singleProduct.id })
      deletedIds.add(singleProduct.id)
    })
    cy.task<TProductRow>("readRunProduct", singleProduct.id).should("equal", null)
    cy.task<string>("verifyStripeResourcesInactive", {
      productId: singleProduct.id,
      priceId: singleProduct.priceId,
    }).then(verificationReference => {
      const deletionRequest = deleteInterceptions[0]
      if (!deletionRequest) throw new Error("Single product deletion request was not captured")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/products/delete",
        scenarioId: "product-delete",
        requestId: deletionRequest.id,
        resourceId: singleProduct.id,
        providerId: singleProduct.priceId,
        verificationReference: `${verificationReference};supabase:23_products:${singleProduct.id}:absent`,
      })
    })

    cy.get('[data-cy="bulk-delete-mode"]').click()
    const bulkCardA = `[data-cy="delete-product"][data-product-id="${bulkProductA.id}"]`
    const bulkCardB = `[data-cy="delete-product"][data-product-id="${bulkProductB.id}"]`
    cy.get(bulkCardA).should("be.visible").click()
    cy.get(bulkCardB).should("be.visible").click()
    cy.get('[data-cy="bulk-delete-request"]').should("be.enabled").click()
    cy.get('[data-cy="confirm-product-delete"]').should("be.enabled").click()
    cy.wait<Interception>("@deleteProduct", { timeout: 30000 }).then(interception => {
      deleteInterceptions.push(interception)
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.body).to.deep.equal({ id: bulkProductA.id })
      deletedIds.add(bulkProductA.id)
    })
    cy.wait<Interception>("@deleteProduct", { timeout: 30000 }).then(interception => {
      deleteInterceptions.push(interception)
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.body).to.deep.equal({ id: bulkProductB.id })
      deletedIds.add(bulkProductB.id)
    })
    cy.get("@deleteProduct.all").should("have.length", 3)

    for (const [fixture, interceptionIndex] of [[bulkProductA, 1], [bulkProductB, 2]] as const) {
      cy.task<TProductRow>("readRunProduct", fixture.id).should("equal", null)
      cy.task<string>("verifyStripeResourcesInactive", {
        productId: fixture.id,
        priceId: fixture.priceId,
      }).then(verificationReference => {
        const deletionRequest = deleteInterceptions[interceptionIndex]
        if (!deletionRequest) throw new Error(`Bulk delete request ${interceptionIndex} was not captured`)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/products/delete",
          scenarioId: "product-delete",
          requestId: deletionRequest.id,
          resourceId: fixture.id,
          providerId: fixture.priceId,
          verificationReference: `${verificationReference};supabase:23_products:${fixture.id}:absent`,
        })
      })
    }
  })
})
