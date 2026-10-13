import "./commands"

import { beginDiagnostics, finishDiagnostics } from "./diagnostics"

beforeEach(() => {
  if (Cypress.expose("E2E_SUITE") === "legacy") {
    cy.setCookie("cf_turnstile_verified", "1", { sameSite: "lax" })
    return
  }
  beginDiagnostics(Cypress.currentTest?.titlePath?.join(" / ") ?? "unknown-scenario")
})

afterEach(() => finishDiagnostics())
