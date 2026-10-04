type TFixtureAccount = {
  id: string
  email: string
  password: string
}

describe("Admin Panel network recovery on mobile", () => {
  let owner: TFixtureAccount

  before(() => {
    cy.task<{ owner: TFixtureAccount }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
    })
  })

  beforeEach(() => {
    cy.signIn(owner)
  })

  it("keeps pricing usable and retries after the settings request loses connection", () => {
    cy.viewport(320, 480)
    let connectionAvailable = false
    let recoveredRequests = 0
    cy.intercept("GET", "/api/products/ai-pricing", request => {
      if (!connectionAvailable) {
        request.reply({ forceNetworkError: true })
        return
      }

      recoveredRequests += 1
      request.reply({ statusCode: 200, body: { globalEnabled: false, products: [], proposals: [] } })
    })

    cy.visit("/?modal=AdminPanel")
    cy.get('[data-cy="admin-panel-close"]').should("be.visible")
    cy.get('[data-cy="admin-action-pricing"]')
      .scrollIntoView()
      .should("be.visible")
      .click()
      .should("have.attr", "aria-pressed", "true")
    cy.contains("button", /Retry|Yritä uudelleen|Försök igen|Повторить/)
      .should("be.visible")
      .then(retryButton => {
        connectionAvailable = true
        cy.wrap(retryButton).click()
      })
    cy.contains("button", /Retry|Yritä uudelleen|Försök igen|Повторить/).should("not.exist")
    cy.then(() => expect(recoveredRequests).to.equal(1))
    cy.get('[data-cy="admin-panel-close"]').should("be.visible")
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
    })
  })
})

export {}
