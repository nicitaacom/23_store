// Regression coverage for a class of bug: a screen tells the buyer to "contact support" (or just
// prints the support email as text) but never gives them anything that actually works - see
// app/[locale]/error/page.tsx, NoCodeFoundError.tsx, ExchangeCookiesError.tsx. The label reads
// "Report to support" - reporting the exact error is the obvious next step, not a vague "contact".
// Clicking it must SEND the report through /api/send-email (app/functions/support/
// reportErrorToSupport.tsx), not open a mailto: link - a mailto does nothing when the machine has
// no mail client configured, which is exactly what broke this the first time around.
function reportToSupportAndAssertSent(expectedBodyText: string) {
  cy.intercept("POST", "/api/rate-limit", { statusCode: 200, body: { allowed: true, remaining: 4 } }).as("rateLimit")
  cy.intercept("POST", "/api/send-email", request => {
    expect(request.body.html).to.include(expectedBodyText)
    request.reply({ statusCode: 200, body: { status: 200 } })
  }).as("sendEmail")

  cy.contains("button", /report to support/i).click()
  cy.wait(["@rateLimit", "@sendEmail"])
  cy.contains("button", /report sent/i).should("be.visible")
}

describe("auth error screens actually send the report-to-support email", () => {
  it("sends the report when no code was found to exchange cookies for", () => {
    cy.visit("/en/error?error_description=No%20code%20found%20to%20exchange%20cookies%20for%20session")
    reportToSupportAndAssertSent("No code found to exchange cookies for session")
  })

  it("sends the report when no user was found after exchanging cookies", () => {
    cy.visit("/en/error?error_description=No%20user%20found%20after%20exchanging%20cookies%20for%20registration")
    reportToSupportAndAssertSent("No user found after exchanging cookies for registration")
  })

  it("sends the report with the raw error_description on the generic/unmatched fallback", () => {
    cy.visit("/en/error?error_description=Some%20unmapped%20auth%20provider%20error")
    reportToSupportAndAssertSent("Some unmapped auth provider error")
  })
})
