const viewports = [
  { width: 320, height: 480, label: "320px short phone" },
  { width: 332, height: 568, label: "332px phone" },
  { width: 414, height: 480, label: "414px short phone" },
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

  const publicRoutes = [
    "/en/search?query=mobile-responsive-audit",
    "/en/popular-products",
    "/en/track-order",
    "/en/support",
    "/en/payment?status=cancelled",
    "/en/error?error_description=Mobile%20layout%20audit",
  ]

  publicRoutes.forEach(route => {
    it(`has no horizontal overflow on ${route} at narrow and short phone sizes`, () => {
      cy.visit(route, { failOnStatusCode: false })

      ;[
        { width: 320, height: 480 },
        { width: 332, height: 568 },
        { width: 414, height: 480 },
      ].forEach(viewport => {
        cy.viewport(viewport.width, viewport.height)
        cy.document().should(document => {
          const viewportWidth = document.documentElement.clientWidth
          const renderedWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
          expect(renderedWidth, `${route} at ${viewport.width}px`).to.be.at.most(viewportWidth)
        })
      })
    })
  })
})

export {}
