import type { Interception } from "cypress/types/net-stubbing"

import { expectRealRejection } from "../support/diagnostics"
import { recordVerifiedRoute } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = {
  id: string
  priceId: string
  ownerId: string
  price: number
  onStock: number
  translations: Record<string, { title: string; description: string }>
}
type TProductRow = {
  id: string
  price_id: string
  owner_id: string
  price: number
  on_stock: number
  translations: Record<string, { title: string; description: string }>
}

describe("monthly real-service product editing", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null
  let updateInterception: Interception | null = null

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    updateInterception = null
    cy.intercept("POST", "/api/products/update").as("updateProduct")
    cy.signIn(accounts.owner)
    const suffix = String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
    cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `edit-${suffix}`,
      title: `E2E editable product ${suffix}`,
      description: "Disposable owner-edit fixture for real request and persistence checks.",
      price: 11.25,
      onStock: 7,
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
      expect(response.status, "exact owner product cleanup").to.equal(200)
      return cy.task<TProductRow | null>("readRunProduct", fixture.id).should("equal", null)
    }).then(() => cy.task<string>("verifyStripeResourcesInactive", {
      productId: fixture.id,
      priceId: fixture.priceId,
    })).then(verificationReference => {
      return cy.task("appendE2EEvidence", {
        kind: "scenario-cleanup",
        status: "passed",
        scenarioId: "product-edit",
        resourceId: fixture.id,
        providerId: fixture.priceId,
        verificationReference: `${verificationReference};supabase:23_products:${fixture.id}:absent`,
        at: new Date().toISOString(),
      }, { log: false })
    })
  })

  it("saves from the manage page and refuses another account's update", () => {
    if (!product) throw new Error("Run-owned product fixture was not created")
    const fixture = product
    const originalStock = fixture.onStock
    const attemptedStock = originalStock + 1
    const editedTitle = `Owner-edited ${fixture.translations.en.title}`
    const editedDescription = `${fixture.translations.en.description} The saved value was read back from Supabase.`

    cy.signIn(accounts.other)
    let deniedUpdateInterception: Interception
    expectRealRejection({ method: "POST", pathname: "/api/products/update", statusCode: 403 })
    cy.window().then(browserWindow => browserWindow.fetch("/api/products/update", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: fixture.id, onStock: attemptedStock }),
    }).then(response => response.status)).then(status => {
      expect(status, "cross-account update is denied").to.equal(403)
      return cy.wait("@updateProduct", { timeout: 30000 }).then(interception => {
        deniedUpdateInterception = interception
        expect(interception.response?.statusCode).to.equal(403)
        return cy.task<TProductRow | null>("readRunProduct", fixture.id)
      })
    }).then(row => {
      expect(row?.on_stock, "denied request did not change stock").to.equal(originalStock)
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/products/update",
        scenarioId: "product-edit",
        requestId: deniedUpdateInterception.id,
        resourceId: fixture.id,
        verificationReference: `supabase:23_products:${fixture.id}:stock-unchanged-after-403`,
        details: { expectedHttpStatus: 403, ownerId: fixture.ownerId, callerId: accounts.other.id },
      })
    })

    cy.signIn(accounts.owner)
    cy.visit(`/en/products/${fixture.id}/manage`)
    cy.get('[data-cy="manage-product-info-panel"]').should("be.visible")
    cy.get("#title").clear().type(editedTitle)
    cy.get("#subTitle").clear().type(editedDescription)
    cy.get('[data-cy="manage-save"]').should("be.enabled").click()
    cy.wait("@updateProduct", { timeout: 30000 }).then(interception => {
      updateInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body.productId).to.equal(fixture.id)
      expect(interception.request.body.translations.en).to.include({ title: editedTitle, description: editedDescription })
      return cy.task<TProductRow | null>("readRunProduct", fixture.id)
    }).then(row => {
      expect(row).not.to.equal(null)
      expect(row?.translations.en).to.include({ title: editedTitle, description: editedDescription })
      expect(row?.on_stock, "editing text preserves stock").to.equal(originalStock)
      if (!row) throw new Error("Edited product row was not found")
      return cy.task<{ verificationReference: string }>("verifyStripeTestProduct", {
        productId: fixture.id,
        priceId: fixture.priceId,
        ownerId: fixture.ownerId,
        amountCents: Math.round(fixture.price * 100),
        name: row.translations.fi.title,
        description: row.translations.fi.description,
      })
    }).then(stripeReadback => {
      cy.get("#title").should("have.value", editedTitle)
      return cy.reload().then(() => {
        cy.get("#title").should("have.value", editedTitle)
        return cy.task<TProductRow | null>("readRunProduct", fixture.id)
      }).then(row => {
        expect(row?.translations.en).to.include({ title: editedTitle, description: editedDescription })
        if (!updateInterception) throw new Error("Product update request interception was not recorded")
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/products/update",
          scenarioId: "product-edit",
          requestId: updateInterception.id,
          resourceId: fixture.id,
          providerId: fixture.priceId,
          verificationReference: `supabase:23_products:${fixture.id}:translations:en;${stripeReadback.verificationReference}`,
        })
      })
    })
  })
})
