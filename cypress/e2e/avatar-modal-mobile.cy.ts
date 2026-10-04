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

describe("avatar editor on short mobile screens", () => {
  let owner: TFixtureAccount

  before(() => {
    cy.task<{ owner: TFixtureAccount }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
    })
  })

  beforeEach(() => {
    cy.signIn(owner)
  })

  it("keeps the avatar editor and its close button inside small and short viewports", () => {
    mobileViewports.forEach(({ width, height }) => {
      cy.viewport(width, height)
      cy.visit("/en")
      cy.get('[aria-label="Open profile menu"]').click()
      cy.get('[aria-label="Open profile menu"]').parent().find("ul").contains("button", "Update avatar").click()
      cy.get('[role="dialog"]').should("be.visible").should(dialog => {
        const bounds = dialog[0].getBoundingClientRect()
        expect(bounds.top, `${width}×${height} avatar dialog top`).to.be.at.least(0)
        expect(bounds.bottom, `${width}×${height} avatar dialog bottom`).to.be.at.most(height)
      })
      cy.get('[data-cy="update-avatar-scroll"]').should(panel => {
        expect(panel[0].scrollHeight, `${width}×${height} avatar form scrolls within its height limit`).to.be.greaterThan(
          panel[0].clientHeight,
        )
      })
      cy.get('[role="dialog"] button[aria-label]').should("be.visible").click()
      cy.get('[role="dialog"]').should("not.exist")
    })
  })
})

export {}
