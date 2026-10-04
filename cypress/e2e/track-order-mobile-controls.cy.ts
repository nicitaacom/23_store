const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("track order mobile controls", () => {
  viewports.forEach(({ width, height }) => {
    it(`keeps the order number field and submit control easy to tap at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en/track-order")

      cy.get('[data-cy="track-order-content"]').should(content => {
        expect(getComputedStyle(content[0]).paddingLeft, "phone page gutter").to.equal("0px")
        expect(getComputedStyle(content[0]).paddingRight, "phone page gutter").to.equal("0px")
      })
      cy.get('[data-cy="track-order-search-card"]').should(card => {
        expect(parseFloat(getComputedStyle(card[0]).paddingLeft), "phone card padding").to.be.at.most(8)
      })
      cy.get('[data-cy="track-order-number"]').should("be.visible").should(input => {
        expect((input[0] as HTMLInputElement).labels, "order number label").to.have.length(1)
        expect(input[0].getBoundingClientRect().height, "order number hit area").to.be.at.least(44)
      })
      cy.get('[data-cy="track-order-submit"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "track action hit area").to.be.at.least(44)
      })
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
      cy.get('[data-cy="track-order-feedback"]').scrollIntoView().should("be.visible").should(link => {
        const bounds = link[0].getBoundingClientRect()
        expect(bounds.height, "feedback link hit area after scrolling").to.be.at.least(44)
        expect(bounds.top, "feedback link stays inside short viewport").to.be.at.least(0)
        expect(bounds.bottom, "feedback link stays inside short viewport").to.be.at.most(height)
      })
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth, "no overflow after scrolling to the footer").to.be.at.most(
          document.documentElement.clientWidth,
        )
      })
    })
  })
})

export {}
