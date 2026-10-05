type TFixtureAccount = {
  id: string
  email: string
  password: string
}

describe("owner profile menu mobile accessibility", () => {
  let owner: TFixtureAccount

  before(() => {
    cy.task<{ owner: TFixtureAccount }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
    })
  })

  beforeEach(() => {
    cy.signIn(owner)
  })

  it("opens owner actions with the keyboard and keeps buttons usable", () => {
    cy.viewport(320, 480)
    cy.visit("/en")
    const menuButton = '[aria-label="Open profile menu"]'
    cy.get(menuButton).click()
    cy.get(menuButton).parent().find("ul button").should("have.length", 4)

    ;["Manage products", "Update avatar", "Dark mode", "Logout"].forEach(label => {
      cy.get(menuButton)
        .parent()
        .find("ul")
        .contains("button", label)
        .should("be.visible")
        .should(button => {
          expect(button[0].getBoundingClientRect().height, `${label} button height`).to.be.at.least(44)
      })
    })

    cy.get(menuButton).parent().find("ul").contains("a", "Support").should("be.visible").should(link => {
      expect(link[0].getBoundingClientRect().height, "Support link height").to.be.at.least(44)
    })
    cy.screenshot("owner-menu-before-admin-panel-320x480", { capture: "viewport" })

    cy.get(menuButton).focus()
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should("contain.text", "Manage products")
    cy.focused().click()

    cy.location("search").should("include", "modal=AdminPanel")
    cy.get('[data-cy="admin-panel-close"]').should("be.visible").and("be.enabled")
    cy.screenshot("owner-menu-admin-panel-after-320x480", { capture: "viewport" })
  })

  it("toggles mobile dark mode from its named and pressed button", () => {
    cy.viewport(320, 480)
    cy.visit("/en")
    const menuButton = '[aria-label="Open profile menu"]'
    cy.get(menuButton).click()
    cy.get(menuButton).parent().find("ul button[aria-pressed]").should("contain.text", "Dark mode").then(button => {
      const initialPressed = button.attr("aria-pressed")
      expect(initialPressed).to.be.oneOf(["true", "false"])
      cy.wrap(button).click().should("have.attr", "aria-pressed", initialPressed === "true" ? "false" : "true")
    })
  })

})

export {}
