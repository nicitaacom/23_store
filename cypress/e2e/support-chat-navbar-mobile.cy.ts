describe("support chat above the mobile navbar", () => {
  it("keeps its heading and send action visible at 320×480", () => {
    cy.viewport(320, 480)
    cy.intercept("POST", "/api/messages/get-messages", { statusCode: 200, body: [] })
    cy.visit("/en/support")
    cy.get('[data-cy="open-support"]').should("be.visible")
    cy.wait(500)
    cy.get('[data-cy="support-page-open-chat"]').should("be.visible").click()

    cy.get('[data-cy="open-support"]').should("have.attr", "aria-expanded", "true")
    cy.get('[data-cy="open-support"]').parent().should("have.css", "z-index", "1500")
    cy.get('[data-cy="open-support"]').parent().find("section").should("be.visible").should(panel => {
      const bounds = panel[0].getBoundingClientRect()
      expect(bounds.top, "popover stays below the top edge").to.be.at.least(0)
      expect(bounds.bottom, "popover stays inside the short screen").to.be.at.most(480)
    })
    cy.get('[data-cy="open-support"]').parent().find("h1").first().should("be.visible").should(heading => {
      const bounds = heading[0].getBoundingClientRect()
      expect(bounds.top, "chat heading stays inside the top edge").to.be.at.least(0)
      expect(bounds.bottom, "chat heading stays inside the viewport").to.be.at.most(480)
    })
    cy.get('[data-cy="support-message-send"]').should("be.visible").should(button => {
      const bounds = button[0].getBoundingClientRect()
      expect(bounds.width, "send touch width").to.be.at.least(44)
      expect(bounds.height, "send touch height").to.be.at.least(44)
      expect(bounds.bottom, "send action stays inside the viewport").to.be.at.most(480)
    })
    cy.get('[data-cy="support-chat-close"]').click()
    cy.get('[data-cy="support-chat-close"]').should("not.exist")
  })
})

export {}
