type TTestAccount = {
  id: string
  email: string
  password: string
}

Cypress.Commands.add("signIn", (account: TTestAccount) => {
  cy.session(
    ["authenticated-account", account.id],
    () => {
      cy.setCookie("cf_turnstile_verified", "1", { sameSite: "lax" })
      cy.visit("/?modal=AuthModal&variant=login")
      cy.get("#email").type(account.email)
      cy.get("#password").type(account.password, { log: false })
      cy.intercept("POST", "/api/auth/sync-public-user").as("syncPublicUser")
      cy.get('[data-cy="auth-submit"]').should("be.enabled").click()
      cy.wait("@syncPublicUser").its("response.statusCode").should("equal", 200)
    },
    {
      validate() {
        cy.request({
          method: "POST",
          url: "/api/auth/sync-public-user",
          body: { provider: "credentials" },
          failOnStatusCode: false,
        })
          .its("status")
          .should("equal", 200)
      },
    },
  )
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress command declarations use namespace merging.
  namespace Cypress {
    interface Chainable {
      signIn(account: TTestAccount): Chainable<void>
    }
  }
}

export {}
