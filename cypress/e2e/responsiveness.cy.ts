const viewports = [
  { width: 320, height: 568, label: "small mobile" },
  { width: 414, height: 896, label: "large mobile" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 1024, height: 768, label: "laptop" },
  { width: 1440, height: 900, label: "desktop" },
  { width: 1920, height: 1080, label: "wide desktop" },
]

describe("responsive layout", () => {
  viewports.forEach(viewport => {
    it(`has no horizontal overflow at the ${viewport.label} size`, () => {
      cy.viewport(viewport.width, viewport.height)
      cy.visit("/")

      cy.document().should(document => {
        const viewportWidth = document.documentElement.clientWidth
        const renderedWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
        expect(renderedWidth).to.be.at.most(viewportWidth)
      })
    })
  })
})

export {}
