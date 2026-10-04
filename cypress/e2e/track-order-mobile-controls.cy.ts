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
    })
  })
})

export {}
