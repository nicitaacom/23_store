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
        const layoutViewportWidth = dialog[0].ownerDocument.documentElement.clientWidth
        expect(bounds.left, `${width}×${height} avatar dialog left`).to.be.closeTo(0, 1)
        expect(bounds.top, `${width}×${height} avatar dialog top`).to.be.closeTo(0, 1)
        expect(bounds.width, `${width}×${height} avatar dialog width`).to.be.closeTo(layoutViewportWidth, 1)
        expect(bounds.height, `${width}×${height} avatar dialog height`).to.be.closeTo(height, 1)
      })
      cy.get('[data-cy="update-avatar-scroll"]').should(panel => {
        expect(panel[0].scrollHeight, `${width}×${height} avatar form scrolls within its height limit`).to.be.greaterThan(
          panel[0].clientHeight,
        )
      })
      cy.get('[role="dialog"] button[aria-label="Close modal"]').should("be.visible").should(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.width, "modal close touch width").to.be.at.least(44)
        expect(bounds.height, "modal close touch height").to.be.at.least(44)
        expect(bounds.top, "modal close top is visible").to.be.at.least(0)
        expect(bounds.right, "modal close right edge is visible").to.be.at.most(width)
      })
      cy.get('[role="dialog"] .image-upload h1').should("be.visible").should(heading => {
        const button = heading[0].closest("button")!
        const bounds = heading[0].getBoundingClientRect()
        const buttonBounds = button.getBoundingClientRect()
        expect(bounds.left, "upload heading stays inside the button").to.be.at.least(buttonBounds.left)
        expect(bounds.right, "upload heading stays inside the button").to.be.at.most(buttonBounds.right)
        expect(heading[0].scrollWidth, "upload heading has no clipped text").to.be.at.most(heading[0].clientWidth)
      })
      cy.get('[role="dialog"] button[aria-label]').should("be.visible").click()
      cy.get('[role="dialog"]').should("not.exist")
    })
  })
})

export {}
