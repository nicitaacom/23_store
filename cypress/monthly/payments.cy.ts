import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedServiceOperation } from "./support"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = { id: string; priceId: string; ownerId: string }

describe("monthly real-service canceled payment screen", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    cy.signIn(accounts.owner)
    const suffix = String(Cypress.expose("E2E_RUN_ID") ?? "local").toLowerCase().replace(/[^a-z0-9]/g, "").slice(-12)
    cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `pay-cancel-${suffix}`,
      title: `E2E canceled payment ${suffix}`,
      description: "Disposable product for the canceled payment screen.",
      price: 6.5,
      onStock: 3,
    }).then(created => {
      product = created
    })
  })

  afterEach(() => {
    if (!product) return
    const fixture = product
    cy.signIn(accounts.owner)
    cy.task("cleanupRunCart", accounts.owner.id).then(() => cy.request({
      method: "POST",
      url: "/api/products/delete",
      body: { id: fixture.id },
      failOnStatusCode: false,
    })).then(response => {
      expect(response.status, "canceled-payment fixture cleanup").to.equal(200)
      return cy.task("readRunProduct", fixture.id).should("equal", null)
    }).then(() => cy.task("verifyStripeResourcesInactive", {
      productId: fixture.id,
      priceId: fixture.priceId,
    }))
  })

  it("shows the canceled payment screen after a real cart add", () => {
    const fixture = product
    if (!fixture) throw new Error("Canceled-payment fixture was not created")

    cy.intercept("POST", "/api/create-checkout-session").as("checkoutSession")
    cy.intercept("PATCH", "**/rest/v1/23_users_cart*").as("saveCart")
    cy.visit(`/en/products/${fixture.id}`)
    cy.get("h1").should("contain", "E2E canceled payment")
    cy.get(`[data-cy="add-to-cart-${fixture.id}"]`).should("be.enabled").click()
    cy.get('[data-cy="cart-quantity"]').should("have.text", "1")
    cy.wait<Interception>("@saveCart", { timeout: 20000 }).then(interception => {
      expect(interception.response?.statusCode, "cart update response").to.be.within(200, 299)
      return recordVerifiedServiceOperation({
        sourcePath: "app/storages/DBStorage.ts",
        functionName: "saveProducts",
        callName: "supabase-update",
        requestId: String(interception.id),
        scenarioId: "catalog-cart",
        resourceId: fixture.id,
        verificationReference: `supabase:23_users_cart:${accounts.owner.id}:one-item`,
        details: { accountId: accounts.owner.id, quantity: 1 },
      })
    })

    cy.visit("/en/payment?status=canceled")
    cy.get("h1", { timeout: 20000 }).should("contain", "Your payment canceled")
    cy.get("@checkoutSession.all").should("have.length", 0)
  })
})
