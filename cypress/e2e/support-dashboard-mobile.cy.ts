type TSupportMobileFixtures = {
  support: { id: string; email: string; password: string }
  ticketId: string
  messageBody: string
}

const mobileViewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("signed-in support dashboard mobile layout", () => {
  let fixtures: TSupportMobileFixtures

  before(() => {
    cy.task<TSupportMobileFixtures>("prepareSupportFixtures").then(preparedFixtures => {
      fixtures = preparedFixtures
    })
  })

  beforeEach(() => {
    cy.signIn(fixtures.support)
  })

  after(() => {
    if (fixtures?.ticketId) cy.task("cleanupSupportFixtures", fixtures.ticketId)
  })

  mobileViewports.forEach(({ width, height }) => {
    it(`keeps the support inbox and conversation usable at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en/support/tickets")

      cy.location("pathname").should("include", "/support/tickets")
      cy.get("aside").filter(":visible").as("mobileInbox")
      cy.get("@mobileInbox").contains("h2", "Open tickets").should("be.visible")
      cy.get("@mobileInbox").find('input[placeholder]').should("be.visible").should(input => {
        const bounds = input[0].getBoundingClientRect()
        expect(bounds.height, "support search touch height").to.be.at.least(44)
      })
      cy.get("aside.block").find(`a[href*="${fixtures.ticketId}"]`).should("exist").then(link => {
        const bounds = link[0].getBoundingClientRect()
        expect(bounds.width, "ticket link touch width").to.be.at.least(44)
        expect(bounds.height, "ticket link touch height").to.be.at.least(44)
        const ticketHref = link.attr("href")
        expect(ticketHref).to.include(fixtures.ticketId)
        cy.visit(ticketHref!)
      })

      cy.location("pathname").should("include", fixtures.ticketId)
      cy.get("main ul.panel-scroll").contains(fixtures.messageBody).should("be.visible")
      cy.get('[data-cy="support-message-input"]').should("be.visible")
      cy.get('[data-cy="support-message-send"]').should("be.visible").should(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.width, "send button touch width").to.be.at.least(44)
        expect(bounds.height, "send button touch height").to.be.at.least(44)
      })
      cy.contains("button", "Close").should("be.visible").should(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.width, "close ticket touch width").to.be.at.least(44)
        expect(bounds.height, "close ticket touch height").to.be.at.least(44)
      })

      cy.document().should(document => {
        const viewportWidth = document.documentElement.clientWidth
        const renderedWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
        expect(renderedWidth, `support conversation at ${width}px`).to.be.at.most(viewportWidth)
      })
    })
  })
})

export {}
