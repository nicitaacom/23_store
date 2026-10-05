type TCartFixture = {
  ownerProduct: { id: string }
}

describe("clear-cart confirmation on a short phone", () => {
  let fixture: TCartFixture

  before(() => {
    cy.task<TCartFixture>("prepareFixtures").then(preparedFixtures => {
      fixture = preparedFixtures
    })
  })

  it("keeps confirmation actions easy to tap at 320×320", () => {
    const viewportHeight = 320
    cy.viewport(320, viewportHeight)
    cy.visit("/en/?modal=CartModal", {
      // Seed storage before the cart store reads it, as in cart-modal-mobile.cy.ts.
      // eslint-disable-next-line local-rules/no-banned-words
      onBeforeLoad(window) {
        window.localStorage.setItem(
          "cart",
          JSON.stringify({
            state: { products: { [fixture.ownerProduct.id]: { id: fixture.ownerProduct.id, quantity: 1, variantId: null } } },
            version: 0,
          }),
        )
      },
    })
    cy.get('[data-cy="cart-quantity"]').should("contain", "1")
    cy.contains("button", "Clear cart").scrollIntoView().click()

    cy.get('[role="dialog"]').last().should("be.visible").should(dialog => {
      const bounds = dialog[0].getBoundingClientRect()
      expect(bounds.left, "confirmation left edge").to.be.closeTo(0, 1)
      expect(bounds.top, "confirmation top edge").to.be.closeTo(0, 1)
      expect(bounds.width, "confirmation width").to.be.closeTo(320, 1)
      expect(bounds.height, "confirmation height").to.be.closeTo(viewportHeight, 1)
      expect(getComputedStyle(dialog[0]).borderWidth, "confirmation border").to.equal("0px")
    })
    cy.screenshot("clear-cart-confirmation-after-320x320", { capture: "viewport" })

    cy.get('[role="dialog"]').last().find("button").each(button => {
      const bounds = button[0].getBoundingClientRect()
      const label = button.attr("aria-label") || button.text().trim() || "confirmation action"
      expect(bounds.width, `${label} hit width`).to.be.at.least(44)
      expect(bounds.height, `${label} hit height`).to.be.at.least(44)
      expect(bounds.left, `${label} left edge`).to.be.at.least(0)
      expect(bounds.right, `${label} right edge`).to.be.at.most(320)
      expect(bounds.top, `${label} top edge`).to.be.at.least(0)
      expect(bounds.bottom, `${label} bottom edge`).to.be.at.most(viewportHeight)
    })

    cy.document().should(document => {
      expect(document.documentElement.scrollWidth, "confirmation has no horizontal overflow").to.be.at.most(320)
    })
    cy.contains('[role="dialog"] button', "Back").click()
    cy.get('[role="dialog"]').should("have.length", 1)
  })
})

export {}
