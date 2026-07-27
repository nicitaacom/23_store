import "./commands"

beforeEach(() => {
  cy.setCookie("cf_turnstile_verified", "1", { sameSite: "lax" })
})
