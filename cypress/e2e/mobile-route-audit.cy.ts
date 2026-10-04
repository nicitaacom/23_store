const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

type TFixtureProduct = { id: string }
type TFixtureAccount = { id: string; email: string; password: string }

function assertNoHorizontalOverflow(route: string, width: number) {
  cy.document().should(document => {
    const renderedWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    expect(renderedWidth, `${route} at ${width}px`).to.be.at.most(document.documentElement.clientWidth)
  })
}

function assertVisibleButtonsAreReachable(route: string, width: number) {
  cy.get("button:visible").each(button => {
    const bounds = button[0].getBoundingClientRect()
    const label = button.attr("aria-label") || button.text().trim() || "unlabeled button"
    expect(bounds.height, `${route}: ${label} height at ${width}px`).to.be.at.least(44)
    expect(bounds.left, `${route}: ${label} left edge at ${width}px`).to.be.at.least(-1)
    expect(bounds.right, `${route}: ${label} right edge at ${width}px`).to.be.at.most(width + 1)
  })
}

describe("mobile public route and button audit", () => {
  const routes = [
    "/en/jokik-music",
    "/en/jompanion",
    "/en/jotion",
    "/en/popular-products",
    "/en/search?query=mobile-route-audit",
    "/en/track-order",
    "/en/support",
    "/en/payment?status=cancelled",
    "/en/error?error_description=Mobile%20route%20audit",
  ]

  routes.forEach(route => {
    it(`fits ${route} and keeps visible buttons reachable on short phones`, () => {
      viewports.forEach(({ width, height }) => {
        cy.viewport(width, height)
        cy.visit(route, { failOnStatusCode: false })
        if (route === "/en/popular-products" && width === 320) {
          cy.get("h1").should("be.visible")
          cy.get('[data-cy="popular-banner-selector"]').should("have.length", 3)
          cy.document().then(document => {
            document.querySelectorAll("nextjs-portal").forEach(portal => portal.remove())
          })
          cy.get('[data-cy="popular-products-shell"]').then(shell => {
            const section = shell[0].firstElementChild as HTMLElement
            const header = section.firstElementChild as HTMLElement
            const banner = header.lastElementChild as HTMLElement
            const elements = [shell[0], section, header, banner] as HTMLElement[]
            const savedStyles = elements.map(element => element.getAttribute("style"))

            ;(shell[0] as HTMLElement).style.padding = "8px 12px 96px"
            section.style.padding = "12px 16px"
            header.style.marginBottom = "16px"
            header.style.gap = "16px"
            banner.style.height = "220px"
            cy.screenshot("popular-products-before-320x480", { capture: "viewport" })
            cy.then(() => {
              elements.forEach((element, index) => {
                const savedStyle = savedStyles[index]
                if (savedStyle === null) element.removeAttribute("style")
                else element.setAttribute("style", savedStyle!)
              })
            })
            cy.screenshot("popular-products-after-320x480", { capture: "viewport" })
          })
        }
        assertNoHorizontalOverflow(route, width)
        assertVisibleButtonsAreReachable(route, width)
      })
    })
  })

})

describe("mobile authenticated route audit", () => {
  let owner: TFixtureAccount
  let ownerProduct: TFixtureProduct

  before(() => {
    cy.task<{ owner: TFixtureAccount; ownerProduct: TFixtureProduct }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
      ownerProduct = fixtures.ownerProduct
    })
  })

  beforeEach(() => {
    cy.signIn(owner)
  })

  viewports.forEach(({ width, height }) => {
    it(`fits product details and their controls at ${width}×${height}`, () => {
      const route = `/en/products/${ownerProduct.id}`
      cy.viewport(width, height)
      cy.intercept("GET", /\/23_users_cart\?select=cart_products/).as("fetchSignedInCart")
      cy.visit(route)
      cy.wait("@fetchSignedInCart")
      cy.get("#initial-loading").should("not.exist")
      cy.get("h1").should("be.visible")
      assertNoHorizontalOverflow(route, width)
      assertVisibleButtonsAreReachable(route, width)
    })
  })
})

export {}
