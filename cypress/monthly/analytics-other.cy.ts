import type { Interception } from "cypress/types/net-stubbing"

import { recordResource, recordVerifiedRoute, reservePaidScenarioOperation, settlePaidScenarioOperation } from "./support"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TRouteResult<TBody> = { statusCode: number; body: TBody; interception: Interception }
type TPriceConversion = {
  data?: { quote?: { USD?: { price?: number } } }
  status?: { error_code?: number; error_message?: string | null }
}
type TDemoSeedResponse = {
  ownerId?: string
  countRequested?: number
  countProcessed?: number
  firstId?: string
  lastId?: string
  error?: string
}
type TProductRow = {
  id: string
  owner_id: string
  price_id: string
  price: number
  on_stock: number
} | null
type TDemoCount = { ownerId?: string; seededProducts?: number; error?: string }

let routeSequence = 0

function browserRequest<TBody>(method: string, url: string, body?: Record<string, unknown>): Cypress.Chainable<TRouteResult<TBody>> {
  const alias = `plan25AnalyticsRoute${++routeSequence}`
  cy.intercept(method, url).as(alias)
  return cy.window().then(browserWindow => browserWindow.fetch(url, {
    method,
    credentials: "include",
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
  }).then(async response => ({ statusCode: response.status, body: await response.json() as TBody })))
    .then(result => cy.wait<Interception>(`@${alias}`).then(interception => ({ ...result, interception })))
}

function runKey(name: string) {
  return `${String(Cypress.expose("E2E_RUN_ID"))}:analytics:${name}`
}

describe("monthly analytics and provider-backed utility routes", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let paidReservation: { operationKey: string; reserved: boolean; attempted: boolean; settled: boolean } | null = null

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    paidReservation = null
    cy.signIn(accounts.owner)
    cy.visit("/")
  })

  afterEach(() => {
    if (!paidReservation?.reserved || paidReservation.settled) return
    const reservation = paidReservation
    return settlePaidScenarioOperation({
      operationKey: reservation.operationKey,
      status: reservation.attempted ? "unknown" : "failed",
      details: {
        scenarioId: "analytics-other",
        reason: reservation.attempted
          ? "CoinMarketCap request started but independent evidence was not completed"
          : "The paid provider request did not start",
      },
    }).then(() => {
      reservation.settled = true
    })
  })

  it("reads an actual CoinMarketCap conversion and checks the returned USD quote", () => {
    const operation = {
      operationKey: runKey("coinmarketcap-conversion"),
      provider: "coinmarketcap",
      capability: "BTC to USD price conversion",
      estimateName: "coinmarketcap_price_conversion",
      paidCallCount: 1,
    }
    const state = { operationKey: operation.operationKey, reserved: false, attempted: false, settled: false }
    paidReservation = state

    reservePaidScenarioOperation(operation).then(reservation => {
      expect(reservation.allowed, "provider budget reserved before the quote request").to.equal(true)
      state.reserved = true
      state.attempted = true
      return browserRequest<TPriceConversion>("POST", "/api/coinmarketcap", {
        amount: 1,
        symbol: "BTC",
        convert: "USD",
      })
    }).then(result => {
      expect(result.statusCode, "real CoinMarketCap application route").to.equal(200)
      expect(result.body.status?.error_code).to.equal(0)
      const price = result.body.data?.quote?.USD?.price
      expect(Number.isFinite(price) && Number(price) > 0, "real provider returned a positive USD quote").to.equal(true)
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/coinmarketcap",
        scenarioId: "analytics-other",
        requestId: result.interception.id,
        verificationReference: `coinmarketcap:BTC-to-USD:${price}:provider-error-code-0`,
      }).then(() => settlePaidScenarioOperation({
        operationKey: operation.operationKey,
        status: "completed",
        providerResourceId: result.interception.id,
        details: { scenarioId: "analytics-other", quote: "BTC/USD", responseContainsApiKey: false },
      })).then(() => {
        state.settled = true
      })
    })
  })

  it("imports one deterministic demo product and verifies its exact run-owned row", () => {
    const ownerFragment = accounts.owner.id.replace(/-/g, "").slice(0, 12)
    const startAt = 72
    const expectedProductId = `demo-popular-product-${ownerFragment}-073`
    const rowDetails = { fixtureKey: `demo-${String(Cypress.expose("E2E_RUN_ID")).slice(-12)}`, source: "popular-products-demo" }

    recordResource("product_row", expectedProductId, accounts.owner.id, rowDetails)
      .then(() => browserRequest<TDemoSeedResponse>("POST", "/api/popular-products/demo", { count: 1, startAt }))
      .then(result => {
        expect(result.statusCode, "real demo import route").to.equal(200)
        expect(result.body).to.include({
          ownerId: accounts.owner.id,
          countRequested: 1,
          countProcessed: 1,
          firstId: expectedProductId,
          lastId: expectedProductId,
        })
        return cy.task<TProductRow>("readRunProduct", expectedProductId)
          .then(row => ({ result, row }))
      })
      .then(({ result, row }) => {
        expect(row).to.include({ id: expectedProductId, owner_id: accounts.owner.id, price_id: `demo-price-${ownerFragment}-073` })
        expect(Number.isFinite(row?.price) && Number(row?.price) > 0).to.equal(true)
        expect(Number.isSafeInteger(row?.on_stock) && Number(row?.on_stock) > 0).to.equal(true)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/popular-products/demo",
          scenarioId: "analytics-other",
          requestId: result.interception.id,
          resourceId: expectedProductId,
          verificationReference: `supabase:23_products:${expectedProductId}:owner:${accounts.owner.id}:exact-read-back`,
          details: { importedRows: 1, cleanup: "resource-journal-exact-product-id" },
        })
      })
      .then(() => browserRequest<TDemoCount>("GET", "/api/popular-products/demo"))
      .then(result => {
        expect(result.statusCode, "run-owned demo count readback route").to.equal(200)
        expect(result.body).to.include({ ownerId: accounts.owner.id, seededProducts: 1 })
        return recordVerifiedRoute({
          method: "GET",
          route: "/api/popular-products/demo",
          scenarioId: "analytics-other",
          requestId: result.interception.id,
          resourceId: expectedProductId,
          verificationReference: `supabase:23_products:${expectedProductId}:counted-for-owner:${accounts.owner.id}`,
        })
      })
  })
})
