describe("popular products banner on mobile", () => {
  it("uses accessible 44px banner controls and changes the selected slide", () => {
    cy.viewport(320, 480)
    cy.visit("/en/popular-products")
    cy.get("h1").should("be.visible")
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
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
    })
  })
})

export {}
