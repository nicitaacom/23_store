type TCartFixture = {
  ownerProduct: { id: string }
}

const viewports = [
  { width: 320, height: 320 },
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("cart modal on short phones", () => {
  let fixture: TCartFixture

  beforeEach(() => {
    // The fixture sets persisted cart state after the app's server render.
    // Suppress only that expected SSR/client cart count mismatch, as checkout.cy does.
    cy.on("uncaught:exception", error => {
      if (error.message.includes("Hydration failed")) return false
    })
  })

  before(() => {
    cy.task<TCartFixture>("prepareFixtures").then(preparedFixtures => {
      fixture = preparedFixtures
    })
  })

  viewports.forEach(({ width, height }) => {
    it(`fills ${width}×${height} and keeps checkout controls usable`, () => {
      cy.viewport(width, height)
      cy.visit("/?modal=CartModal", {
        // Cypress requires this callback name to seed storage before app initialization.
        // eslint-disable-next-line local-rules/no-banned-words
        onBeforeLoad(window) {
          window.localStorage.setItem(
            "cart",
            JSON.stringify({
              state: { products: { [fixture.ownerProduct.id]: { id: fixture.ownerProduct.id, quantity: 1, variantId: null } } },
              version: 0,
            }),
          )
        },
      })
      cy.get('[data-cy="cart-quantity"]').should("contain", "1")
      cy.get('[data-cy="other-ways-to-pay"]').click()

      if (width === 320 && height === 480) {
        cy.document().then(document => {
          const screenshotStyle = document.createElement("style")
          screenshotStyle.dataset.mobileReview = "true"
          screenshotStyle.textContent = "nextjs-portal { display: none !important; }"
          document.head.append(screenshotStyle)
        })

        cy.get('[role="dialog"]').then(dialog => {
          const modal = dialog[0] as HTMLElement
          const backdrop = modal.parentElement as HTMLElement
          const previousModalStyle = modal.getAttribute("style")
          const previousBackdropStyle = backdrop.getAttribute("style")

          // Recreate the former inset, 80vh cart shell for a temporary visual comparison.
          modal.style.height = "80vh"
          modal.style.width = "calc(100vw - 24px)"
          modal.style.border = "1px solid rgba(255, 255, 255, 0.2)"
          modal.style.borderRadius = "12px"
          backdrop.style.padding = "0 12px"

          cy.screenshot("cart-modal-before-320x480", { capture: "viewport" })
          cy.then(() => {
            if (previousModalStyle === null) modal.removeAttribute("style")
            else modal.setAttribute("style", previousModalStyle)
            if (previousBackdropStyle === null) backdrop.removeAttribute("style")
            else backdrop.setAttribute("style", previousBackdropStyle)
            dialog[0].ownerDocument.querySelector("style[data-mobile-review]")?.remove()
          })
          cy.screenshot("cart-modal-after-320x480", { capture: "viewport" })
        })
      }

      if (width === 320 && height === 320) {
        cy.screenshot("cart-modal-after-320x320", { capture: "viewport" })
      }

      cy.get('[role="dialog"]').should("be.visible").should(dialog => {
        const bounds = dialog[0].getBoundingClientRect()
        const document = dialog[0].ownerDocument
        expect(bounds.left, "cart modal left edge").to.be.closeTo(0, 1)
        expect(bounds.top, "cart modal top edge").to.be.closeTo(0, 1)
        expect(bounds.width, "cart modal width").to.be.closeTo(document.documentElement.clientWidth, 1)
        expect(bounds.height, "cart modal height").to.be.closeTo(height, 1)
        expect(getComputedStyle(dialog[0]).borderWidth, "cart modal border").to.equal("0px")
      })

      cy.get('[role="dialog"] > button[aria-label]').should("be.visible").should(closeButton => {
        const bounds = closeButton[0].getBoundingClientRect()
        expect(bounds.width, "cart close touch width").to.be.at.least(44)
        expect(bounds.height, "cart close touch height").to.be.at.least(44)
        expect(bounds.top, "cart close stays below the top edge").to.be.at.least(0)
        expect(bounds.right, "cart close stays inside the right edge").to.be.at.most(width)
      })

      cy.get('[role="dialog"] button:visible').each(button => {
        cy.wrap(button).scrollIntoView()
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.width, `${button.text().trim()} button touch width`).to.be.at.least(44)
        expect(bounds.height, `${button.text().trim()} button touch height`).to.be.at.least(44)
      })

      ;["[data-cy='pay-with-stripe']", "[data-cy='pay-with-paypal']"].forEach(selector => {
        cy.get(selector).should("be.visible").should(button => {
          const bounds = button[0].getBoundingClientRect()
          expect(bounds.width, `${selector} touch width`).to.be.at.least(44)
          expect(bounds.height, `${selector} touch height`).to.be.at.least(44)
        })
      })

      cy.document().should(document => {
        expect(Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)).to.be.at.most(
          document.documentElement.clientWidth,
        )
      })

      cy.get('[role="dialog"] > button[aria-label]').click()
      cy.get('[role="dialog"]').should("not.exist")
      cy.document().should(document => {
        expect(document.body.style.overflow, "page scrolling unlocks after closing the modal").not.to.equal("hidden")
      })
    })
  })
})

export {}
