type TBuyingFlowFixture = {
  admin: { id: string; email: string; password: string }
  product: { id: string }
}

type TBuyingFlowRow = {
  id: string
  event: string
  checkout_kind: string | null
  search_query: string | null
  results_count: number | null
  session_id: string
}

const SESSION_ID_KEY = "buying-flow:session-id"

function readSessionId(): Cypress.Chainable<string> {
  return cy
    .window()
    .should(appWindow => {
      expect(appWindow.sessionStorage.getItem(SESSION_ID_KEY), "buying-flow session id").to.be.a("string")
    })
    .then(appWindow => appWindow.sessionStorage.getItem(SESSION_ID_KEY) as string)
}

function waitForEvent(sessionId: string, event: string, checkoutKind?: string): Cypress.Chainable<TBuyingFlowRow[]> {
  cy.wait(750)
  return cy.task<TBuyingFlowRow[]>("readBuyingFlowEventsForSession", sessionId).should(rows => {
    expect(
      rows.some(row => row.event === event && (!checkoutKind || row.checkout_kind === checkoutKind)),
      `${event}${checkoutKind ? `:${checkoutKind}` : ""} row`,
    ).to.equal(true)
  })
}

function assertDailyChartControlsAfterScroll(width: number, height: number) {
  cy.get('[data-cy="utm-range-month"]').scrollIntoView().should("be.visible").should(button => {
    const bounds = button[0].getBoundingClientRect()
    expect(bounds.height, `chart range target height at ${width}px`).to.be.at.least(44)
    expect(bounds.top, `chart range target top at ${width}px`).to.be.at.least(0)
    expect(bounds.bottom, `chart range target bottom at ${width}px`).to.be.at.most(height)
  }).click()
  cy.document().should(document => {
    expect(document.documentElement.scrollWidth, `dashboard after scroll at ${width}px`).to.be.at.most(
      document.documentElement.clientWidth,
    )
  })
}

