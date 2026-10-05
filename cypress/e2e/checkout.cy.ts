type TFixtureProduct = {
  id: string
  price: number
}

type TFixtures = {
  ownerProduct: TFixtureProduct
}

const CUSTOMER_EMAIL = "checkout-cypress@joki.example"

function openPaymentOptions(product: TFixtureProduct) {
  const cartRecord = {
    [product.id]: { id: product.id, quantity: 1, variantId: null },
  }

  cy.visit("/")
  cy.contains(/Selaa koko katalogia|Browse the full catalog/).should("be.visible")
  cy.window().invoke("localStorage.setItem", "cart", JSON.stringify({ state: { products: cartRecord }, version: 0 }))
  cy.visit("/?modal=CartModal")
  cy.get('[data-cy="cart-quantity"]').should("contain", "1")
  cy.get('[data-cy="other-ways-to-pay"]').click()
}

function interceptSuccessfulPayment(createSessionPath: string, sessionId: string, product: TFixtureProduct) {
  cy.intercept("POST", "/api/messages/get-messages", { statusCode: 200, body: [] })
  cy.intercept("POST", createSessionPath, request => {
    request.reply({
      statusCode: 200,
      body: { url: `/payment?status=success&session_id=${sessionId}` },
    })
  }).as("createProviderSession")
  cy.intercept("POST", "/api/customer", request => {
    expect(request.body.session_id).to.equal(sessionId)
    request.reply({ statusCode: 200, body: { customerEmail: CUSTOMER_EMAIL } })
  }).as("selectCustomerEmail")
  cy.intercept("POST", "/api/verify-payment", request => {
    expect(request.body.session_id).to.equal(sessionId)
    request.reply({ statusCode: 200, body: { valid: true } })
  }).as("verifyPayment")
  cy.intercept("POST", "/api/send-email", request => {
    expect(request.body.to).to.equal(CUSTOMER_EMAIL)
    expect(request.body.html).to.include("Cypress owner product")
    request.reply({ statusCode: 200, body: { id: "checkout-receipt" } })
  }).as("sendReceipt")
  cy.intercept("PATCH", "/api/personalized-designs", { statusCode: 200, body: { updated: 0 } }).as("updateDesigns")
  cy.intercept("POST", "/api/payment/success", request => {
    expect(request.body.cartProducts).to.have.property(product.id)
    request.reply({ statusCode: 200, body: { success: true } })
  }).as("completePayment")
}

function interceptFailedPayment(createSessionPath: string, failureReason: string) {
  cy.intercept("POST", "/api/messages/get-messages", { statusCode: 200, body: [] })
  cy.intercept("POST", createSessionPath, {
    statusCode: 400,
    body: failureReason,
  }).as("createProviderSession")
}

describe("checkout", () => {
  let fixtures: TFixtures

  before(() => {
    cy.task<TFixtures>("prepareFixtures").then(preparedFixtures => {
      fixtures = preparedFixtures
    })
  })

  beforeEach(() => {
    cy.on("uncaught:exception", error => {
      if (error.message.includes("Hydration failed")) return false
    })
  })

  it("sends a receipt email after a successful Stripe payment", () => {
    cy.viewport(320, 320)
    const sessionId = "cs_test_cypress_stripe_success"
    interceptSuccessfulPayment("/api/create-checkout-session", sessionId, fixtures.ownerProduct)
    openPaymentOptions(fixtures.ownerProduct)

    cy.get('[data-cy="pay-with-stripe"]').click()

    cy.contains(/Test (Maksu onnistui|Your payment is successful)/).should("be.visible")
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      const heading = document.querySelector("main h1")!.getBoundingClientRect()
      const animation = document.querySelector("main img")!.getBoundingClientRect()
      expect(heading.top, "success heading starts inside the short viewport").to.be.at.least(0)
      expect(heading.bottom, "success heading ends inside the short viewport").to.be.at.most(320)
      expect(animation.left, "success animation stays inside the left edge").to.be.at.least(0)
      expect(animation.right, "success animation stays inside the right edge").to.be.at.most(320)
    })
    cy.wait(["@createProviderSession", "@selectCustomerEmail", "@verifyPayment", "@sendReceipt", "@completePayment"])
  })

  it("shows the reason for a failed Stripe payment", () => {
    const failureReason = "Stripe test card was declined"
    interceptFailedPayment("/api/create-checkout-session", failureReason)
    openPaymentOptions(fixtures.ownerProduct)

    cy.get('[data-cy="pay-with-stripe"]').click()

    cy.wait("@createProviderSession")
    cy.contains(failureReason).should("be.visible")
    cy.location("pathname").should("not.include", "payment")
  })

  it("sends a receipt email after a successful PayPal payment", () => {
    const sessionId = "cs_test_cypress_paypal_success"
    interceptSuccessfulPayment("/api/create-paypal-session", sessionId, fixtures.ownerProduct)
    openPaymentOptions(fixtures.ownerProduct)

    cy.get('[data-cy="pay-with-paypal"]').click()

    cy.contains(/Test (Maksu onnistui|Your payment is successful)/).should("be.visible")
    cy.wait(["@createProviderSession", "@selectCustomerEmail", "@verifyPayment", "@sendReceipt", "@completePayment"])
  })

  it("shows the credential reason for a failed PayPal payment", () => {
    const failureReason = "PayPal credentials rejected: client authentication failed"
    interceptFailedPayment("/api/create-paypal-session", failureReason)
    openPaymentOptions(fixtures.ownerProduct)

    cy.get('[data-cy="pay-with-paypal"]').click()

    cy.wait("@createProviderSession")
    cy.contains(failureReason).should("be.visible")
    cy.location("pathname").should("not.include", "payment")
  })

  it("keeps the payment cancellation status visible at short mobile sizes", () => {
    cy.viewport(320, 480)
    openPaymentOptions(fixtures.ownerProduct)
    cy.visit("/payment?status=cancelled")

    cy.contains(/Your payment canceled|Maksu peruutettu/i).should("be.visible")
    cy.get("main section").then(section => {
      const element = section[0] as HTMLElement
      const originalStyle = element.getAttribute("style")
      element.style.position = "absolute"
      element.style.left = "50%"
      element.style.top = "50%"
      element.style.transform = "translate(-50%, -100%)"
      cy.screenshot("payment-cancelled-before-320x480", { capture: "viewport" })
      cy.then(() => {
        if (originalStyle === null) element.removeAttribute("style")
        else element.setAttribute("style", originalStyle)
      })
    })

    cy.get("h1").should("be.visible")
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      const heading = document.querySelector("main h1")!.getBoundingClientRect()
      expect(heading.top).to.be.at.least(0)
      expect(heading.bottom).to.be.at.most(480)
    })
    cy.screenshot("payment-cancelled-after-320x480", { capture: "viewport" })

    cy.viewport(320, 320)
    cy.visit("/payment?status=cancelled")
    cy.get("h1").should("be.visible")
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      const heading = document.querySelector("main h1")!.getBoundingClientRect()
      expect(heading.top).to.be.at.least(0)
      expect(heading.bottom).to.be.at.most(320)
    })
  })
})

export {}
