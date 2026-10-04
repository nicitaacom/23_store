type TFixtureAccount = {
  id: string
  email: string
  password: string
}

const mobileViewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("Admin Panel mobile geometry and actions", () => {
  let owner: TFixtureAccount

  before(() => {
    cy.task<{ owner: TFixtureAccount }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
    })
  })

  beforeEach(() => {
    cy.signIn(owner)
  })

  mobileViewports.forEach(({ width, height }) => {
    it(`keeps the panel and owner tabs usable at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/?modal=AdminPanel")
      cy.get('[data-cy="admin-panel-close"]').should("be.visible")

      cy.get('[data-cy="admin-panel-close"]').should(closeButton => {
        const panel = closeButton[0].closest<HTMLElement>(".halloween-panel")
        expect(panel, "Admin Panel element").not.to.equal(null)
        const bounds = panel!.getBoundingClientRect()
        expect(bounds.top, "panel top is inside the viewport").to.be.at.least(0)
        expect(bounds.bottom, "panel bottom is inside the viewport").to.be.at.most(height)
      })

      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })

      ;(["add", "edit", "delete", "pricing"] as const).forEach(action => {
        cy.get(`[data-cy="admin-action-${action}"]`).should("be.visible").click()
        cy.get(`[data-cy="admin-action-${action}"]`).should("have.attr", "aria-pressed", "true")
        cy.location("search").should("include", "modal=AdminPanel")
      })
    })
  })
})

export {}
