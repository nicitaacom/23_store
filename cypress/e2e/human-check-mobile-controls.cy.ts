const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("human check mobile controls", () => {
  viewports.forEach(({ width, height }) => {
    it(`keeps the return action easy to tap at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en/human-check")

      cy.get('[data-cy="human-check-back-to-main"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "back action hit area").to.be.at.least(44)
      }).click()

      cy.contains("Browse the full catalog").should("be.visible")
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
    })
  })
})

export {}
