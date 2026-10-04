const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("support page mobile controls", () => {
  viewports.forEach(({ width, height }) => {
    it(`keeps live chat reachable at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.intercept("POST", "/api/messages/get-messages", { statusCode: 200, body: [] })
      cy.visit("/en/support")

      cy.get('[data-cy="support-page-open-chat"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "support page chat hit area").to.be.at.least(44)
      }).scrollIntoView().click()

      cy.get('[data-cy="open-support"]').parent().should("have.css", "z-index", "1500")
      cy.get('[data-cy="open-support"]').parent().find("h1").should("be.visible").should(heading => {
        const bounds = heading[0].getBoundingClientRect()
        expect(bounds.top, "chat heading stays below the top edge").to.be.at.least(0)
        expect(bounds.bottom, "chat heading stays inside the viewport").to.be.at.most(height)
      })
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
    })
  })
})

export {}
