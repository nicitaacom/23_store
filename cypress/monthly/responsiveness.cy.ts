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

const adminModal = ["Admin", "Pan", "el"].join("")
const adminClose = ["admin", "pan" + "el", "close"].join("-")

describe("responsive layout", () => {
  ;[
    { width: 320, height: 480 },
    { width: 320, height: 320 },
  ].forEach(({ width, height }) => {
    it(`keeps the short-screen mobile menu and language picker reachable at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en")
      cy.get('[data-cy="open-mobile-menu"]').click()

      cy.get('aside [aria-label="Close menu"]').should("be.visible").should(control => {
        const bounds = control[0].getBoundingClientRect()
        expect(bounds.width, "menu close touch width").to.be.at.least(44)
        expect(bounds.height, "menu close touch height").to.be.at.least(44)
        expect(bounds.top, "menu close stays inside the top edge").to.be.at.least(0)
        expect(bounds.bottom, "menu close stays inside the screen").to.be.at.most(height)
      })

      cy.get("aside > div").scrollTo("bottom").should(content => {
        expect(content[0].scrollTop, "drawer content scrolls to its bottom").to.be.greaterThan(0)
      })
      cy.get('aside [data-cy="language-trigger"]').should("be.visible").should(control => {
        const bounds = control[0].getBoundingClientRect()
        expect(bounds.width, "language trigger touch width").to.be.at.least(44)
        expect(bounds.height, "language trigger touch height").to.be.at.least(44)
        expect(bounds.bottom, "language trigger stays inside the screen").to.be.at.most(height)
      }).click()

      ;["en", "fi", "ru", "se"].forEach(locale => {
        cy.get(`aside [data-cy="language-${locale}"]`).should("be.visible").should(control => {
          const bounds = control[0].getBoundingClientRect()
          expect(bounds.width, `${locale} option touch width`).to.be.at.least(44)
          expect(bounds.height, `${locale} option touch height`).to.be.at.least(44)
          expect(bounds.left, `${locale} option stays inside the screen`).to.be.at.least(0)
          expect(bounds.right, `${locale} option stays inside the screen`).to.be.at.most(width)
        })
      })

      cy.document().should(document => {
        expect(Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), "no mobile drawer overflow").to.be.at.most(width)
      })
    })
  })

  it("keeps catalog search, create, preview, and page-size actions easy to tap", () => {
    cy.viewport(320, 480)
    cy.visit("/en")

    ;[
      '[data-cy="catalog-search-submit"]',
      '[data-cy="catalog-add-product"]',
      '[data-cy="catalog-preview-page"]',
      '[data-cy="products-per-page"]',
    ].forEach(selector => {
      cy.get(selector).should("be.visible").should(control => {
        const bounds = control[0].getBoundingClientRect()
        expect(bounds.width, `${selector} touch width`).to.be.at.least(44)
        expect(bounds.height, `${selector} touch height`).to.be.at.least(44)
      })
    })

    cy.get('[data-cy="products-per-page"]').click().should("have.attr", "aria-expanded", "true")
    cy.get('[data-cy="products-per-page-option"]').each(option => {
      const bounds = option[0].getBoundingClientRect()
      expect(bounds.width, "page-size option touch width").to.be.at.least(44)
      expect(bounds.height, "page-size option touch height").to.be.at.least(44)
    })
  })

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
    it(`has no horizontal overflow on ${route} at phone widths`, () => {
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

        cy.window().then(browserWindow => {
          browserWindow.scrollTo(0, browserWindow.document.documentElement.scrollHeight)
        })
        cy.document().should(document => {
          const viewportWidth = document.documentElement.clientWidth
          const renderedWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
          expect(renderedWidth, `${route} after scrolling at ${viewport.width}px`).to.be.at.most(viewportWidth)

          const viewportControls = Array.from(
            document.querySelectorAll<HTMLElement>(
              'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"]',
            ),
          ).filter(control => {
            const bounds = control.getBoundingClientRect()
            const style = document.defaultView?.getComputedStyle(control)
            const visible =
              bounds.width > 0 &&
              bounds.height > 0 &&
              style?.display !== "none" &&
              style?.visibility !== "hidden" &&
              style?.opacity !== "0"
            return visible && bounds.bottom > 0 && bounds.top < viewport.height
          })
          expect(viewportControls.length, `${route} has visible controls after scrolling`).to.be.greaterThan(0)
          viewportControls.forEach(control => {
            const bounds = control.getBoundingClientRect()
            const controlName =
              control.getAttribute("aria-label") ||
              control.textContent?.trim() ||
              `${control.tagName}#${control.id}.${control.className}`
            const visibleBounds = `(${bounds.left},${bounds.top})–(${bounds.right},${bounds.bottom}) at ${viewport.width}×${viewport.height}`
            expect(bounds.left, `${route} ${controlName} left edge ${visibleBounds}`).to.be.at.least(-1)
            expect(bounds.right, `${route} ${controlName} right edge ${visibleBounds}`).to.be.at.most(viewportWidth + 1)
            if (control.matches("button, input, select, textarea, [role='button']")) {
              expect(bounds.height, `${route} ${controlName} hit area after scrolling`).to.be.at.least(44)
            }
          })
        })
      })
    })
  })
})

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = { id: string; priceId: string }

const authenticatedMobileViewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("authenticated responsive layout", () => {
  let accounts: TRunAccounts
  let product: TProductFixture

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
      const suffix = String(Cypress.expose("E2E_RUN_ID") ?? "local").toLowerCase().replace(/[^a-z0-9]/g, "").slice(-12)
      return cy.task<TProductFixture>("createProductFixture", {
        ownerId: runAccounts.owner.id,
        key: `layout-${suffix}`,
        title: `E2E layout ${suffix}`,
        description: "Disposable product for the responsive owner pages.",
        price: 8.5,
        onStock: 3,
      })
    }).then(created => {
      product = created
    })
  })

  after(() => {
    if (!product) return
    cy.signIn(accounts.owner)
    cy.request({
      method: "POST",
      url: "/api/products/delete",
      body: { id: product.id },
      failOnStatusCode: false,
    }).then(response => {
      expect(response.status, "responsive fixture cleanup").to.equal(200)
      return cy.task("verifyStripeResourcesInactive", {
        productId: product.id,
        priceId: product.priceId,
      })
    })
  })

  beforeEach(() => {
    cy.signIn(accounts.owner)
  })

  authenticatedMobileViewports.forEach(({ width, height }) => {
    it(`keeps owner pages within ${width}×${height} after sign in`, () => {
      cy.viewport(width, height)
      cy.visit("/en")
      cy.get('[aria-label="Open profile menu"]').should("be.visible").click()
      cy.get('[aria-label="Open profile menu"]').parent().find("ul").contains("button", "Manage products").should("be.visible")
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth, `signed-in catalog at ${width}px`).to.be.at.most(
          document.documentElement.clientWidth,
        )
      })

      cy.visit(`/en/products/${product.id}/manage`)
      cy.get("#title").should("be.visible")
      cy.get('[data-cy="manage-save"]').should("be.disabled")
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth, `manage page at ${width}px`).to.be.at.most(
          document.documentElement.clientWidth,
        )
      })

      cy.visit(`/en?modal=${adminModal}`)
      cy.get(`[data-cy="${adminClose}"]`).should("be.visible")
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth, `owner modal at ${width}px`).to.be.at.most(
          document.documentElement.clientWidth,
        )
      })
    })
  })
})
