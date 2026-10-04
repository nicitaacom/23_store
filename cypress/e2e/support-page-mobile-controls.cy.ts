const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("support page mobile controls", () => {
  viewports.forEach(({ width, height }) => {
    it(`keeps live chat reachable at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en/support")

      cy.get('[data-cy="support-page-layout"]').should(page => {
        expect(getComputedStyle(page[0]).paddingLeft, "phone page gutter").to.equal("0px")
        expect(getComputedStyle(page[0]).paddingRight, "phone page gutter").to.equal("0px")
      })
      cy.get('[data-cy="support-option-card"]').should(card => {
        expect(parseFloat(getComputedStyle(card[0]).paddingLeft), "phone card padding").to.be.at.most(8)
      })
      cy.get('[data-cy="support-page-open-chat"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "support page chat hit area").to.be.at.least(44)
      })
      cy.get('[data-cy="open-support"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "floating chat hit area").to.be.at.least(44)
      })
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
    })
  })
})

export {}
