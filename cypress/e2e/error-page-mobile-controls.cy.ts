const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("error page mobile controls", () => {
  viewports.forEach(({ width, height }) => {
    it(`keeps the error actions easy to tap at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en/error?error_description=Mobile%20layout%20audit")

      cy.get('[data-cy="error-report-support"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "report action hit area").to.be.at.least(44)
      })
      cy.get('[data-cy="error-back-to-main"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "back action hit area").to.be.at.least(44)
      })

      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
    })
  })
})

export {}