describe("buying-flow stats", () => {
  let fixture: TBuyingFlowFixture
  let sessionId: string | null = null

  beforeEach(() => {
    cy.task<TBuyingFlowFixture>("prepareBuyingFlowFixtures").then(preparedFixture => {
      fixture = preparedFixture
      cy.signIn(fixture.admin)
    })
    cy.intercept("POST", "/api/rate-limit", { statusCode: 200, body: { remaining: 1, resetTime: "later" } })
    cy.intercept("POST", "/api/send-email", { statusCode: 200, body: { success: true } })
    cy.intercept("POST", "/api/telegram", { statusCode: 200, body: { success: true } })
  })

  afterEach(() => {
    if (sessionId) cy.task("deleteBuyingFlowEventsForSession", sessionId)
  })

  it("records the buying stages and switches the search panel", () => {
    cy.visit(`/en/products/${fixture.product.id}`)
    readSessionId().then(currentSessionId => {
      sessionId = currentSessionId
      waitForEvent(currentSessionId, "product_view")

      cy.contains("button", /add to cart/i).click()
      waitForEvent(currentSessionId, "add_to_cart")

      cy.get('[data-cy="open-cart"]').click()
      cy.get('[data-cy="request-better-prices"]').should("be.visible")
      waitForEvent(currentSessionId, "cart_open")

      cy.get('[data-cy="request-better-prices"]').click()
      waitForEvent(currentSessionId, "checkout_click", "request_better_prices")

      cy.visit("/en/search?query=buying-flow-cypress-miss")
      waitForEvent(currentSessionId, "search")

      cy.viewport(320, 480)
      cy.visit("/en/stats")
      cy.get('[data-cy="buying-flow-section"]').should("be.visible")
      cy.get('[data-cy="utm-dashboard-root"]').should(root => {
        expect(getComputedStyle(root[0]).paddingLeft, "phone dashboard gutter").to.equal("0px")
        expect(getComputedStyle(root[0]).paddingRight, "phone dashboard gutter").to.equal("0px")
      })
      cy.get('[data-cy="utm-metrics-grid"]').should(grid => {
        expect(getComputedStyle(grid[0]).gridTemplateColumns.split(" ").length, "phone metric columns").to.equal(2)
      })
      cy.get('[data-cy="utm-dashboard-metric"]').first().should(metric => {
        expect(parseFloat(getComputedStyle(metric[0]).paddingLeft), "phone metric padding").to.be.at.most(8)
      })
      cy.get('[data-cy="buying-flow-section"]').should(section => {
        expect(parseFloat(getComputedStyle(section[0]).paddingLeft), "phone buying-flow padding").to.be.at.most(8)
      })
      cy.get('[data-cy="buying-flow-stage-product_view"]').should("contain.text", "Viewed")
      cy.get('[data-cy="buying-flow-stage-add_to_cart"]').should("contain.text", "Added")
      cy.get('[data-cy="buying-flow-stage-cart_open"]').should("contain.text", "Cart")
      cy.get('[data-cy="buying-flow-stage-checkout_click"]').should("contain.text", "Checkout")
      cy.get('[data-cy="buying-flow-toggle-misses"]').should("have.class", "bg-brand")
      cy.contains("buying-flow-cypress-miss").should("be.visible")
      cy.get('[data-cy="buying-flow-toggle-top"]').click()
      cy.get('[data-cy="buying-flow-toggle-top"]').should("have.class", "bg-brand")
      cy.contains("buying-flow-cypress-miss").should("be.visible")

      cy.document().should(document => {
        expect(document.documentElement.scrollWidth, "stats dashboard has no mobile horizontal overflow").to.be.at.most(
          document.documentElement.clientWidth,
        )
      })
      cy.get("main button:visible").each(button => {
        const bounds = button[0].getBoundingClientRect()
        expect(Math.round(bounds.width), `${button.text().trim()} button width`).to.be.at.least(44)
        expect(Math.round(bounds.height), `${button.text().trim()} button height`).to.be.at.least(44)
      })

      cy.get('[data-cy="utm-date-picker-toggle"]').click().should("have.attr", "aria-expanded", "true")
      cy.get('[data-cy="utm-date-picker-menu"]').should("be.visible").should(menu => {
        const bounds = menu[0].getBoundingClientRect()
        const viewportWidth = menu[0].ownerDocument.documentElement.clientWidth
        expect(bounds.left, "stats date menu stays inside the left edge").to.be.at.least(0)
        expect(bounds.right, "stats date menu stays inside the right edge").to.be.at.most(viewportWidth)
        expect(bounds.top, "stats date menu stays inside the top edge").to.be.at.least(0)
        expect(bounds.bottom, "stats date menu stays inside the short viewport").to.be.at.most(480)
      })
      cy.get('[data-cy="utm-date-picker-menu"] button:visible').each(option => {
        const bounds = option[0].getBoundingClientRect()
        expect(Math.round(bounds.width), `${option.text().trim()} date option width`).to.be.at.least(44)
        expect(Math.round(bounds.height), `${option.text().trim()} date option height`).to.be.at.least(44)
      })
      cy.get('[data-cy="utm-date-picker-period"]').contains("January").click()
      cy.get('[data-cy="utm-date-picker-toggle"]').should("contain.text", "January")
      assertDailyChartControlsAfterScroll(320, 480)

      ;[
        { width: 332, height: 568 },
        { width: 414, height: 480 },
      ].forEach(({ width, height }) => {
        cy.viewport(width, height)
        cy.visit("/en/stats")
        cy.get('[data-cy="utm-dashboard-metric"]').should("have.length", 5)
        cy.get('[data-cy="buying-flow-stage-product_view"]').should("be.visible")
        cy.get('[data-cy="utm-dashboard-root"]').should(root => {
          expect(getComputedStyle(root[0]).paddingLeft, `phone gutter at ${width}px`).to.equal("0px")
          expect(getComputedStyle(root[0]).paddingRight, `phone gutter at ${width}px`).to.equal("0px")
        })
        cy.get('[data-cy="utm-metrics-grid"]').should(grid => {
          expect(getComputedStyle(grid[0]).gridTemplateColumns.split(" ").length, `metric columns at ${width}px`).to.equal(2)
        })
        cy.document().should(document => {
          expect(document.documentElement.scrollWidth, `stats dashboard at ${width}px`).to.be.at.most(
            document.documentElement.clientWidth,
          )
        })
        assertDailyChartControlsAfterScroll(width, height)
      })
    })
  })
})
