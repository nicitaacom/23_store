type TBuyingFlowFixture = {
  admin: { id: string; email: string; password: string }
  product: { id: string }
}

type TBuyingFlowRow = {
  id: string
  event: string
  checkout_kind: string | null
  search_query: string | null
  results_count: number | null
  session_id: string
}

const SESSION_ID_KEY = "buying-flow:session-id"

function readSessionId(): Cypress.Chainable<string> {
  return cy
    .window()
    .should(appWindow => {
      expect(appWindow.sessionStorage.getItem(SESSION_ID_KEY), "buying-flow session id").to.be.a("string")
    })
    .then(appWindow => appWindow.sessionStorage.getItem(SESSION_ID_KEY) as string)
}

function waitForEvent(sessionId: string, event: string, checkoutKind?: string): Cypress.Chainable<TBuyingFlowRow[]> {
  cy.wait(750)
  return cy.task<TBuyingFlowRow[]>("readBuyingFlowEventsForSession", sessionId).should(rows => {
    expect(
      rows.some(row => row.event === event && (!checkoutKind || row.checkout_kind === checkoutKind)),
      `${event}${checkoutKind ? `:${checkoutKind}` : ""} row`,
    ).to.equal(true)
  })
}

describe("buying-flow stats", () => {
  let fixture: TBuyingFlowFixture
  let sessionId: string | null = null

  beforeEach(() => {
    cy.task<TBuyingFlowFixture>("prepareBuyingFlowFixtures").then(preparedFixture => {
      fixture = preparedFixture
      cy.signIn(fixture.admin)
    })
    cy.intercept("POST", "/api/rate-limit", { statusCode: 200, body: { remaining: 1, resetTime: "later" } })
    cy.intercept("POST", "/api/send-email", { statusCode: 200, body: { success: true } })
    cy.intercept("POST", "/api/telegram", { statusCode: 200, body: { success: true } })
  })

  afterEach(() => {
    if (sessionId) cy.task("deleteBuyingFlowEventsForSession", sessionId)
  })

  it("records the buying stages and switches the search panel", () => {
    cy.visit(`/en/products/${fixture.product.id}`)
    readSessionId().then(currentSessionId => {
      sessionId = currentSessionId
      waitForEvent(currentSessionId, "product_view")

      cy.contains("button", /add to cart/i).click()
      waitForEvent(currentSessionId, "add_to_cart")

      cy.get('[data-cy="open-cart"]').click()
      cy.get('[data-cy="request-better-prices"]').should("be.visible")
      waitForEvent(currentSessionId, "cart_open")

      cy.get('[data-cy="request-better-prices"]').click()
      waitForEvent(currentSessionId, "checkout_click", "request_better_prices")

      cy.visit("/en/search?query=buying-flow-cypress-miss")
      waitForEvent(currentSessionId, "search")

      cy.visit("/en/stats")
      cy.get('[data-cy="buying-flow-section"]').should("be.visible")
      cy.get('[data-cy="buying-flow-stage-product_view"]').should("contain.text", "Viewed")
      cy.get('[data-cy="buying-flow-stage-add_to_cart"]').should("contain.text", "Added")
      cy.get('[data-cy="buying-flow-stage-cart_open"]').should("contain.text", "Cart")
      cy.get('[data-cy="buying-flow-stage-checkout_click"]').should("contain.text", "Checkout")
      cy.get('[data-cy="buying-flow-toggle-misses"]').should("have.class", "bg-brand")
      cy.contains("buying-flow-cypress-miss").should("be.visible")
      cy.get('[data-cy="buying-flow-toggle-top"]').click().should("have.class", "bg-brand")
      cy.contains("buying-flow-cypress-miss").should("be.visible")
    })
  })
})
