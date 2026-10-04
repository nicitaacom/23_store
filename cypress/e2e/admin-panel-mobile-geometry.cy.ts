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
      cy.get('[data-cy="add-product-layout"]').scrollTo("bottom")
      cy.get('[data-cy="create-product"]').should("be.visible").and("be.disabled")
      cy.get('[data-cy="add-product-layout"]').should(layout => {
        expect(layout[0].scrollTop, "scrolling to Create moves the mobile form").to.be.greaterThan(0)
      })
      cy.get('[data-cy="admin-panel-close"]').should("be.visible").should(closeButton => {
        const bounds = closeButton[0].getBoundingClientRect()
        const panelElement = closeButton[0].closest<HTMLElement>(".halloween-panel")!
        const panel = panelElement.getBoundingClientRect()
        const header = closeButton[0].closest<HTMLElement>(".halloween-admin-header")!.getBoundingClientRect()
        const parent = closeButton[0].parentElement!.getBoundingClientRect()
        expect(
          bounds.top,
          `modal close stays in view after form scrolling (close=${bounds.top}..${bounds.bottom}, header=${header.top}..${header.bottom}, row=${parent.top}..${parent.bottom}, panel=${panel.top}..${panel.bottom}, scrollY=${closeButton[0].ownerDocument.defaultView?.scrollY})`,
        ).to.be.at.least(0)
        expect(bounds.bottom, "modal close stays in view after form scrolling").to.be.at.most(height)
      })
      if (width === 320) cy.screenshot("admin-panel-scrolled-close-after-320x480", { capture: "viewport" })
      cy.get('[data-cy="add-product-layout"]').scrollTo("top")
      cy.get('[data-testid="add-product-upload"]').should("be.visible")
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
        cy.get('[data-cy="admin-panel-close"]').should("be.visible").should(closeButton => {
          const bounds = closeButton[0].getBoundingClientRect()
          expect(bounds.top, `${action} tab close stays in view`).to.be.at.least(0)
          expect(bounds.bottom, `${action} tab close stays in view`).to.be.at.most(height)
        })
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
    cy.get('[data-cy="variant-entry-fields"]').should(fields => {
      const layout = getComputedStyle(fields[0])
      expect(layout.gridTemplateColumns.split(" "), "tablet variant fields use two columns").to.have.length(2)
      expect(fields[0].scrollWidth, "tablet variant fields have no horizontal overflow").to.be.at.most(fields[0].clientWidth)
    })
    cy.screenshot("admin-panel-tablet-after-768x568", { capture: "viewport" })
    cy.get('[data-testid="add-product-upload"]').should("be.visible")
    cy.get('[data-cy="create-product"]').scrollIntoView().should("be.visible").and("be.disabled")
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
    })
  })
})

export {}
