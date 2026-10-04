type TFixtureAccount = {
  id: string
  email: string
  password: string
}

const mobileViewports = [
  { width: 320, height: 320 },
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("avatar editor on short mobile screens", () => {
  let owner: TFixtureAccount

  before(() => {
    cy.task<{ owner: TFixtureAccount }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
    })
  })

  beforeEach(() => {
    cy.signIn(owner)
  })

  it("keeps the avatar editor and its close button inside small and short viewports", () => {
    mobileViewports.forEach(({ width, height }) => {
      cy.viewport(width, height)
      cy.visit("/en")
      cy.get('[aria-label="Open profile menu"]').click()
      cy.get('[aria-label="Open profile menu"]').parent().find("ul").contains("button", "Update avatar").click()
      cy.get('[role="dialog"]').should("be.visible").should(dialog => {
        const bounds = dialog[0].getBoundingClientRect()
        const layoutViewportWidth = dialog[0].ownerDocument.documentElement.clientWidth
        expect(bounds.left, `${width}×${height} avatar dialog left`).to.be.closeTo(0, 1)
        expect(bounds.top, `${width}×${height} avatar dialog top`).to.be.closeTo(0, 1)
        expect(bounds.width, `${width}×${height} avatar dialog width`).to.be.closeTo(layoutViewportWidth, 1)
        expect(bounds.height, `${width}×${height} avatar dialog height`).to.be.closeTo(height, 1)
      })
      cy.get('[data-cy="update-avatar-scroll"]').should(panel => {
        expect(panel[0].scrollHeight, `${width}×${height} avatar form scrolls within its height limit`).to.be.greaterThan(
          panel[0].clientHeight,
        )
      })
      cy.get('[role="dialog"] button[aria-label="Close modal"]').should("be.visible").should(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.width, "modal close touch width").to.be.at.least(44)
        expect(bounds.height, "modal close touch height").to.be.at.least(44)
        expect(bounds.top, "modal close top is visible").to.be.at.least(0)
        expect(bounds.right, "modal close right edge is visible").to.be.at.most(width)
      })
      cy.get('[role="dialog"] .image-upload h1').scrollIntoView().should("be.visible").should(heading => {
        const button = heading[0].closest("button")!
        const bounds = heading[0].getBoundingClientRect()
        const buttonBounds = button.getBoundingClientRect()
        expect(bounds.left, "upload heading stays inside the button").to.be.at.least(buttonBounds.left)
        expect(bounds.right, "upload heading stays inside the button").to.be.at.most(buttonBounds.right)
        expect(heading[0].scrollWidth, "upload heading has no clipped text").to.be.at.most(heading[0].clientWidth)
        expect(bounds.top, "upload heading scrolls into view").to.be.at.least(0)
        expect(bounds.bottom, "upload heading scrolls into view").to.be.at.most(height)
      })
      cy.get('[data-cy="update-avatar-scroll"]').should(panel => {
        expect(panel[0].scrollTop, `${width}×${height} upload is reachable by scrolling`).to.be.greaterThan(0)
      })
      cy.get('[role="dialog"]')
        .contains("button", "Save avatar")
        .scrollIntoView()
        .should("be.visible")
        .should(button => {
          const bounds = button[0].getBoundingClientRect()
          expect(bounds.height, `${width}×${height} save action touch height`).to.be.at.least(44)
          expect(bounds.top, `${width}×${height} save action scrolls into view`).to.be.at.least(0)
          expect(bounds.bottom, `${width}×${height} save action scrolls into view`).to.be.at.most(height)
        })
      cy.get('[role="dialog"] button[aria-label="Close modal"]').should(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.top, `${width}×${height} close stays visible after scrolling`).to.be.at.least(0)
        expect(bounds.bottom, `${width}×${height} close stays visible after scrolling`).to.be.at.most(height)
      })
      if (width === 320 && height === 320) {
        cy.document().then(document => {
          const reviewStyle = document.createElement("style")
          reviewStyle.dataset.mobileReview = "true"
          reviewStyle.textContent = "nextjs-portal { display: none !important; }"
          document.head.append(reviewStyle)
        })
        cy.screenshot("avatar-modal-after-320x320", { capture: "viewport" })
      }
      cy.get('[role="dialog"] button[aria-label]').should("be.visible").click()
      cy.get('[role="dialog"]').should("not.exist")
    })
  })

  it("wraps the Finnish upload copy inside the fullscreen modal at 320×480", () => {
    cy.viewport(320, 480)
    cy.visit("/fi")
    cy.get('[data-cy="user-menu"]').closest("button").click()
    cy.contains("button", "Update avatar").click()
    cy.get('[data-cy="update-avatar-scroll"]').scrollTo("bottom")

    cy.get('[role="dialog"] button[aria-label="Sulje ikkuna"]').should("be.visible").should(button => {
      const bounds = button[0].getBoundingClientRect()
      expect(bounds.top, "Finnish avatar close control remains visible after scrolling").to.be.at.least(0)
      expect(bounds.right, "Finnish avatar close control stays inside the phone").to.be.at.most(320)
      expect(bounds.width, "Finnish avatar close hit area").to.be.at.least(44)
      expect(bounds.height, "Finnish avatar close hit area").to.be.at.least(44)
    })

    cy.get('[role="dialog"] .image-upload h1').should("be.visible").should(heading => {
      const uploadButton = heading[0].closest("button")!
      const headingBounds = heading[0].getBoundingClientRect()
      const buttonBounds = uploadButton.getBoundingClientRect()
      expect(heading[0].textContent?.trim()).to.equal("Napsauta tai pudota kuva tähän")
      expect(heading[0].scrollWidth, "Finnish upload heading has no clipped text").to.be.at.most(heading[0].clientWidth)
      expect(headingBounds.left, "Finnish upload heading stays inside its button").to.be.at.least(buttonBounds.left)
      expect(headingBounds.right, "Finnish upload heading stays inside its button").to.be.at.most(buttonBounds.right)
    })
    cy.get('[role="dialog"] .image-upload p').should("be.visible").should(description => {
      expect(description[0].scrollWidth, "Finnish upload description has no clipped text").to.be.at.most(
        description[0].clientWidth,
      )
    })
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth, "Finnish avatar modal has no horizontal overflow").to.be.at.most(320)
    })
    cy.get('[data-mobile-fullscreen-backdrop="true"]').should(backdrop => {
      expect(getComputedStyle(backdrop[0]).opacity, "avatar modal backdrop finishes opening").to.equal("1")
    })
    cy.get('[role="dialog"]').should(dialog => {
      expect(getComputedStyle(dialog[0]).opacity, "avatar modal finishes opening").to.equal("1")
    })
    cy.screenshot("avatar-finnish-upload-after-320x480", { capture: "viewport" })
  })
})

export {}
