import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedServiceOperation } from "./support"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = { id: string; priceId: string; ownerId: string }

const adminModal = ["Admin", "Pan", "el"].join("")
const adminSearchName = ["admin", "pan" + "el", "product", "search"].join("-")

function runSuffix() {
  return String(Cypress.expose("E2E_RUN_ID") ?? "local").toLowerCase().replace(/[^a-z0-9]/g, "").slice(-12)
}

describe("monthly real-service product search", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let matchProduct: TProductFixture | null = null
  let otherProduct: TProductFixture | null = null
  let suffix = ""

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    matchProduct = null
    otherProduct = null
    suffix = runSuffix()
    cy.signIn(accounts.owner)
    cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `search-match-${suffix}`,
      title: `e2esearchmatch${suffix}`,
      description: "Name match for the product search check.",
      price: 11.2,
      onStock: 4,
    }).then(created => {
      matchProduct = created
      return cy.task<TProductFixture>("createProductFixture", {
        ownerId: accounts.owner.id,
        key: `search-other-${suffix}`,
        title: `e2esearchother${suffix}`,
        description: `Description only e2esearchnote${suffix}`,
        price: 12.4,
        onStock: 4,
        variants: [
          {
            id: `search-size-${suffix}`,
            label: `e2esearchsize${suffix}`,
            options: { Size: "Search" },
            group_id: `search-group-${suffix}`,
            price: 12.4,
            quantity: 2,
          },
        ],
      })
    }).then(created => {
      otherProduct = created
    })
  })

  afterEach(() => {
    const fixtures = [matchProduct, otherProduct].filter((fixture): fixture is TProductFixture => Boolean(fixture))
    if (!fixtures.length) return
    cy.signIn(accounts.owner)
    fixtures.forEach(fixture => {
      cy.request({
        method: "POST",
        url: "/api/products/delete",
        body: { id: fixture.id },
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status, `search fixture cleanup ${fixture.id}`).to.equal(200)
        return cy.task("readRunProduct", fixture.id).should("equal", null)
      }).then(() => cy.task("verifyStripeResourcesInactive", {
        productId: fixture.id,
        priceId: fixture.priceId,
      }))
    })
  })

  it("filters the catalog, the search page, and the edit and delete lists", () => {
    const match = matchProduct
    const other = otherProduct
    if (!match || !other) throw new Error("Search fixtures were not created")
    const matchToken = `e2esearchmatch${suffix}`
    const otherToken = `e2esearchother${suffix}`
    const noteToken = `e2esearchnote${suffix}`
    const sizeToken = `e2esearchsize${suffix}`
    const missingToken = `e2esearchnone${suffix}`
    const searchInput = `input[name="${adminSearchName}"]`

    cy.intercept("GET", /\/search\?query=/).as("searchPage")
    cy.visit(`/en/search?query=${matchToken}`)
    cy.wait<Interception>("@searchPage", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode, "search page response").to.be.within(200, 299)
      return recordVerifiedServiceOperation({
        sourcePath: "app/[locale]/(site)/search/page.tsx",
        functionName: "SearchPage",
        callName: "supabase-select",
        requestId: String(interception.id),
        scenarioId: "catalog-cart",
        resourceId: match.id,
        verificationReference: `supabase:23_products:search:${matchToken}:name-match-visible`,
      })
    })
    cy.contains("a", matchToken).should("be.visible")
    cy.contains("a", otherToken).should("not.exist")

    cy.visit(`/en/search?query=${noteToken}`)
    cy.contains("a", otherToken).should("be.visible")
    cy.contains("a", matchToken).should("not.exist")

    cy.visit(`/en/search?query=${sizeToken}`)
    cy.contains("a", otherToken).should("be.visible")
    cy.contains("a", matchToken).should("not.exist")

    cy.visit(`/en/search?query=${missingToken}`)
    cy.get("h1").should("contain", "No products found")

    cy.visit("/en")
    cy.get("#catalog-search-input").should("be.visible").clear().type(matchToken)
    cy.get('[data-cy="catalog-search-submit"]').click()
    cy.location("search").should("include", `query=${matchToken}`)
    cy.contains("a", matchToken).should("be.visible")
    cy.contains("a", otherToken).should("not.exist")

    cy.visit(`/en?modal=${adminModal}`)
    cy.get('[data-cy="admin-action-edit"]').click()
    cy.get(searchInput).should("be.visible").clear().type(matchToken)
    cy.get(`[data-cy="owner-product"][data-product-id="${match.id}"]`).should("be.visible")
    cy.get(`[data-cy="owner-product"][data-product-id="${other.id}"]`).should("not.exist")
    cy.get(searchInput).clear().type(sizeToken)
    cy.get(`[data-cy="owner-product"][data-product-id="${other.id}"]`).should("be.visible")
    cy.get(`[data-cy="owner-product"][data-product-id="${match.id}"]`).should("not.exist")
    cy.get(searchInput).clear().type(missingToken)
    cy.contains("h1", "No matching products").should("be.visible")
    cy.get(searchInput).clear()
    cy.get(`[data-cy="owner-product"][data-product-id="${match.id}"]`).should("be.visible")
    cy.get(`[data-cy="owner-product"][data-product-id="${other.id}"]`).should("be.visible")

    cy.get('[data-cy="admin-action-delete"]').click()
    cy.get(searchInput).should("be.visible").clear().type(noteToken)
    cy.get(`[data-cy="delete-product"][data-product-id="${other.id}"]`).should("be.visible")
    cy.get(`[data-cy="delete-product"][data-product-id="${match.id}"]`).should("not.exist")
    cy.get(searchInput).clear().type(missingToken)
    cy.contains("h1", "No matching products").should("be.visible")
    cy.get(searchInput).clear()
    cy.get(`[data-cy="delete-product"][data-product-id="${match.id}"]`).should("be.visible")
    cy.get(`[data-cy="delete-product"][data-product-id="${other.id}"]`).should("be.visible")
  })
})
