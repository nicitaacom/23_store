type TFixtureProduct = {
  id: string
  price: number
}

type TFixtures = {
  ownerProduct: TFixtureProduct
  otherProduct: TFixtureProduct
}

describe("anonymous customer actions", () => {
  let fixtures: TFixtures

  beforeEach(() => {
    cy.task<TFixtures>("prepareFixtures").then(preparedFixtures => {
      fixtures = preparedFixtures
    })
  })

  it("keeps cart quantities and totals accurate and requests better prices", () => {
    const cartRecord = {
      [fixtures.ownerProduct.id]: { id: fixtures.ownerProduct.id, quantity: 2, variantId: null },
      [fixtures.otherProduct.id]: { id: fixtures.otherProduct.id, quantity: 1, variantId: null },
    }
    const expectedTotal = fixtures.ownerProduct.price * 2 + fixtures.otherProduct.price

    cy.visit("/")
    cy.window().invoke("localStorage.setItem", "cart", JSON.stringify({ state: { products: cartRecord }, version: 0 }))

    cy.intercept("POST", "/api/rate-limit", { statusCode: 200, body: { success: true } }).as("rateLimit")
    cy.intercept("POST", "/api/send-email", request => {
      expect(request.body.subject).to.equal("New Better Price Request")
      expect(request.body.html).to.include(String(expectedTotal))
      request.reply({ statusCode: 200, body: { id: "cypress-email" } })
    }).as("sendEmail")
    cy.intercept("POST", "/api/telegram", { statusCode: 200, body: { ok: true } }).as("sendTelegram")

    cy.visit("/?modal=CartModal")
    cy.get('[data-cy="cart-quantity"]').should("contain", "3")
    cy.get('[data-cy="cart-subtotal"]').should("contain", String(expectedTotal))
    cy.get('[data-cy="cart-total"]').should("contain", String(expectedTotal))

    cy.get('[data-cy="request-better-prices"]').click()
    cy.wait(["@rateLimit", "@sendEmail", "@sendTelegram"])
  })

  it("lets an anonymous visitor contact support", () => {
    const message = "Anonymous Cypress support request"

    cy.intercept("POST", "/api/messages/get-messages", { statusCode: 200, body: [] }).as("getMessages")
    cy.intercept("POST", "/api/telegram", { statusCode: 200, body: { ok: true } }).as("sendTelegram")
    cy.intercept("POST", "/api/tickets/open", { statusCode: 200, body: { status: 200 } }).as("openTicket")
    cy.intercept("POST", "/api/message/send", { statusCode: 200, delay: 1000, body: { status: 200 } }).as("sendMessage")

    cy.visit("/")
    cy.wait("@getMessages")
    cy.get('[data-cy="open-support"]').click()
    cy.get('[data-cy="support-message-input"]').type(message)
    cy.get('[data-cy="support-message-send"]').click()

    cy.contains(message).should("be.visible")
    cy.wait(["@sendTelegram", "@openTicket", "@sendMessage"])
  })
})

export {}
