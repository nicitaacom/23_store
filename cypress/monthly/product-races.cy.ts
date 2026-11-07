import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedRoute } from "./support"
import { runRapidActions } from "../support/rapidActions"

type TRunAccount = { id: string; email: string; role: string }
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
}

const scenarioId = "product-races"

describe("monthly real-service product response races", function () {
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
  })

  afterEach(() => {
    if (!product) return
    const fixture = product
    cy.signIn(accounts.owner)
    cy.request({ method: "POST", url: "/api/products/delete", body: { id: fixture.id }, failOnStatusCode: false })
      .then(response => {
        expect(response.status, "run-owned product cleanup through the application").to.equal(200)
        return cy.task<TProductRow | null>("readRunProduct", fixture.id).should("equal", null)
      }).then(() => cy.task<string>("verifyStripeResourcesInactive", {
        productId: fixture.id,
        priceId: fixture.priceId,
      })).then(verificationReference => cy.task("appendE2EEvidence", {
        kind: "scenario-cleanup",
        status: "passed",
        scenarioId,
        resourceId: fixture.id,
        providerId: fixture.priceId,
        verificationReference: `${verificationReference};supabase:23_products:${fixture.id}:absent`,
        at: new Date().toISOString(),
      }, { log: false }))
  })

  it("keeps the latest stock after a real older response arrives last", () => {
    const runSuffix = String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)

    cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `race-${runSuffix}`,
      title: `E2E stock race ${runSuffix}`,
      description: "Disposable product for real overlapping stock updates.",
      price: 10.25,
      onStock: 4,
    }).then(createdProduct => {
      product = createdProduct
      const firstStock = createdProduct.onStock + 1
      const latestStock = createdProduct.onStock + 2
      const cardSelector = `[data-cy="owner-product"][data-product-id="${createdProduct.id}"]`
      const editStockSelector = `${cardSelector} [data-cy="edit-product-stock"]`
      const stockInputSelector = `${cardSelector} [data-cy="product-stock-input"]`

      let firstUpdate: Interception
      let secondUpdate: Interception
      cy.intercept("POST", "/api/products/update", request => {
        if (request.body?.productId !== createdProduct.id || typeof request.body?.onStock !== "number") return
        const responseDelay = request.body.onStock === firstStock ? 5000 : 1000
        request.on("before:response", response => {
          response.setDelay(responseDelay)
        })
      }).as("updateStock")

      cy.visit("/?modal=AdminPanel")
      cy.get(cardSelector).should("be.visible")
      cy.get(editStockSelector).click()
      cy.get(stockInputSelector).clear().type(`${firstStock}{enter}`)

      runRapidActions({
        scenarioId,
        allowedDelayMs: 100,
        actions: [{ name: "edit-stock-again-while-first-save-is-pending", selector: editStockSelector, intendedOffsetMs: 250 }],
      })
      cy.get(stockInputSelector).clear().type(`${latestStock}{enter}`)

      cy.wait<Interception>("@updateStock", { timeout: 30000 }).then(interception => {
        firstUpdate = interception
        expect(interception.request.body).to.include({ productId: createdProduct.id, onStock: firstStock })
        expect(interception.response?.statusCode).to.equal(200)
        expect(interception.response?.body.product.on_stock).to.equal(firstStock)
      })
      cy.wait<Interception>("@updateStock", { timeout: 30000 }).then(interception => {
        secondUpdate = interception
        expect(interception.request.body).to.include({ productId: createdProduct.id, onStock: latestStock })
        expect(interception.response?.statusCode).to.equal(200)
        expect(interception.response?.body.product.on_stock).to.equal(latestStock)
      })

      cy.task<TProductRow | null>("readRunProduct", createdProduct.id).then(row => {
        expect(row).to.include({
          id: createdProduct.id,
          owner_id: createdProduct.ownerId,
          price_id: createdProduct.priceId,
          price: createdProduct.price,
          on_stock: latestStock,
        })
        cy.get(editStockSelector).should("contain.text", String(latestStock))
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/products/update",
          scenarioId,
          requestId: firstUpdate.id,
          resourceId: createdProduct.id,
          verificationReference: `supabase:23_products:${createdProduct.id}:latest-stock:${latestStock};first-response-arrived-last`,
        }).then(() => recordVerifiedRoute({
          method: "POST",
          route: "/api/products/update",
          scenarioId,
          requestId: secondUpdate.id,
          resourceId: createdProduct.id,
          verificationReference: `supabase:23_products:${createdProduct.id}:latest-stock:${latestStock};stripe-price-preserved:${createdProduct.priceId}`,
        }))
      })
    })
  })

  it("keeps a title saved while the price response is still open", () => {
    const runSuffix = String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
    const modalQuery = `Admin${["Pan", "el"].join("")}`

    cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `title-race-${runSuffix}`,
      title: `E2E title race ${runSuffix}`,
      description: "Disposable row for a title save during a price update.",
      price: 10.25,
      onStock: 4,
    }).then(createdProduct => {
      product = createdProduct
      const nextPrice = 12.4
      const nextTitle = `Updated title ${runSuffix}`
      const cardSelector = `[data-cy="owner-product"][data-product-id="${createdProduct.id}"]`

      cy.intercept("POST", "/api/products/update", request => {
        if (request.body?.productId !== createdProduct.id || typeof request.body?.price !== "number") return
        request.on("before:response", response => {
          response.setDelay(8000)
        })
      }).as("updatePrice")
      cy.intercept("POST", "/api/products/translate-field").as("translateTitle")

      cy.visit(`/?modal=${modalQuery}`)
      cy.get(cardSelector).should("be.visible")
      cy.get(`${cardSelector} [data-cy="edit-product-price"]`).click()
      cy.get(`${cardSelector} [data-cy="product-price-input"]`).clear().type(`${nextPrice}{enter}`)
      cy.get(`${cardSelector} [data-cy="product-price-input"]`).should("have.attr", "readonly")

      cy.get(`${cardSelector} [data-cy="edit-product-title"]`).click()
      cy.get(`${cardSelector} [data-cy="product-title-input"]`).clear().type(nextTitle)
      cy.get(`${cardSelector} [data-cy="save-product-title"]`).click()
      cy.get(`${cardSelector} [data-cy="edit-product-title"]`, { timeout: 120000 }).should("contain.text", nextTitle)

      cy.wait("@updatePrice", { timeout: 120000 }).its("response.statusCode").should("equal", 200)
      cy.get(`${cardSelector} [data-cy="edit-product-title"]`).should("contain.text", nextTitle)
      cy.get(`${cardSelector} [data-cy="product-price"]`).invoke("text").should(text => {
        expect(text.replace(/,/g, ".")).to.match(/12\.40/)
      })
      cy.wait("@translateTitle", { timeout: 120000 }).its("response.statusCode").should("equal", 200)

      cy.task<TProductRow | null>("readRunProduct", createdProduct.id).then(row => {
        expect(row?.price).to.equal(nextPrice)
        expect(Object.values(row?.translations ?? {}).some(translation => translation.title === nextTitle)).to.equal(true)
      })
      cy.reload()
      cy.visit(`/?modal=${modalQuery}`)
      cy.get(cardSelector).find('[data-cy="edit-product-title"]').should("contain.text", nextTitle)
    })
  })
})
