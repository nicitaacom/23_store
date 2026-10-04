type TAdminAccount = {
  id: string
  email: string
  password: string
}

const viewports = [
  { width: 320, height: 320 },
  { width: 320, height: 480 },
]

describe("database backup modal on short phones", () => {
  let admin: TAdminAccount

  before(() => {
    cy.task<{ admin: TAdminAccount }>("prepareBuyingFlowFixtures").then(fixtures => {
      admin = fixtures.admin
    })
  })

  beforeEach(() => {
    cy.signIn(admin)
  })

  viewports.forEach(({ width, height }) => {
    it(`keeps backup tabs and actions usable at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en/?modal=DbBackup")
      cy.get('[role="dialog"]')
        .should("be.visible")
        .should(dialog => {
          const bounds = dialog[0].getBoundingClientRect()
          expect(bounds.left, "backup modal left edge").to.be.closeTo(0, 1)
          expect(bounds.top, "backup modal top edge").to.be.closeTo(0, 1)
          expect(bounds.width, "backup modal width").to.be.closeTo(width, 1)
          expect(bounds.height, "backup modal height").to.be.closeTo(height, 1)
          expect(getComputedStyle(dialog[0]).borderWidth, "backup modal border").to.equal("0px")
        })

      cy.document().then(document => {
        const reviewStyle = document.createElement("style")
        reviewStyle.dataset.mobileReview = "true"
        reviewStyle.textContent = "nextjs-portal { display: none !important; }"
        document.head.append(reviewStyle)
      })
      if (height === 320) cy.screenshot("db-backup-modal-before-320x320", { capture: "viewport" })

      cy.get('[role="dialog"] button').should(buttons => {
        expect(buttons, "close, two tabs, export, and import controls").to.have.length(5)
        buttons.each((_index, button) => {
          const bounds = button.getBoundingClientRect()
          const label = button.getAttribute("aria-label") || button.textContent?.trim() || "backup action"
          expect(bounds.width, `${label} hit width`).to.be.at.least(44)
          expect(bounds.height, `${label} hit height`).to.be.at.least(44)
          expect(bounds.left, `${label} stays inside the left edge`).to.be.at.least(0)
          expect(bounds.right, `${label} stays inside the right edge`).to.be.at.most(width)
        })
      })

      cy.get('[data-cy="db-backup-content"]').should(content => {
        expect(content[0].scrollWidth, "backup content has no horizontal overflow").to.be.at.most(content[0].clientWidth)
        if (height === 320) {
          expect(content[0].scrollHeight, "short backup content scrolls").to.be.greaterThan(content[0].clientHeight)
        }
      })
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth, "backup dialog has no page overflow").to.be.at.most(width)
      })
      cy.get('[data-cy="backup-import-tables"]')
        .scrollIntoView()
        .should("be.visible")
        .should(button => {
          const bounds = button[0].getBoundingClientRect()
          expect(bounds.top, "table import scrolls into view").to.be.at.least(0)
          expect(bounds.bottom, "table import scrolls into view").to.be.at.most(height)
        })
      cy.get('[role="dialog"] button[aria-label]').should(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.top, "close stays visible after scrolling").to.be.at.least(0)
        expect(bounds.bottom, "close stays visible after scrolling").to.be.at.most(height)
      })

      cy.get('[data-cy="backup-tab-files"]').scrollIntoView().click()
      cy.contains("Every file in all 6 storage buckets").should("be.visible")
      cy.get('[data-cy="backup-export-files"]')
        .scrollIntoView()
        .should("be.visible")
        .should(button => {
          const bounds = button[0].getBoundingClientRect()
          expect(bounds.height, "file export touch height").to.be.at.least(44)
          expect(bounds.left, "file export stays inside the left edge").to.be.at.least(0)
          expect(bounds.right, "file export stays inside the right edge").to.be.at.most(width)
          expect(bounds.bottom, "file export scrolls into view").to.be.at.most(height)
        })
      cy.get('[data-cy="backup-import-files"]')
        .scrollIntoView()
        .should("be.visible")
        .should(button => {
          const bounds = button[0].getBoundingClientRect()
          expect(bounds.width, "file import touch width").to.be.at.least(44)
          expect(bounds.height, "file import touch height").to.be.at.least(44)
          expect(bounds.left, "file import stays inside the left edge").to.be.at.least(0)
          expect(bounds.right, "file import stays inside the right edge").to.be.at.most(width)
          expect(bounds.bottom, "file import scrolls into view").to.be.at.most(height)
        })
      cy.get('[role="dialog"] button[aria-label]').should(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.top, "close remains visible after reaching the last action").to.be.at.least(0)
        expect(bounds.bottom, "close remains visible after reaching the last action").to.be.at.most(height)
      })
      if (height === 320) cy.screenshot("db-backup-modal-after-320x320", { capture: "viewport" })

      cy.get('[role="dialog"] button[aria-label]').should("be.visible").click()
      cy.get('[role="dialog"]').should("not.exist")
    })
  })
})

export {}
