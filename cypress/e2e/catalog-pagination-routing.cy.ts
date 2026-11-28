describe("catalog pagination", () => {
  it("changes products and browser history without reloading or requesting the catalog again", () => {
    cy.visit("/en?page=1&perPage=5")
    cy.get('nav[aria-label="Pagination"] a[aria-label="Next page"]').should("not.have.attr", "aria-disabled", "true")
    cy.get('a[href*="/products/"]').first().invoke("attr", "href").then(firstProduct => {
      cy.document().then(originalDocument => {
        const catalogRequests: string[] = []
        cy.intercept({ method: "GET", pathname: "/en" }, request => {
          catalogRequests.push(request.url)
        })

        cy.get('nav[aria-label="Pagination"] a[aria-label="Next page"]').click()
        cy.location("search").should("include", "page=2")
        cy.get('a[href*="/products/"]').first().should("not.have.attr", "href", firstProduct)
        cy.document().should("equal", originalDocument)

        cy.go("back")
        cy.location("search").should("include", "page=1")
        cy.get('a[href*="/products/"]').first().should("have.attr", "href", firstProduct)
        cy.go("forward")
        cy.location("search").should("include", "page=2")
        cy.get('a[href*="/products/"]').first().should("not.have.attr", "href", firstProduct)
        cy.document().should("equal", originalDocument)
        cy.then(() => expect(catalogRequests).to.have.length(0))
      })
    })
  })
})

export {}
