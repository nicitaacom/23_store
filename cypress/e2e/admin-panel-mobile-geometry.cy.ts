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

function assertAdminButtonsMeetMobileSize() {
  cy.get('[role="dialog"] button:visible').each(button => {
    const bounds = button[0].getBoundingClientRect()
    expect(bounds.width, `${button.text().trim() || button.attr("aria-label")} button width`).to.be.at.least(44)
    expect(Math.round(bounds.height), `${button.text().trim() || button.attr("aria-label")} button height`).to.be.at.least(44)
  })
}

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
        const closeBounds = closeButton[0].getBoundingClientRect()
        expect(closeBounds.width, "close control width").to.be.at.least(44)
        expect(Math.round(closeBounds.height), "close control height").to.be.at.least(44)
        const panel = closeButton[0].closest<HTMLElement>(".halloween-panel")
        expect(panel, "Admin Panel element").not.to.equal(null)
        const bounds = panel!.getBoundingClientRect()
        expect(bounds.top, "panel top is inside the viewport").to.be.at.least(0)
        expect(bounds.bottom, "panel bottom is inside the viewport").to.be.at.most(height)
      })

      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })

      cy.get('[data-cy="admin-action-add"]').click().should("have.attr", "aria-pressed", "true")
      cy.get("#title").then(title => {
        expect((title[0] as HTMLInputElement).labels, "title input has an associated label").to.have.length(1)
      })
      cy.get("#add-product-description").should("have.attr", "aria-labelledby", "add-product-description-label")
      cy.get('[data-testid="add-product-upload"]').should("be.visible")
      cy.get('[data-cy="category-dropdown-trigger"]')
        .should("have.attr", "aria-labelledby", "add-product-category-label")
        .should("not.have.attr", "tabindex", "-1")
        .click()
        .should("have.attr", "aria-expanded", "true")
      cy.get('[data-cy="category-dropdown-search"]')
        .should("be.visible")
        .and("have.attr", "aria-label")
      cy.get('[data-cy="category-dropdown-trigger"]').click().should("have.attr", "aria-expanded", "false")
      cy.get('[data-cy="add-product-layout"]').should(layout => {
        expect(layout[0].scrollHeight, "one mobile scroll area contains the full form")
          .to.be.greaterThan(layout[0].clientHeight)
      })
      assertAdminButtonsMeetMobileSize()
      cy.get('[data-cy^="admin-action-"]').each(button => {
        expect(Math.round(button[0].getBoundingClientRect().height), `${button.text()} tab touch height`).to.be.at.least(44)
      })
      cy.get('[data-cy="create-product"]').scrollIntoView().should("be.visible").and("be.disabled")
      cy.get('[data-cy="add-product-layout"]').should(layout => {
        expect(layout[0].scrollTop, "scrolling to Create moves the mobile form").to.be.greaterThan(0)
      })
      cy.get('[data-testid="add-product-upload"]').scrollIntoView().should("be.visible")
      cy.get("#add-product-description").type("Mobile copy")
      cy.get('button[aria-label="Bold (**text**)"]')
        .should("not.have.attr", "tabindex", "-1")
        .should(button => {
          const bounds = button[0].getBoundingClientRect()
          expect(bounds.width, "bold toolbar touch width").to.be.at.least(44)
          expect(bounds.height, "bold toolbar touch height").to.be.at.least(44)
        })
        .focus()
      cy.press(Cypress.Keyboard.Keys.ENTER)
      cy.get("#add-product-description").should("be.focused")

      ;(["add", "edit", "delete", "pricing"] as const).forEach(action => {
        cy.get(`[data-cy="admin-action-${action}"]`).should("be.visible").click()
        cy.get(`[data-cy="admin-action-${action}"]`).should("have.attr", "aria-pressed", "true")
        cy.location("search").should("include", "modal=AdminPanel")
        assertAdminButtonsMeetMobileSize()
      })
    })
  })

  it("keeps the split Add layout and inner scrolling at tablet width", () => {
    cy.viewport(768, 568)
    cy.visit("/?modal=AdminPanel")
    cy.get('[data-cy="admin-panel-close"]').should("be.visible")
    cy.get('[data-cy="add-product-layout"]').should("have.css", "display", "grid")
    cy.get('[data-testid="add-product-upload"]').should("be.visible")
    cy.get('[data-cy="create-product"]').scrollIntoView().should("be.visible").and("be.disabled")
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
    })
  })
})

export {}
