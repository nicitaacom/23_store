import type { Interception } from "cypress/types/net-stubbing"

import {
  recordVerifiedRoute,
  recordVerifiedServiceOperation,
  readOpenAIRequestEvidence,
  reservePaidScenarioOperation,
  settlePaidScenarioOperation,
} from "./support"

type TRouteResult<TBody> = { statusCode: number; body: TBody; interception: Interception }
type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TPaidOperation = {
  operationKey: string
  provider: string
  capability: string
  estimateName: string
  paidCallCount: number
}
type TImageQuotaSnapshot = {
  success: boolean
  dailyLimit: number
  dailyUsed: number
  dailyRemaining: number
  purchaseCycleLimit: number
  purchaseCycleUsed: number
  purchaseCycleRemaining: number
  epoch: number
}
type TImageRequestEvidence = {
  interception: Interception
  applicationRequestId: string | null
  limit: number
  remaining: number
  dailyUsed: number
}

function getApplicationRequestId(interception: Interception) {
  return String(interception.response?.headers["x-application-request-id"] ?? "")
}

const MAX_AI_IMAGES_PER_DAY = 5
// eslint-disable-next-line local-rules/no-banned-words -- Matches the atomic Redis operation name recorded by the request inventory.
const REDIS_ATOMIC_SCRIPT_CALL = "eval"
let routeSequence = 0
let imageRequestSequence = 0

function browserRequest<TBody>(method: string, url: string, body?: Record<string, unknown>): Cypress.Chainable<TRouteResult<TBody>> {
  const alias = `plan25AIToolsRoute${++routeSequence}`
  cy.intercept(method, url).as(alias)

  return cy.window().then(browserWindow => {
    const headers: Record<string, string> = body ? { "content-type": "application/json" } : {}
    if (url.startsWith("/api/e2e/")) {
      const accessToken = Array.from({ length: browserWindow.localStorage.length }, (_, index) => {
        const key = browserWindow.localStorage.key(index)
        if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) return null
        try {
          const session = JSON.parse(browserWindow.localStorage.getItem(key) ?? "null") as { access_token?: unknown } | null
          return typeof session?.access_token === "string" ? session.access_token : null
        } catch {
          return null
        }
      }).find(token => token !== null)
      if (!accessToken) throw new Error("The signed-in run account has no Supabase access token in browser storage")
      headers.Authorization = `Bearer ${accessToken}`
    }

    return browserWindow.fetch(url, {
      method,
      credentials: "include",
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(body ? { body: JSON.stringify(body) } : {}),
    }).then(async response => ({
    statusCode: response.status,
    body: await response.json() as TBody,
    }))
  }).then(result => cy.wait<Interception>(`@${alias}`).then(interception => ({ ...result, interception })))
}

function browserImageRequest(prompt: string) {
  const alias = `plan25AIImageRoute${++imageRequestSequence}`
  cy.intercept("POST", "/api/ai/generate-image").as(alias)

  return cy.window().then(browserWindow => browserWindow.fetch("/api/ai/generate-image", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  }).then(async response => {
    const headers = response.headers
    const contentType = headers.get("content-type") ?? ""
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer())
      const dimensions = bytes.length >= 24
        ? {
            width: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16),
            height: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(20),
          }
        : { width: 0, height: 0 }
      return {
        statusCode: response.status,
        contentType,
        error: undefined,
        code: undefined,
        byteLength: bytes.length,
        signature: Array.from(bytes.slice(0, 8)),
        ...dimensions,
        providerRequestIds: JSON.parse(headers.get("x-openai-request-ids") ?? "[]") as string[],
        providerAttemptCount: Number(headers.get("x-openai-attempt-count")),
        applicationRequestId: headers.get("x-application-request-id"),
        imageDownloadStatus: headers.get("x-generated-image-download-status"),
        limit: Number(headers.get("x-ratelimit-limit")),
        remaining: Number(headers.get("x-ratelimit-remaining")),
        dailyUsed: Number(headers.get("x-ratelimit-used")),
        accountLimit: Number(headers.get("x-ai-image-account-limit")),
        accountRemaining: Number(headers.get("x-ai-image-account-remaining")),
        accountEpoch: Number(headers.get("x-ai-image-account-epoch")),
      }
    }

    const body = await response.json() as { error?: string; code?: string }
    return {
      statusCode: response.status,
      contentType,
      error: body.error,
      code: body.code,
      byteLength: 0,
      signature: [] as number[],
      width: 0,
      height: 0,
      providerRequestIds: JSON.parse(headers.get("x-openai-request-ids") ?? "[]") as string[],
      providerAttemptCount: Number(headers.get("x-openai-attempt-count")),
      applicationRequestId: headers.get("x-application-request-id"),
      imageDownloadStatus: null,
      limit: Number(headers.get("x-ratelimit-limit")),
      remaining: Number(headers.get("x-ratelimit-remaining")),
      dailyUsed: Number(headers.get("x-ratelimit-used")),
      accountLimit: Number(headers.get("x-ai-image-account-limit")),
      accountRemaining: Number(headers.get("x-ai-image-account-remaining")),
      accountEpoch: Number(headers.get("x-ai-image-account-epoch")),
    }
  })).then(result => cy.wait<Interception>(`@${alias}`, { timeout: 180000 }).then(interception => ({ ...result, interception })))
}

