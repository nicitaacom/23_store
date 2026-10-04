describe("support chat on an extremely short phone", () => {
  it("uses a fullscreen panel with a visible header, send action, and close control at 320×320", () => {
    cy.viewport(320, 320)
    cy.intercept("POST", "/api/messages/get-messages", { statusCode: 200, body: [] })
    cy.visit("/en/support")
    cy.get('[data-cy="open-support"]').should("be.visible")
    cy.wait(500)
    cy.get('[data-cy="support-page-open-chat"]').should("be.visible").click()

    cy.get('[data-cy="open-support"]').should("have.attr", "aria-expanded", "true")
    cy.get('[data-cy="open-support"]').parent().should("have.css", "z-index", "1500")
    cy.get('[data-cy="open-support"]').parent().find("section").should("be.visible").should(panel => {
      const bounds = panel[0].getBoundingClientRect()
      expect(bounds.left, "chat panel is edge to edge").to.equal(0)
      expect(bounds.top, "chat panel begins at the top edge").to.equal(0)
      expect(bounds.width, "chat panel fills phone width").to.equal(320)
      expect(bounds.height, "chat panel fills short phone height").to.equal(320)
      expect(getComputedStyle(panel[0]).borderWidth, "fullscreen chat has no border").to.equal("0px")
    })
    cy.get('[data-cy="open-support"]').parent().find("h1").first().should("be.visible").should(heading => {
      const bounds = heading[0].getBoundingClientRect()
      expect(bounds.top, "chat title is below the top edge").to.be.at.least(0)
      expect(bounds.bottom, "chat title stays in the viewport").to.be.at.most(320)
    })
    cy.get('[data-cy="support-message-input"]').should("be.visible")
    cy.get('[data-cy="support-message-send"]').should("be.visible").should(button => {
      const bounds = button[0].getBoundingClientRect()
      expect(bounds.width, "send touch width").to.be.at.least(44)
      expect(bounds.height, "send touch height").to.be.at.least(44)
      expect(bounds.bottom, "send action stays inside the viewport").to.be.at.most(320)
    })
    cy.get('[data-cy="support-chat-close"]').should("be.visible").should(button => {
      const bounds = button[0].getBoundingClientRect()
      expect(bounds.width, "close touch width").to.be.at.least(44)
      expect(bounds.height, "close touch height").to.be.at.least(44)
      expect(bounds.top, "close remains inside the top edge").to.be.at.least(0)
      expect(bounds.right, "close remains inside the right edge").to.be.at.most(320)
    })
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth, "no horizontal overflow").to.be.at.most(320)
      expect(getComputedStyle(document.body).overflowY, "page scroll is locked behind fullscreen chat").to.equal("hidden")
    })
    cy.screenshot("support-chat-fullscreen-after-320x320", { capture: "viewport" })

    cy.get('[data-cy="support-chat-close"]').click()
    cy.get('[data-cy="open-support"]').should("have.attr", "aria-expanded", "false")
    cy.get('[data-cy="support-chat-close"]').should("not.exist")
  })
})

export {}
