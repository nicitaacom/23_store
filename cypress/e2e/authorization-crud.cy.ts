type TFixtureAccount = {
  id: string
  email: string
  password: string
}

type TFixtureProduct = {
  id: string
  owner_id: string
  price_id: string
  translations: Record<string, { title: string; description: string }>
  price: number
  img_url: string[]
  on_stock: number
  variants: null
  category_id: null
}

type TFixtures = {
  owner: TFixtureAccount
  other: TFixtureAccount
  ownerProduct: TFixtureProduct
  otherProduct: TFixtureProduct
}

describe("product authorization and CRUD", () => {
  let fixtures: TFixtures

  beforeEach(() => {
    cy.task<TFixtures>("prepareFixtures").then(preparedFixtures => {
      fixtures = preparedFixtures
    })
  })

  it("rejects anonymous product creation, updates, and deletion", () => {
    const requests = [
      { url: "/api/products/add", body: {} },
      { url: "/api/products/update", body: { productId: fixtures.ownerProduct.id, onStock: 20 } },
      { url: "/api/products/delete", body: { id: fixtures.ownerProduct.id } },
      { url: "/api/products/translate-insert", body: {} },
      {
        url: "/api/products/translate-field",
        body: {
          productId: fixtures.ownerProduct.id,
          field: "title",
          value: "Unauthorized title",
          translations: fixtures.ownerProduct.translations,
        },
      },
    ]

    requests.forEach(request => {
      cy.request({ method: "POST", ...request, failOnStatusCode: false })
        .its("status")
        .should("equal", 401)
    })

    cy.task("readProduct", fixtures.ownerProduct.id).should("deep.include", {
      id: fixtures.ownerProduct.id,
      owner_id: fixtures.owner.id,
      on_stock: fixtures.ownerProduct.on_stock,
    })
  })

  it("sends anonymous visitors to authentication before product management", () => {
    cy.visit("/?modal=AdminPanel")

    cy.location("search").should("include", "modal=AuthModal").and("include", "variant=login")
    cy.get('[data-cy="auth-form"]').should("be.visible")
  })

  it("updates the owner's product through the cookie-aware route", () => {
    cy.signIn(fixtures.owner)
    cy.visit("/")

    cy.request("POST", "/api/products/update", {
      productId: fixtures.ownerProduct.id,
      onStock: 17,
    }).then(response => {
      expect(response.status).to.equal(200)
      expect(response.body.product).to.include({ id: fixtures.ownerProduct.id, on_stock: 17 })
    })

    cy.task("readProduct", fixtures.ownerProduct.id).should("deep.include", {
      owner_id: fixtures.owner.id,
      on_stock: 17,
    })
  })

  it("lets an authenticated owner create a product through Supabase RLS", () => {
    const createdProduct = {
      ...fixtures.ownerProduct,
      id: "cypress-e2e-created-product",
      price_id: "cypress-e2e-created-price",
    }

    cy.task("insertProductWithRls", { account: fixtures.owner, product: createdProduct }).then(result => {
      expect(result).to.deep.include({ error: null })
      expect(result).to.have.nested.property("product.id", createdProduct.id)
      expect(result).to.have.nested.property("product.owner_id", fixtures.owner.id)
    })

    cy.task("readProduct", createdProduct.id).should("deep.include", {
      id: createdProduct.id,
      owner_id: fixtures.owner.id,
    })
  })

  it("prevents another authenticated user from updating or deleting an owner's product", () => {
    cy.signIn(fixtures.other)
    cy.visit("/")

    cy.request({
      method: "POST",
      url: "/api/products/update",
      body: { productId: fixtures.ownerProduct.id, onStock: 99 },
      failOnStatusCode: false,
    })
      .its("status")
      .should("equal", 403)

    cy.request({
      method: "POST",
      url: "/api/products/delete",
      body: { id: fixtures.ownerProduct.id },
      failOnStatusCode: false,
    })
      .its("status")
      .should("equal", 403)

    cy.task("readProduct", fixtures.ownerProduct.id).should("deep.include", {
      owner_id: fixtures.owner.id,
      on_stock: fixtures.ownerProduct.on_stock,
    })
  })

  it("lets the owner delete the product and confirms the row is gone", () => {
    cy.signIn(fixtures.owner)
    cy.visit("/")

    cy.request("POST", "/api/products/delete", { id: fixtures.ownerProduct.id }).then(response => {
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({ id: fixtures.ownerProduct.id })
    })

    cy.task("readProduct", fixtures.ownerProduct.id).should("equal", null)
  })
})

export {}
