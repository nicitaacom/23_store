type TLoginAccount = {
  id: string
  email: string
  password?: string
}

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>

Cypress.Commands.add("prepareRunAccounts", () => {
  return cy.task("prepareRunAccounts", null, { log: false }).then(accounts => accounts as TRunAccounts)
})

Cypress.Commands.add("signIn", (account: TLoginAccount) => {
  cy.session(
    ["authenticated-account", Cypress.config("baseUrl"), account.id, account.email],
    () => {
      if (Cypress.expose("E2E_SUITE") === "legacy") cy.setCookie("cf_turnstile_verified", "1", { sameSite: "lax" })
      const submitLogin = (testPassword: string) => {
        if (!testPassword) throw new Error("E2E_TEST_PASSWORD is required for run-owned browser accounts")
        cy.visit("/?modal=AuthModal&variant=login")
        cy.get("#email").type(account.email)
        cy.get("#password").type(testPassword, { log: false })
        cy.intercept("POST", "/api/auth/sync-public-user").as("syncPublicUser")
        cy.get('[data-cy="auth-submit"]').should("be.enabled").click()
        cy.wait("@syncPublicUser").its("response.statusCode").should("equal", 200)
      }
      if (account.password) return submitLogin(account.password)
      return cy.env(["E2E_TEST_PASSWORD"]).then(({ E2E_TEST_PASSWORD }) => submitLogin(String(E2E_TEST_PASSWORD ?? "")))
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
      signIn(account: TLoginAccount): Chainable<void>
      prepareRunAccounts(): Chainable<TRunAccounts>
    }
  }
}

export {}