function clickAIImageGenerationButton() {
  const alias = `plan25AIImageButtonRoute${++imageRequestSequence}`
  cy.intercept("POST", "/api/ai/generate-image").as(alias)

  return cy.viewport(1280, 800)
    .then(() => cy.get('[data-cy="ai-chat-generate-image"]').should("be.visible").and("be.enabled").click())
    .then(() => cy.wait<Interception>(`@${alias}`, { timeout: 180000 }))
    .then(interception => {
      const responseHeaders = interception.response?.headers ?? {}
      const getHeader = (name: string) => String(responseHeaders[name.toLowerCase()] ?? "")
      const responseBody = interception.response?.body as { error?: unknown; code?: unknown } | undefined
      let providerRequestIds: unknown = []
      try {
        providerRequestIds = JSON.parse(getHeader("x-openai-request-ids") || "[]") as unknown
      } catch {
        throw new Error("The image route returned invalid provider request-id JSON")
      }

      return {
        interception,
        statusCode: interception.response?.statusCode ?? 0,
        error: typeof responseBody?.error === "string" ? responseBody.error : "",
        code: typeof responseBody?.code === "string" ? responseBody.code : "",
        providerRequestIds: Array.isArray(providerRequestIds) ? providerRequestIds as string[] : [],
        applicationRequestId: getHeader("x-application-request-id"),
        providerAttemptCount: Number(getHeader("x-openai-attempt-count")),
        limit: Number(getHeader("x-ratelimit-limit")),
        remaining: Number(getHeader("x-ratelimit-remaining")),
        dailyUsed: Number(getHeader("x-ratelimit-used")),
        accountLimit: Number(getHeader("x-ai-image-account-limit")),
        accountRemaining: Number(getHeader("x-ai-image-account-remaining")),
      }
    })
}

function runKey(name: string) {
  return `${String(Cypress.expose("E2E_RUN_ID"))}:ai-tools:${name}`
}

function recordOpenAIServiceCalls(
  sourcePath: string,
  functionName: string,
  evidence: { requestIds: string[]; attemptCount: number },
  verificationReference: (requestId: string, attemptIndex: number) => string,
) {
  return cy.wrap(evidence.requestIds, { log: false }).each((requestId, index) => recordVerifiedServiceOperation({
    sourcePath,
    functionName,
    callName: "create",
    requestId: String(requestId),
    scenarioId: "ai-tools",
    verificationReference: verificationReference(String(requestId), Number(index) + 1),
    details: { attemptIndex: Number(index) + 1, attemptCount: evidence.attemptCount },
  }))
}

