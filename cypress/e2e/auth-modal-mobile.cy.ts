type TFixtureAccount = {
  id: string
  email: string
  password: string
}

const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("sign-in modal on short mobile screens", () => {
  let owner: TFixtureAccount

  before(() => {
    cy.task<{ owner: TFixtureAccount }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
    })
  })

  viewports.forEach(({ width, height }) => {
    it(`keeps login controls usable and signs in at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.setCookie("cf_turnstile_verified", "1", { sameSite: "lax" })
      cy.visit("/?modal=AuthModal&variant=login")

      cy.get('[role="dialog"]').should("be.visible").should(dialog => {
        const bounds = dialog[0].getBoundingClientRect()
        expect(bounds.left, "auth modal left edge").to.be.closeTo(0, 1)
        expect(bounds.top, "auth modal top edge").to.be.closeTo(0, 1)
        expect(bounds.width, "auth modal width").to.be.closeTo(dialog[0].ownerDocument.documentElement.clientWidth, 1)
        expect(bounds.height, "auth modal height").to.be.closeTo(height, 1)
        expect(getComputedStyle(dialog[0]).borderWidth, "auth modal border").to.equal("0px")
      })

      cy.get('[role="dialog"] > button[aria-label]').should("be.visible").should(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(bounds.width, "auth close touch width").to.be.at.least(44)
        expect(bounds.height, "auth close touch height").to.be.at.least(44)
        expect(bounds.top, "auth close remains inside the top edge").to.be.at.least(0)
        expect(bounds.right, "auth close remains inside the right edge").to.be.at.most(width)
      })

      cy.get("#email").should("be.visible").then(input => {
        expect((input[0] as HTMLInputElement).labels, "email has a label").to.have.length(1)
        expect(Math.round(input[0].getBoundingClientRect().height), "email field touch height").to.be.at.least(44)
      }).type(owner.email)
      cy.get("#password").should("be.visible").then(input => {
        expect((input[0] as HTMLInputElement).labels, "password has a label").to.have.length(1)
        expect(Math.round(input[0].getBoundingClientRect().height), "password field touch height").to.be.at.least(44)
      }).type(owner.password, { log: false })
      cy.intercept("POST", "/api/auth/sync-public-user").as("syncPublicUser")
      cy.get('[data-cy="auth-submit"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "submit touch height").to.be.at.least(44)
      }).click()
      cy.wait("@syncPublicUser").its("response.statusCode").should("equal", 200)
      cy.get('[data-cy="user-menu"]').should("be.visible")
    })
  })
})

export {}
