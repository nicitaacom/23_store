const locales = ["fi", "ru", "se"]

const publicRoutes = [
  "",
  "/popular-products",
  "/search?query=mobile-responsive-audit",
  "/track-order",
  "/support",
  "/payment?status=cancelled",
  "/error?error_description=mobile-audit",
  "/human-check",
]

const viewports = [
  { width: 320, height: 480 },
  { width: 414, height: 480 },
]

describe("localized public routes on short phones", () => {
  locales.forEach(locale => {
    publicRoutes.forEach(path => {
      it(`keeps /${locale}${path} inside the viewport before and after scrolling`, () => {
        viewports.forEach(({ width, height }) => {
          const route = `/${locale}${path}`
          cy.viewport(width, height)
          cy.visit(route, { failOnStatusCode: false })
          cy.get("body").should("be.visible")

          cy.document().should(document => {
            const renderedWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
            expect(renderedWidth, `${route} before scrolling at ${width}px`).to.be.at.most(
              document.documentElement.clientWidth,
            )
          })

          if (path === "/human-check") {
            cy.get('[data-cy="human-check-back-to-main"]').should("be.visible").should(button => {
              const bounds = button[0].getBoundingClientRect()
              expect(bounds.height, `${route} return action hit area`).to.be.at.least(44)
              expect(bounds.top, `${route} return action visible at initial scroll`).to.be.at.least(0)
              expect(bounds.bottom, `${route} return action visible at initial scroll`).to.be.at.most(height)
            })
            cy.get('[data-cy="human-check-back-to-main"]').scrollIntoView()
          } else {
            cy.window().then(appWindow => {
              appWindow.scrollTo(0, appWindow.document.documentElement.scrollHeight)
            })
          }
          cy.document().should(document => {
            const viewportWidth = document.documentElement.clientWidth
            const renderedWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
            expect(renderedWidth, `${route} after scrolling at ${width}px`).to.be.at.most(viewportWidth)

            const visibleButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter(button => {
              const bounds = button.getBoundingClientRect()
              const style = document.defaultView?.getComputedStyle(button)
              return (
                bounds.width > 0 &&
                bounds.height > 0 &&
                style?.display !== "none" &&
                style?.visibility !== "hidden" &&
                style?.opacity !== "0" &&
                bounds.bottom > 0 &&
                bounds.top < height
              )
            })
            expect(visibleButtons.length, `${route} exposes a button after scrolling at ${width}px`).to.be.greaterThan(0)
            visibleButtons.forEach(button => {
              let bounds = button.getBoundingClientRect()
              const label = button.getAttribute("aria-label") || button.textContent?.trim() || "button"
              const horizontalScrollParent = findHorizontalScrollParent(button, document)
              if (horizontalScrollParent && bounds.right > viewportWidth + 1) {
                horizontalScrollParent.scrollLeft += bounds.right - viewportWidth - 1
                bounds = button.getBoundingClientRect()
              }
              if (horizontalScrollParent && bounds.left < -1) {
                horizontalScrollParent.scrollLeft += bounds.left + 1
                bounds = button.getBoundingClientRect()
              }
              expect(bounds.height, `${route} ${label} hit height after scrolling`).to.be.at.least(44)
              expect(bounds.left, `${route} ${label} left edge after scrolling`).to.be.at.least(-1)
              expect(Math.round(bounds.right), `${route} ${label} right edge after scrolling`).to.be.at.most(
                viewportWidth + 1,
              )
            })
          })
        })
      })
    })
  })
})

function findHorizontalScrollParent(control: HTMLElement, document: Document): HTMLElement | null {
  let ancestorElement = control.parentElement
  while (ancestorElement) {
    const overflowX = document.defaultView?.getComputedStyle(ancestorElement).overflowX
    if ((overflowX === "auto" || overflowX === "scroll") && ancestorElement.scrollWidth > ancestorElement.clientWidth) {
      return ancestorElement
    }
    ancestorElement = ancestorElement.parentElement
  }

  return null
}

export {}
