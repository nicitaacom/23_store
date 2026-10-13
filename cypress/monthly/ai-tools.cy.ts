import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedRoute, reservePaidScenarioOperation, settlePaidScenarioOperation } from "./support"

type TRouteResult<TBody> = { statusCode: number; body: TBody; interception: Interception }
type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TPaidOperation = {
  operationKey: string
  provider: string
  capability: string
  estimateName: string
  paidCallCount: number
}

let routeSequence = 0

function browserRequest<TBody>(method: string, url: string, body?: Record<string, unknown>): Cypress.Chainable<TRouteResult<TBody>> {
  const alias = `plan25AIToolsRoute${++routeSequence}`
  cy.intercept(method, url).as(alias)

  return cy.window().then(browserWindow => browserWindow.fetch(url, {
    method,
    credentials: "include",
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
  }).then(async response => ({
    statusCode: response.status,
    body: await response.json() as TBody,
  }))).then(result => cy.wait<Interception>(`@${alias}`).then(interception => ({ ...result, interception })))
}

function runKey(name: string) {
  return `${String(Cypress.env("E2E_RUN_ID"))}:ai-tools:${name}`
}

describe("monthly real-service AI tools", function () {
  this.timeout(600000)
  let accounts: TRunAccounts
  let reservedOperations: TPaidOperation[] = []
  let settledOperationKeys = new Set<string>()

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    reservedOperations = []
    settledOperationKeys = new Set<string>()
    cy.visit("/")
  })

  afterEach(() => {
    reservedOperations.filter(operation => !settledOperationKeys.has(operation.operationKey)).forEach(operation => {
      settlePaidScenarioOperation({
        operationKey: operation.operationKey,
        status: "unknown",
        details: { scenarioId: "ai-tools", reason: "The browser scenario ended before provider use was settled" },
      })
    })
  })

  function reserve(operation: TPaidOperation) {
    return cy.then(() => reservePaidScenarioOperation(operation)).then(result => {
      expect(result.allowed, `paid budget for ${operation.capability}`).to.equal(true)
      reservedOperations.push(operation)
    })
  }

  function settle(operation: TPaidOperation, requestId: string, details: Record<string, unknown> = {}) {
    return settlePaidScenarioOperation({
      operationKey: operation.operationKey,
      status: "completed",
      providerResourceId: requestId,
      details: { scenarioId: "ai-tools", ...details },
    }).then(() => {
      settledOperationKeys.add(operation.operationKey)
    })
  }

  it("suggests a category and confirms the returned category exists in Supabase", () => {
    const operation: TPaidOperation = {
      operationKey: runKey("category-suggestion"),
      provider: "openai",
      capability: "product category suggestion",
      estimateName: "category_suggestion",
      paidCallCount: 1,
    }
    const suffix = String(Cypress.env("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-16)
    const title = `E2E ${suffix} dairy sour cream product`

    reserve(operation)
      .then(() => browserRequest<{ category_id?: string | null; error?: string }>(
        "POST",
        "/api/ai/suggest-category",
        { title },
      ))
      .then(result => {
        expect(result.statusCode, "real category suggestion response").to.equal(200)
        expect(result.body.error).to.equal(undefined)
        expect(result.body.category_id === null || typeof result.body.category_id === "string").to.equal(true)
        return browserRequest<{ categories: Array<{ id: string; name: string }> }>("GET", "/api/categories/select")
          .then(categories => ({ result, categories }))
      })
      .then(({ result, categories }) => {
        expect(categories.statusCode, "real category readback").to.equal(200)
        expect(categories.body.categories.length).to.be.greaterThan(0)
        const suggestedId = result.body.category_id
        if (suggestedId) expect(categories.body.categories.some(category => category.id === suggestedId)).to.equal(true)
        const readback = suggestedId
          ? `supabase:23_categories:${suggestedId}:present`
          : `supabase:23_categories:${categories.body.categories.length}:loaded;model-returned-no-match`
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai/suggest-category",
          scenarioId: "ai-tools",
          requestId: result.interception.id,
          ...(suggestedId ? { resourceId: suggestedId } : {}),
          verificationReference: readback,
        }).then(() => recordVerifiedRoute({
          method: "GET",
          route: "/api/categories/select",
          scenarioId: "pricing-categories",
          requestId: categories.interception.id,
          ...(suggestedId ? { resourceId: suggestedId } : {}),
          verificationReference: readback,
        })).then(() => settle(operation, result.interception.id, { outcome: suggestedId ? "matched-existing-category" : "valid-no-match" }))
      })
  })

  it("uses Google price research and returns a finite current price from real results", () => {
    browserRequest<{ price: number; stripeAmount: number; sourcePrices: number[] }>("POST", "/api/fetch-prices", {
      title: "wireless noise-cancelling headphones",
      description: "Over-ear headphones with Bluetooth and USB-C charging",
    }).then(result => {
      expect(result.statusCode, "price research route").to.equal(200)
      expect(result.body.sourcePrices, "real Google results, not the route's fallback price").to.have.length.greaterThan(0)
      expect(result.body.sourcePrices.every(price => Number.isFinite(price) && price > 0)).to.equal(true)
      expect(Number.isFinite(result.body.price) && result.body.price > 0).to.equal(true)
      expect(result.body.stripeAmount).to.equal(Math.round(result.body.price * 100))
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/fetch-prices",
        scenarioId: "ai-tools",
        requestId: result.interception.id,
        verificationReference: `google:real-source-prices:${result.body.sourcePrices.length};route-price:${result.body.price};stripe-cents:${result.body.stripeAmount}`,
      })
    })
  })

  it("returns a usable AI price estimate through the real application route", () => {
    const operation: TPaidOperation = {
      operationKey: runKey("price-assistance"),
      provider: "openai",
      capability: "AI price assistance",
      estimateName: "price_assistance",
      paidCallCount: 1,
    }

    reserve(operation)
      .then(() => browserRequest<{ aiMessage?: string; message?: string }>("POST", "/api/ai", {
        prompt: "Estimate a reasonable USD selling price for a small 12V accessory. Return only one number between 4 and 15, with no currency symbol or explanation.",
      }))
      .then(result => {
        expect(result.statusCode, "real AI price response").to.equal(200)
        const price = Number.parseFloat(result.body.aiMessage ?? "")
        expect(Number.isFinite(price) && price >= 4 && price <= 15, "finite in-range price from the model").to.equal(true)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai",
          scenarioId: "ai-tools",
          requestId: result.interception.id,
          verificationReference: `openai:price-assistance-response:${price}:usd-range-4-15`,
        }).then(() => settle(operation, result.interception.id, { response: "finite-usd-price" }))
      })
  })

  it("checks print-area input and validates the actual structured model result", () => {
    const operation: TPaidOperation = {
      operationKey: runKey("print-area"),
      provider: "openai",
      capability: "AI print-area check",
      estimateName: "print_area_check",
      paidCallCount: 1,
    }

    reserve(operation).then(() => cy.readFile("cypress/files/Sour Cream 30% Savya LITOVSKAYA.png", "base64"))
      .then(base64 => browserRequest<{
        isMatching?: boolean
        productRect?: { leftPct: number; topPct: number; widthPct: number; heightPct: number } | null
        coveragePct?: number
        spillPct?: number
        error?: string
      }>("POST", "/api/ai/check-print-area", {
        mockupUrl: `data:image/png;base64,${base64}`,
        mockupRect: { leftPct: 25, topPct: 25, widthPct: 50, heightPct: 50 },
        printArea: { widthMm: 100, heightMm: 100 },
      }))
      .then(result => {
        expect(result.statusCode, "real print-area model response").to.equal(200)
        expect(result.body.error).to.equal(undefined)
        expect(typeof result.body.isMatching).to.equal("boolean")
        expect(Number.isFinite(result.body.coveragePct)).to.equal(true)
        expect(Number.isFinite(result.body.spillPct)).to.equal(true)
        if (result.body.productRect) {
          expect([result.body.productRect.leftPct, result.body.productRect.topPct, result.body.productRect.widthPct, result.body.productRect.heightPct]
            .every(value => Number.isFinite(value) && value >= 0 && value <= 100)).to.equal(true)
        }
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai/check-print-area",
          scenarioId: "ai-tools",
          requestId: result.interception.id,
          verificationReference: `openai:print-area:matching-${result.body.isMatching}:coverage-${result.body.coveragePct}:spill-${result.body.spillPct}`,
        }).then(() => settle(operation, result.interception.id, { matching: result.body.isMatching }))
      })
  })

  it("generates an actual image and checks its returned bytes and dimensions", () => {
    const operation: TPaidOperation = {
      operationKey: runKey("image-generation"),
      provider: "openai",
      capability: "AI product image generation",
      estimateName: "image_generation",
      paidCallCount: 1,
    }
    cy.intercept("POST", "/api/ai/generate-image").as("generateProductImage")

    reserve(operation).then(() => cy.window().then(browserWindow => browserWindow.fetch("/api/ai/generate-image", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: `A ceramic sour cream container in clean studio light, E2E run ${String(Cypress.env("E2E_RUN_ID"))}` }),
    }).then(async response => {
      const bytes = new Uint8Array(await response.arrayBuffer())
      const dimensions = bytes.length >= 24
        ? { width: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16), height: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(20) }
        : { width: 0, height: 0 }
      return {
        statusCode: response.status,
        contentType: response.headers.get("content-type"),
        byteLength: bytes.length,
        signature: Array.from(bytes.slice(0, 8)),
        ...dimensions,
      }
    }))).then(result => cy.wait<Interception>("@generateProductImage", { timeout: 180000 }).then(interception => ({ result, interception })))
      .then(({ result, interception }) => {
        expect(result.statusCode, "real image provider response").to.equal(200)
        expect(result.contentType).to.match(/^image\//)
        expect(result.byteLength).to.be.greaterThan(10000)
        expect(result.signature).to.deep.equal([137, 80, 78, 71, 13, 10, 26, 10])
        expect(result.width).to.be.greaterThan(0)
        expect(result.height).to.be.greaterThan(0)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai/generate-image",
          scenarioId: "ai-tools",
          requestId: interception.id,
          verificationReference: `openai:image-response:png:${result.width}x${result.height}:${result.byteLength}-bytes`,
        }).then(() => settle(operation, interception.id, { width: result.width, height: result.height, byteLength: result.byteLength }))
      })
  })

  it("reads the real run-account rate-limit counter without changing a shared IP counter", () => {
    browserRequest<{ remaining: number; resetTime: string }>("POST", "/api/rate-limit", {
      limiterName: "storageUpload",
      action: "getRemaining",
      userTimezone: "UTC",
      userId: accounts.owner.id,
    }).then(result => {
      expect(result.statusCode, "real Redis rate-limit read").to.equal(200)
      expect(Number.isInteger(result.body.remaining) && result.body.remaining >= 0 && result.body.remaining <= 120).to.equal(true)
      expect(result.body.resetTime).to.be.a("string").and.not.equal("")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/rate-limit",
        scenarioId: "ai-tools",
        requestId: result.interception.id,
        resourceId: accounts.owner.id,
        verificationReference: `upstash:storage-upload:${accounts.owner.id}:remaining-${result.body.remaining}:read-only`,
      })
    })
  })
})
