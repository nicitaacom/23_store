import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedRoute, recordVerifiedServiceOperation } from "./support"

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
type TRunCart = Record<string, { id: string; quantity: number; variantId: string | null; designId: string | null }>
type TPopularProducts = { products?: Array<{ id: string; price: number }> }
type TProductRow = { id: string; owner_id: string } | null

type TNavigationAction = {
  name: string
  run: () => Cypress.Chainable<{ actionComplete: true }>
}

function hashSeed(seed: string) {
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededShuffle<T>(values: T[], seed: string) {
  const shuffled = [...values]
  let state = hashSeed(seed) || 1
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function expectedCart(product: TProductFixture): TRunCart {
  return { [product.id]: { id: product.id, quantity: 1, variantId: null, designId: null } }
}

describe("monthly seeded real-service navigation", function () {
  this.timeout(240000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    cy.signIn(accounts.owner)
    cy.task("cleanupRunCart", accounts.owner.id).then(() => {
      const suffix = String(Cypress.env("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-16)
      const title = `E2E navigation ${suffix}`
      const translations = Object.fromEntries(["en", "fi", "ru", "se"].map(locale => [locale, {
        title,
        description: `Disposable navigation item for run ${suffix}.`,
      }]))
      return cy.task<TProductFixture>("createProductFixture", {
        ownerId: accounts.owner.id,
        key: `navigation-${suffix}`,
        title,
        description: `Disposable navigation item for run ${suffix}.`,
        translations,
        price: 8.75,
        onStock: 7,
      }).then(createdProduct => {
        product = createdProduct
      })
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
      expect(response.status, "the exact navigation fixture is removed").to.equal(200)
      return cy.task<TProductRow>("readRunProduct", fixture.id)
    }).should("equal", null)
      .then(() => cy.task<string>("verifyStripeResourcesInactive", { productId: fixture.id, priceId: fixture.priceId }))
  })

  it("shuffles visible product, popular-catalog and support actions from the recorded seed", () => {
    if (!product) throw new Error("Run-owned navigation product was not created")
    const fixture = product
    const seed = String(Cypress.env("E2E_SEED") || Cypress.env("E2E_RUN_ID"))
    const actions: TNavigationAction[] = [
      {
        name: "open-popular-catalog",
        run: () => {
          cy.visit("/en")
          cy.intercept("GET", "**/api/popular-products*").as("loadPopularCatalog")
          cy.get('[data-cy="catalog-preview-page"]').click()
          cy.get('[data-cy="popular-products-shell"]').should("be.visible")
          return cy.wait<Interception>("@loadPopularCatalog").then(interception => {
            expect(interception.response?.statusCode).to.equal(200)
            const body = interception.response?.body as TPopularProducts
            expect(Array.isArray(body.products)).to.equal(true)
            expect(body.products?.length).to.be.greaterThan(0)
            return cy.task<TProductRow>("readRunProduct", fixture.id).then(row => {
              expect(row).to.include({ id: fixture.id, owner_id: accounts.owner.id })
              return recordVerifiedRoute({
                method: "GET",
                route: "/api/popular-products",
                scenarioId: "analytics-other",
                requestId: String(interception.id),
                resourceId: fixture.id,
                verificationReference: `supabase:23_products:${fixture.id}:run-owner-read-back;popular-api:${body.products?.length ?? 0}-real-rows`,
              }).then(() => ({ actionComplete: true as const }))
            })
          })
            .then(() => ({ actionComplete: true as const }))
        },
      },
      {
        name: "visit-product-and-add-to-cart",
        run: () => {
          cy.intercept({ method: "PATCH", url: "**/rest/v1/23_users_cart*" }).as("saveSeededCart")
          cy.visit(`/en?query=${encodeURIComponent(fixture.translations.en.title)}`)
          cy.get(`a[href="/en/products/${fixture.id}"]`).should("be.visible").click()
          cy.get("h1").should("contain.text", fixture.translations.en.title)
          cy.get(`[data-cy="add-to-cart-${fixture.id}"]`).should("be.enabled").click()
          cy.get('[data-cy="cart-quantity"]').should("have.text", "1")
          return cy.wait<Interception>("@saveSeededCart").then(interception => {
            expect(interception.response?.statusCode).to.be.within(200, 299)
            return cy.task<{ cart: TRunCart; verificationReference: string }>("waitForRunCart", {
              ownerId: accounts.owner.id,
              expected: expectedCart(fixture),
            }).then(readback => {
              expect(readback.cart).to.deep.equal(expectedCart(fixture))
              return recordVerifiedServiceOperation({
                sourcePath: "app/storages/DBStorage.ts",
                functionName: "saveProducts",
                callName: "supabase-update",
                requestId: String(interception.id),
                scenarioId: "catalog-cart",
                resourceId: fixture.id,
                verificationReference: readback.verificationReference,
                details: { accountId: accounts.owner.id, quantity: 1, generatedBySeed: seed },
              }).then(() => ({ actionComplete: true as const }))
            })
          })
            .then(() => ({ actionComplete: true as const }))
        },
      },
      {
        name: "open-and-close-support-panel",
        run: () => {
          cy.visit("/en")
          cy.get('[data-cy="open-support"]').click()
          cy.get('[data-cy="support-chat-panel"]').should("be.visible")
          cy.get('[data-cy="support-chat-close"]').click()
          cy.get('[data-cy="support-chat-panel"]').should("not.exist")
          return cy.location("pathname").then(() => ({ actionComplete: true as const }))
        },
      },
    ]
    const plannedActions = seededShuffle(actions, seed)
    const visitedTransitions: Array<{ action: string; path: string }> = []

    let actionChain = cy.then(() => ({ actionComplete: true as const }))
    for (const action of plannedActions) {
      actionChain = actionChain.then(() => action.run()).then(() => cy.location("pathname").then(path => {
        visitedTransitions.push({ action: action.name, path })
        return { actionComplete: true as const }
      }))
    }
    return actionChain.then(() => cy.task("appendE2EEvidence", {
        kind: "seeded-navigation-sequence",
        status: "passed",
        scenarioId: "seeded-navigation",
        seed,
        generatedProductId: fixture.id,
        plannedActions: plannedActions.map(action => action.name),
        visitedTransitions,
        verificationReference: `supabase:23_products:${fixture.id}:owner:${accounts.owner.id};supabase:23_users_cart:${accounts.owner.id}:generated-cart-read-back`,
        at: new Date().toISOString(),
      }, { log: false }))
  })
})
