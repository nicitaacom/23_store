type TTestAccount = {
  id: string
  email: string
  password: string
}

type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TTestAccount>
type TPreparedAccount = { id: string; email: string; role: keyof TRunAccounts }

Cypress.Commands.add("prepareRunAccounts", () => {
  cy.task("prepareRunAccounts", null, { log: false }).then(accountData => {
    const accountRecords = accountData as Record<keyof TRunAccounts, TPreparedAccount>
    return cy.env(["E2E_TEST_PASSWORD"]).then(({ E2E_TEST_PASSWORD }) => {
      const testPassword = String(E2E_TEST_PASSWORD ?? "")
      if (!testPassword) throw new Error("E2E_TEST_PASSWORD is required for run-owned browser accounts")
      return {
        owner: { ...accountRecords.owner, password: testPassword },
        other: { ...accountRecords.other, password: testPassword },
        support: { ...accountRecords.support, password: testPassword },
        admin: { ...accountRecords.admin, password: testPassword },
      }
    })
  })
})

Cypress.Commands.add("signIn", (account: TTestAccount) => {
  cy.session(
    ["authenticated-account", Cypress.config("baseUrl"), account.id, account.email],
    () => {
      if (Cypress.expose("E2E_SUITE") === "legacy") cy.setCookie("cf_turnstile_verified", "1", { sameSite: "lax" })
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
      prepareRunAccounts(): Chainable<TRunAccounts>
    }
  }
}

export {}