function recordImageQuotaRedisReads(result: TRouteResult<TImageQuotaSnapshot>, userId: string) {
  const requestId = getApplicationRequestId(result.interception)
  const readback = result.body
  return recordVerifiedServiceOperation({
    sourcePath: "app/libs/ai/imageGenerationQuota.ts",
    functionName: "readAIImageQuota",
    callName: "hget",
    fingerprint: 'redis.hget<number>(usageKey(userId), "count")',
    requestId,
    scenarioId: "ai-tools",
    resourceId: userId,
    verificationReference: `upstash:ai-image-purchase-cycle:${userId}:used-${readback.purchaseCycleUsed}-of-${readback.purchaseCycleLimit}`,
    details: { field: "count", epoch: readback.epoch },
  }).then(() => recordVerifiedServiceOperation({
    sourcePath: "app/libs/ai/imageGenerationQuota.ts",
    functionName: "readAIImageQuota",
    callName: "hget",
    fingerprint: 'redis.hget<number>(usageKey(userId), "epoch")',
    requestId,
    scenarioId: "ai-tools",
    resourceId: userId,
    verificationReference: `upstash:ai-image-purchase-cycle:${userId}:epoch-${readback.epoch}`,
    details: { field: "epoch", count: readback.purchaseCycleUsed },
  })).then(() => recordVerifiedServiceOperation({
    sourcePath: "app/libs/ai/imageGenerationQuota.ts",
    functionName: "readAIImageQuota",
    callName: "get",
    fingerprint: "redis.get<number>(dailyUsageKey(userId))",
    requestId,
    scenarioId: "ai-tools",
    resourceId: userId,
    verificationReference: `upstash:ai-image-daily:${userId}:used-${readback.dailyUsed}-of-${readback.dailyLimit}`,
    details: { dailyRemaining: readback.dailyRemaining },
  }))
}

function recordImageGenerationRouteServices(result: TImageRequestEvidence, userId: string) {
  const requestId = result.applicationRequestId ?? ""
  let records = recordVerifiedServiceOperation({
    sourcePath: "app/api/ai/generate-image/route.ts",
    functionName: "POST",
    callName: "getUser",
    requestId,
    scenarioId: "ai-tools",
    resourceId: userId,
    verificationReference: `supabase-auth:verified-user:${userId};image-route-request:${requestId}`,
    details: { providerRequestIdExposed: false },
  })

  if (Number.isFinite(result.limit)) {
    records = records.then(() => recordVerifiedServiceOperation({
      sourcePath: "app/libs/ai/imageGenerationQuota.ts",
      functionName: "reserveAIImageDailyGeneration",
      callName: REDIS_ATOMIC_SCRIPT_CALL,
      requestId,
      scenarioId: "ai-tools",
      resourceId: userId,
      verificationReference: `upstash:ai-image-daily:${userId}:used-${result.dailyUsed}-of-${result.limit};remaining-${result.remaining}`,
      details: { limit: result.limit, used: result.dailyUsed, remaining: result.remaining },
    }))
  }

  return records
}

