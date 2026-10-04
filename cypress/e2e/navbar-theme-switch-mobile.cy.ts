type TFixtureAccount = {
  id: string
  email: string
  password: string
}

describe("compact navigation theme switch", () => {
  let owner: TFixtureAccount

  before(() => {
    cy.task<{ owner: TFixtureAccount }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
    })
  })

  beforeEach(() => {
    cy.signIn(owner)
  })

  it("keeps the compact header theme switch named and sized for touch", () => {
    cy.viewport(501, 568)
    cy.visit("/en")
    cy.get('[role="switch"][aria-label="Dark mode"]')
      .should("be.visible")
      .should(toggle => {
        const bounds = toggle[0].getBoundingClientRect()
        expect(bounds.width, "theme switch hit area width").to.be.at.least(44)
        expect(bounds.height, "theme switch hit area height").to.be.at.least(44)
      })
      .then(toggle => {
        const initialChecked = toggle.attr("aria-checked")
        cy.wrap(toggle).click().should("have.attr", "aria-checked", initialChecked === "true" ? "false" : "true")
      })
  })
})

export {}
