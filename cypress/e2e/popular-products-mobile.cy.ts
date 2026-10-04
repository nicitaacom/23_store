const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("popular products banner on mobile", () => {
  viewports.forEach(({ width, height }) => {
    it(`uses compact layout and accessible banner controls at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en/popular-products")
      cy.get("h1").should("be.visible")
      if (width === 320) {
        cy.document().then(document => {
          document.querySelectorAll("nextjs-portal").forEach(portal => portal.remove())
        })
        cy.screenshot("popular-products-compact-after-320x480", { capture: "viewport" })
      }
      cy.get('[data-cy="popular-banner-selector"]').should("have.length", 3).then(buttons => {
        const selectedIndex = buttons.toArray().findIndex(button => button.getAttribute("aria-pressed") === "true")
        const nextIndex = (selectedIndex + 1) % buttons.length
        const nextButton = buttons.eq(nextIndex)
        const bounds = nextButton[0].getBoundingClientRect()
        expect(bounds.width, "banner navigation touch width").to.be.at.least(44)
        expect(bounds.height, "banner navigation touch height").to.be.at.least(44)
        expect(nextButton.attr("aria-label")?.length ?? 0, "banner navigation label length").to.be.greaterThan(0)
        nextButton.click()
        cy.wrap(nextButton).should("have.attr", "aria-pressed", "true")
      })
      cy.get("button:visible").each(button => {
        expect(button[0].getBoundingClientRect().height, "visible mobile button hit area").to.be.at.least(44)
      })
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
    })
  })
})

export {}