describe("monthly real-service AI tools", function () {
  this.timeout(600000)
  let accounts: TRunAccounts
  let reservedOperations: TPaidOperation[] = []
  let settledOperationKeys = new Set<string>()

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    reservedOperations = []
    settledOperationKeys = new Set<string>()
    cy.signIn(accounts.owner).then(() => cy.visit("/"))
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
      paidCallCount: 2,
    }
    const suffix = String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-16)
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
        const providerEvidence = readOpenAIRequestEvidence(result.interception, { maxAttempts: 2 })
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
        }).then(() => recordOpenAIServiceCalls(
          "app/api/ai/suggest-category/route.ts",
          "POST",
          providerEvidence,
          (requestId, attemptIndex) => `openai:category-suggestion:${requestId};attempt-${attemptIndex};${readback}`,
        )).then(() => recordVerifiedRoute({
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
      paidCallCount: 2,
    }

    reserve(operation)
      .then(() => browserRequest<{ aiMessage?: string; message?: string }>("POST", "/api/ai", {
        prompt: "Estimate a reasonable USD selling price for a small 12V accessory. Return only one number between 4 and 15, with no currency symbol or explanation.",
      }))
      .then(result => {
        expect(result.statusCode, "real AI price response").to.equal(200)
        const providerEvidence = readOpenAIRequestEvidence(result.interception, { maxAttempts: 2 })
        const price = Number.parseFloat(result.body.aiMessage ?? "")
        expect(Number.isFinite(price) && price >= 4 && price <= 15, "finite in-range price from the model").to.equal(true)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai",
          scenarioId: "ai-tools",
          requestId: result.interception.id,
          verificationReference: `openai:price-assistance-response:${price}:usd-range-4-15`,
        }).then(() => recordOpenAIServiceCalls(
          "app/api/ai/route.ts",
          "POST",
          providerEvidence,
          (requestId, attemptIndex) => `openai:price-assistance:${requestId};attempt-${attemptIndex};finite-usd-price:${price}`,
        )).then(() => settle(operation, result.interception.id, { response: "finite-usd-price" }))
      })
  })

  it("checks print-area input and validates the actual structured model result", () => {
    const operation: TPaidOperation = {
      operationKey: runKey("print-area"),
      provider: "openai",
      capability: "AI print-area check",
      estimateName: "print_area_check",
      paidCallCount: 2,
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
        const providerEvidence = readOpenAIRequestEvidence(result.interception, { maxAttempts: 2 })
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
        }).then(() => recordOpenAIServiceCalls(
          "app/api/ai/check-print-area/route.ts",
          "POST",
          providerEvidence,
          (requestId, attemptIndex) => `openai:print-area:${requestId};attempt-${attemptIndex};matching-${result.body.isMatching};coverage-${result.body.coveragePct};spill-${result.body.spillPct}`,
        )).then(() => settle(operation, result.interception.id, { matching: result.body.isMatching }))
      })
  })

  it("generates five actual images then enforces the per-user daily limit before another provider request", function () {
    this.timeout(1500000)
    const operation: TPaidOperation = {
      operationKey: runKey("image-generation"),
      provider: "openai",
      capability: "AI product image generation",
      estimateName: "image_generation",
      paidCallCount: 40,
    }
    let totalProviderAttempts = 0
    const imageAccountId = accounts.admin.id
    const runImageRequest = (imageIndex: number): Cypress.Chainable<null> => {
      const runId = String(Cypress.expose("E2E_RUN_ID"))

      if (imageIndex === MAX_AI_IMAGES_PER_DAY) {
        return clickAIImageGenerationButton().then(result => {
          expect(result.statusCode, "the sixth real request is rejected by the server-side daily limit").to.equal(429)
          expect(result.code).to.equal("AI_IMAGE_DAILY_LIMIT")
          expect(result.error).to.match(new RegExp(`limit of ${MAX_AI_IMAGES_PER_DAY} AI image generations`, "i"))
          expect(result.limit).to.equal(MAX_AI_IMAGES_PER_DAY)
          expect(result.remaining).to.equal(0)
          expect(result.accountLimit).to.equal(50)
          expect(result.accountRemaining).to.equal(50 - MAX_AI_IMAGES_PER_DAY)
          expect(result.providerRequestIds, "a rejected request never reached OpenAI").to.have.length(0)
          expect(Number.isNaN(result.providerAttemptCount), "the rejected request has no provider attempt header").to.equal(true)
          const applicationRequestId = result.applicationRequestId ?? ""
          expect(applicationRequestId.length, "the image route exposes its real application correlation id").to.be.greaterThan(0)
          return cy.get('[data-cy="app-toast"]').should("contain.text", result.error)
            .then(() => cy.get('[data-cy="ai-chat-messages"]').should("contain.text", result.error))
            .then(() => recordVerifiedRoute({
            method: "POST",
            route: "/api/ai/generate-image",
            scenarioId: "ai-tools",
            requestId: applicationRequestId,
            resourceId: imageAccountId,
            verificationReference: `supabase-auth:${imageAccountId};upstash:ai-image-daily-limit:five-used;sixth-request-rejected-before-openai`,
            details: { limit: result.limit, remaining: result.remaining, providerCalls: 0 },
          })).then(() => recordImageGenerationRouteServices(result, imageAccountId)).then(() => recordVerifiedServiceOperation({
            sourcePath: "app/libs/ai/imageGenerationQuota.ts",
            functionName: "releaseAIImageGeneration",
            callName: REDIS_ATOMIC_SCRIPT_CALL,
            requestId: applicationRequestId,
            scenarioId: "ai-tools",
            resourceId: imageAccountId,
            verificationReference: `upstash:ai-image-purchase-cycle:${imageAccountId}:failed-daily-reservation-released;count-${MAX_AI_IMAGES_PER_DAY}`,
            details: { reason: "daily-limit-reached", reservationReleased: true },
          })).then(() => settle(operation, applicationRequestId, {
            userId: imageAccountId,
            successfulImages: MAX_AI_IMAGES_PER_DAY,
            deniedRequests: 1,
            actualProviderAttempts: totalProviderAttempts,
          })).then(() => browserRequest<TImageQuotaSnapshot>("POST", "/api/e2e/ai-image-quota", {
            action: "snapshot",
            runId: String(Cypress.expose("E2E_RUN_ID")),
          })).then(quotaReadback => {
            expect(quotaReadback.statusCode, "the run-owned production app reads the real Redis quota").to.equal(200)
            expect(quotaReadback.body).to.include({
              success: true,
              dailyLimit: MAX_AI_IMAGES_PER_DAY,
              dailyUsed: MAX_AI_IMAGES_PER_DAY,
              dailyRemaining: 0,
              purchaseCycleLimit: 50,
              purchaseCycleUsed: MAX_AI_IMAGES_PER_DAY,
              purchaseCycleRemaining: 50 - MAX_AI_IMAGES_PER_DAY,
            })
            return recordVerifiedRoute({
              method: "POST",
              route: "/api/e2e/ai-image-quota",
              scenarioId: "ai-tools",
              requestId: getApplicationRequestId(quotaReadback.interception),
              resourceId: imageAccountId,
              verificationReference: `upstash:run-account:${imageAccountId}:daily-${quotaReadback.body.dailyUsed}-of-${quotaReadback.body.dailyLimit};purchase-cycle-${quotaReadback.body.purchaseCycleUsed}-of-${quotaReadback.body.purchaseCycleLimit}`,
              details: { dailyRemaining: quotaReadback.body.dailyRemaining, purchaseCycleRemaining: quotaReadback.body.purchaseCycleRemaining, epoch: quotaReadback.body.epoch },
            }).then(() => recordImageQuotaRedisReads(quotaReadback, imageAccountId)).then(() => cy.wrap(null, { log: false }))
          })
        })
      }

      return browserImageRequest(`A ceramic sour cream container in clean studio light, E2E run ${runId}, image ${imageIndex + 1}`)
        .then(result => {
          expect(result.statusCode, `real generated image ${imageIndex + 1}`).to.equal(200)
          expect(result.contentType).to.match(/^image\//)
          expect(result.byteLength).to.be.greaterThan(10000)
          expect(result.signature).to.deep.equal([137, 80, 78, 71, 13, 10, 26, 10])
          expect(result.width).to.be.greaterThan(0)
          expect(result.height).to.be.greaterThan(0)
          expect(result.limit).to.equal(MAX_AI_IMAGES_PER_DAY)
          expect(result.remaining).to.equal(MAX_AI_IMAGES_PER_DAY - imageIndex - 1)
          expect(result.accountLimit).to.equal(50)
          expect(result.accountRemaining).to.equal(50 - imageIndex - 1)
          expect(["not-needed", "200"], "the generated image bytes came from the provider response or a successful actual download")
            .to.include(result.imageDownloadStatus)

          const providerEvidence = readOpenAIRequestEvidence(result.interception, { maxAttempts: 8 })
          const applicationRequestId = result.applicationRequestId ?? ""
          expect(applicationRequestId.length, "the image route exposes its real application correlation id").to.be.greaterThan(0)
          expect(result.providerAttemptCount, "the image route reports every bounded model request attempt")
            .to.equal(providerEvidence.attemptCount)
          expect(result.providerRequestIds, "every actual image-model request has an OpenAI reference")
            .to.deep.equal(providerEvidence.requestIds)
          totalProviderAttempts += providerEvidence.attemptCount

          return recordVerifiedRoute({
            method: "POST",
            route: "/api/ai/generate-image",
            scenarioId: "ai-tools",
            requestId: applicationRequestId,
            resourceId: imageAccountId,
            verificationReference: `openai:image-response:png:${result.width}x${result.height}:${result.byteLength}-bytes;daily-limit-remaining-${result.remaining}`,
            details: { imageNumber: imageIndex + 1, limit: result.limit, remaining: result.remaining },
          }).then(() => recordImageGenerationRouteServices(result, imageAccountId)).then(() => recordVerifiedServiceOperation({
            sourcePath: "app/libs/ai/imageGenerationQuota.ts",
            functionName: "reserveAIImageGeneration",
            callName: REDIS_ATOMIC_SCRIPT_CALL,
            requestId: applicationRequestId,
            scenarioId: "ai-tools",
            resourceId: imageAccountId,
            verificationReference: `upstash:ai-image-purchase-cycle:${imageAccountId}:reserved-${imageIndex + 1}-of-50;remaining-${result.accountRemaining}`,
            details: { count: imageIndex + 1, epoch: result.accountEpoch },
          })).then(() => cy.wrap(result.providerRequestIds, { log: false }).each((providerRequestId, attemptIndex) =>
            recordVerifiedServiceOperation({
              sourcePath: "app/api/ai/generate-image/route.ts",
              functionName: "generateWithAvailableModel",
              callName: "generate",
              requestId: String(providerRequestId),
              scenarioId: "ai-tools",
              resourceId: imageAccountId,
              verificationReference: `openai:image-model:${String(providerRequestId)};image-${imageIndex + 1};attempt-${Number(attemptIndex) + 1};png:${result.width}x${result.height}:${result.byteLength}-bytes`,
              details: { imageNumber: imageIndex + 1, attemptIndex: Number(attemptIndex) + 1, attemptCount: result.providerAttemptCount },
            }),
          )).then(() => result.imageDownloadStatus === "200"
            ? recordVerifiedServiceOperation({
                sourcePath: "app/api/ai/generate-image/route.ts",
                functionName: "POST",
                callName: "fetch",
                requestId: applicationRequestId,
                resourceId: imageAccountId,
                scenarioId: "ai-tools",
                verificationReference: `image-download:HTTP-${result.imageDownloadStatus};image-${imageIndex + 1};png:${result.width}x${result.height}:${result.byteLength}-bytes`,
              })
            : cy.wrap(null))
            .then(() => runImageRequest(imageIndex + 1))
        })
    }

    reserve(operation).then(() => cy.signIn(accounts.admin)).then(() => runImageRequest(0))
  })

  it("checks the 50-image purchase-cycle boundary with one real generation and no mocked provider response", function () {
    this.timeout(360000)
    const imageAccountId = accounts.other.id
    const operation: TPaidOperation = {
      operationKey: runKey("image-purchase-cycle-limit"),
      provider: "openai",
      capability: "AI product image generation at purchase-cycle boundary",
      estimateName: "image_generation",
      paidCallCount: 8,
    }
    const runId = String(Cypress.expose("E2E_RUN_ID"))
    let deniedRequestId = ""

    reserve(operation).then(() => cy.signIn(accounts.other))
      .then(() => browserRequest<{
        success: boolean
        purchaseCycleLimit: number
        purchaseCycleUsed: number
        purchaseCycleRemaining: number
      }>("POST", "/api/e2e/ai-image-quota", { action: "prepare-cycle-boundary", runId }))
      .then(result => {
        expect(result.statusCode, "the production app prepares only this authenticated run-owned account").to.equal(200)
        expect(result.body).to.include({
          success: true,
          purchaseCycleLimit: 50,
          purchaseCycleUsed: 49,
          purchaseCycleRemaining: 1,
        })
        const applicationRequestId = getApplicationRequestId(result.interception)
        expect(applicationRequestId.length, "the quota fixture route exposes its application correlation id").to.be.greaterThan(0)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/e2e/ai-image-quota",
          scenarioId: "ai-tools",
          requestId: applicationRequestId,
          resourceId: imageAccountId,
          verificationReference: `run-owned-upstash-state:${imageAccountId}:purchase-cycle-49-of-50;one-real-generation-required`,
          details: { action: "prepare-cycle-boundary", providerCalls: 0 },
        }).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/libs/ai/imageGenerationQuota.ts",
          functionName: "prepareAIImageQuotaBoundaryForRun",
          callName: REDIS_ATOMIC_SCRIPT_CALL,
          requestId: applicationRequestId,
          scenarioId: "ai-tools",
          resourceId: imageAccountId,
          verificationReference: `upstash:ai-image-purchase-cycle:${imageAccountId}:prepared-49-of-50;read-back-confirmed`,
          details: { providerCalls: 0, purchaseCycleRemaining: 1 },
        }))
      })
      .then(() => browserImageRequest(`A ceramic sour cream container for E2E run ${runId}, final image before purchase`))
      .then(imageResult => {
        expect(imageResult.statusCode, "the last image in the current purchase cycle reaches OpenAI").to.equal(200)
        expect(imageResult.contentType).to.match(/^image\//)
        expect(imageResult.byteLength).to.be.greaterThan(10000)
        expect(imageResult.accountLimit).to.equal(50)
        expect(imageResult.accountRemaining).to.equal(0)
        const applicationRequestId = imageResult.applicationRequestId ?? ""
        expect(applicationRequestId.length, "the image route exposes its real application correlation id").to.be.greaterThan(0)
        const providerEvidence = readOpenAIRequestEvidence(imageResult.interception, { maxAttempts: 8 })
        expect(imageResult.providerRequestIds).to.deep.equal(providerEvidence.requestIds)
        expect(imageResult.providerAttemptCount).to.equal(providerEvidence.attemptCount)

        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai/generate-image",
          scenarioId: "ai-tools",
          requestId: applicationRequestId,
          resourceId: imageAccountId,
          verificationReference: `openai:image-generated;purchase-cycle-used-50-of-${imageResult.accountLimit};remaining-${imageResult.accountRemaining}`,
          details: { accountLimit: imageResult.accountLimit, accountRemaining: imageResult.accountRemaining },
        }).then(() => recordImageGenerationRouteServices(imageResult, imageAccountId)).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/libs/ai/imageGenerationQuota.ts",
          functionName: "reserveAIImageGeneration",
          callName: REDIS_ATOMIC_SCRIPT_CALL,
          requestId: applicationRequestId,
          scenarioId: "ai-tools",
          resourceId: imageAccountId,
          verificationReference: `upstash:ai-image-purchase-cycle:${imageAccountId}:reserved-50-of-${imageResult.accountLimit};remaining-0`,
          details: { count: 50, epoch: imageResult.accountEpoch },
        })).then(() => cy.wrap(imageResult.providerRequestIds, { log: false }).each((requestId, attemptIndex) =>
          recordVerifiedServiceOperation({
            sourcePath: "app/api/ai/generate-image/route.ts",
            functionName: "generateWithAvailableModel",
            callName: "generate",
            requestId: String(requestId),
            scenarioId: "ai-tools",
            resourceId: imageAccountId,
            verificationReference: `openai:image-model:${String(requestId)};purchase-cycle-final-image;attempt-${Number(attemptIndex) + 1}`,
            details: { attemptCount: imageResult.providerAttemptCount },
          }),
        )).then(() => browserImageRequest(`A ceramic sour cream container for E2E run ${runId}, denied after purchase-cycle limit`))
      })
      .then(deniedResult => {
        deniedRequestId = deniedResult.applicationRequestId ?? ""
        expect(deniedRequestId.length, "the rejected image request still has a real application correlation id").to.be.greaterThan(0)
        expect(deniedResult.statusCode, "the next request is refused before OpenAI at the 50-image cap").to.equal(429)
        expect(deniedResult.code).to.equal("AI_IMAGE_ACCOUNT_LIMIT")
        expect(deniedResult.accountLimit).to.equal(50)
        expect(deniedResult.accountRemaining).to.equal(0)
        expect(deniedResult.providerRequestIds).to.have.length(0)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai/generate-image",
          scenarioId: "ai-tools",
          requestId: deniedRequestId,
          resourceId: imageAccountId,
          verificationReference: `run-owned-upstash-state:${imageAccountId}:purchase-cycle-limit-50;rejected-before-openai`,
          details: { errorCode: deniedResult.code, providerCalls: 0 },
        }).then(() => recordImageGenerationRouteServices(deniedResult, imageAccountId)).then(() => recordVerifiedServiceOperation({
          sourcePath: "app/libs/ai/imageGenerationQuota.ts",
          functionName: "reserveAIImageGeneration",
          callName: REDIS_ATOMIC_SCRIPT_CALL,
          requestId: deniedRequestId,
          scenarioId: "ai-tools",
          resourceId: imageAccountId,
          verificationReference: `upstash:ai-image-purchase-cycle:${imageAccountId}:limit-reached-50;reservation-denied`,
          details: { allowed: false, providerCalls: 0 },
        })).then(() => browserRequest<TImageQuotaSnapshot>("POST", "/api/e2e/ai-image-quota", { action: "snapshot", runId }))
      })
      .then(quotaReadback => {
        expect(quotaReadback.statusCode).to.equal(200)
        expect(quotaReadback.body).to.include({
          success: true,
          purchaseCycleLimit: 50,
          purchaseCycleUsed: 50,
          purchaseCycleRemaining: 0,
        })
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/e2e/ai-image-quota",
          scenarioId: "ai-tools",
          requestId: getApplicationRequestId(quotaReadback.interception),
          resourceId: imageAccountId,
          verificationReference: `upstash:run-account:${imageAccountId}:purchase-cycle-${quotaReadback.body.purchaseCycleUsed}-of-${quotaReadback.body.purchaseCycleLimit}`,
          details: { purchaseCycleRemaining: quotaReadback.body.purchaseCycleRemaining },
        }).then(() => recordImageQuotaRedisReads(quotaReadback, imageAccountId)).then(() => settle(operation, deniedRequestId, {
          userId: imageAccountId,
          successfulImages: 1,
          deniedRequests: 1,
        }))
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
