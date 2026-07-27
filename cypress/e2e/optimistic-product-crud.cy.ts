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
  ownerProduct: TFixtureProduct
}

function openOwnerProduct(fixtures: TFixtures, action: "edit" | "delete") {
  cy.signIn(fixtures.owner)
  cy.intercept("GET", "/api/categories/select").as("selectCategories")
  cy.visit("/?modal=AdminPanel")
  cy.wait("@selectCategories")
  cy.get(`[data-cy="admin-action-${action}"]`).click()
  cy.get(`[data-product-id="${fixtures.ownerProduct.id}"]`).scrollIntoView().should("be.visible")
}

describe("optimistic product CRUD", () => {
  let fixtures: TFixtures

  beforeEach(() => {
    cy.task<TFixtures>("prepareFixtures").then(preparedFixtures => {
      fixtures = preparedFixtures
    })
  })

  it("shows a price update immediately and keeps the confirmed server value", () => {
    openOwnerProduct(fixtures, "edit")
    const updatedProduct = { ...fixtures.ownerProduct, price: 199 }

    cy.intercept("POST", "/api/products/update", request => {
      expect(request.body).to.deep.equal({ productId: fixtures.ownerProduct.id, price: 199 })
      request.reply({ statusCode: 200, delay: 900, body: { product: updatedProduct } })
    }).as("updatePrice")

    const productSelector = `[data-cy="owner-product"][data-product-id="${fixtures.ownerProduct.id}"]`
    cy.get(productSelector).find('[data-cy="edit-product-price"]').click()
    cy.get(productSelector).find('[data-cy="product-price-input"]').clear().type("199{enter}")

    cy.get(productSelector).find('[data-cy="product-price"]').should("contain", "199")
    cy.wait("@updatePrice")
    cy.get(productSelector).find('[data-cy="product-price"]').should("contain", "199")
  })

  it("restores the last confirmed price when the update fails", () => {
    openOwnerProduct(fixtures, "edit")

    cy.intercept("POST", "/api/products/update", {
      statusCode: 500,
      delay: 900,
      body: { error: "Cypress forced update failure" },
    }).as("updatePrice")

    const productSelector = `[data-cy="owner-product"][data-product-id="${fixtures.ownerProduct.id}"]`
    cy.get(productSelector).find('[data-cy="edit-product-price"]').click()
    cy.get(productSelector).find('[data-cy="product-price-input"]').clear().type("199{enter}")

    cy.get(productSelector).find('[data-cy="product-price"]').should("contain", "199")
    cy.wait("@updatePrice")
    cy.get(productSelector).find('[data-cy="product-price"]').should("contain", String(fixtures.ownerProduct.price))
  })

  it("removes a product immediately and restores it after deletion fails", () => {
    openOwnerProduct(fixtures, "delete")

    cy.intercept("POST", "/api/products/delete", {
      statusCode: 500,
      delay: 2500,
      body: { error: "Cypress forced deletion failure" },
    }).as("deleteProduct")

    const productSelector = `[data-cy="delete-product"][data-product-id="${fixtures.ownerProduct.id}"]`
    cy.get(productSelector).find('[data-cy="request-product-delete"]').click()
    cy.get('[data-cy="confirm-product-delete"]').click()

    cy.get(productSelector, { timeout: 1000 }).should("not.exist")
    cy.wait("@deleteProduct")
    cy.get(productSelector).scrollIntoView().should("be.visible")
  })
})

export {}
