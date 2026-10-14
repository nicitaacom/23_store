import type { Interception } from "cypress/types/net-stubbing"

import {
  recordBlockedServiceOperation,
  recordFailedServiceOperation,
  recordVerifiedRoute,
  recordVerifiedServiceOperation,
  readOpenAIRequestEvidence,
  reservePaidScenarioOperation,
  settlePaidScenarioOperation,
} from "./support"
import { runRapidBrowserBack } from "../support/rapidActions"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = {
  id: string
  priceId: string
  ownerId: string
  price: number
  onStock: number
  translations: Record<string, { title: string; description: string }>
}
type TProductRow = { translations: Record<string, { title: string; description: string }> }
type TTranslationOutcome = "saved" | "blocked_by_configuration" | "failed"

const scenarioId = "product-background"

function readTranslationProviderEvidence(interception: Interception, requireProviderRequestIds = true) {
  return readOpenAIRequestEvidence(interception, {
    maxAttempts: 2,
    requireEveryRequestId: requireProviderRequestIds,
  })
}

function recordOpenAIServiceCalls(requestIds: string[], field: "title" | "description", attemptCount: number, productId: string) {
  return cy.wrap(requestIds, { log: false }).each(providerRequestId => {
    const actualProviderRequestId = String(providerRequestId)
    return recordVerifiedServiceOperation({
      sourcePath: "app/api/products/translate-field/route.ts",
      functionName: "POST",
      callName: "create",
      requestId: actualProviderRequestId,
      scenarioId,
      operationScenarioId: "product-edit",
      resourceId: productId,
      verificationReference: `openai:chat-completions:${actualProviderRequestId};supabase:23_products:${productId}:translated-${field}-read-back`,
      details: { field, actualProviderCalls: attemptCount, maxAttempts: 2 },
    })
  })
}

function recordOpenAIErrorCalls(
  requestIds: string[],
  productId: string,
  outcome: Exclude<TTranslationOutcome, "saved">,
  message: string,
) {
  const requestIdsOrUnknown = requestIds.length ? requestIds : [undefined]
  return cy.wrap(requestIdsOrUnknown, { log: false }).each(providerRequestId => {
    const evidence = {
      sourcePath: "app/api/products/translate-field/route.ts",
      functionName: "POST",
      callName: "create",
      ...(providerRequestId ? { requestId: String(providerRequestId) } : {}),
      scenarioId,
      operationScenarioId: "product-edit",
      resourceId: productId,
      message,
    }
    return outcome === "blocked_by_configuration"
      ? recordBlockedServiceOperation(evidence)
      : recordFailedServiceOperation(evidence)
  })
}

describe("monthly real-service product background work", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null
  let paidOperationKeys: string[] = []
  let settledOperationKeys = new Set<string>()
  let titleRequestStarted = false
  let titleOutcome: TTranslationOutcome = "failed"
  let descriptionOutcome: TTranslationOutcome = "failed"

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    paidOperationKeys = []
    settledOperationKeys = new Set<string>()
    titleRequestStarted = false
    titleOutcome = "failed"
    descriptionOutcome = "failed"
    cy.signIn(accounts.owner)
    cy.intercept("POST", "/api/products/translate-field", request => {
      if (request.body?.field === "title") titleRequestStarted = true
      if (request.body?.field !== "title" && request.body?.field !== "description") return
      request.on("before:response", response => {
        response.setDelay(3000)
      })
    }).as("translateProductField")
  })

  afterEach(() => {
    if (product) {
      const fixture = product
      cy.signIn(accounts.owner)
      cy.request({ method: "POST", url: "/api/products/delete", body: { id: fixture.id }, failOnStatusCode: false })
        .then(response => {
          expect(response.status, "run-owned product cleanup through the application").to.equal(200)
          return cy.task<TProductFixture | null>("readRunProduct", fixture.id).should("equal", null)
        }).then(() => cy.task<string>("verifyStripeResourcesInactive", {
          productId: fixture.id,
          priceId: fixture.priceId,
        })).then(verificationReference => cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId,
          resourceId: fixture.id,
          providerId: fixture.priceId,
          verificationReference: `${verificationReference};supabase:23_products:${fixture.id}:absent`,
          at: new Date().toISOString(),
        }, { log: false }))
    }

    paidOperationKeys.filter(operationKey => !settledOperationKeys.has(operationKey)).forEach(operationKey => {
      settlePaidScenarioOperation({
        operationKey,
        status: "unknown",
        details: { scenarioId, reason: "The browser scenario ended before the real translation result was verified" },
      })
    })
  })

  it("keeps an unsaved description usable while a real title translation response is pending", () => {
    const runId = String(Cypress.expose("E2E_RUN_ID"))
    const suffix = runId.replace(/[^a-z0-9-]/gi, "-").slice(-18)
    const titleOperationKey = `${runId}:product-background:title`
    const descriptionOperationKey = `${runId}:product-background:description`
    const titleOperation = {
      operationKey: titleOperationKey,
      provider: "openai",
      capability: "owner title translation during pending UI work",
      estimateName: "field_translation",
      paidCallCount: 2,
    }
    const descriptionOperation = {
      operationKey: descriptionOperationKey,
      provider: "openai",
      capability: "owner description translation after pending UI work",
      estimateName: "field_translation",
      paidCallCount: 2,
    }
    let titleInterception: Interception
    let descriptionInterception: Interception
    let titleProviderEvidence = { requestIds: [] as string[], attemptCount: 0 }
    let descriptionProviderEvidence = { requestIds: [] as string[], attemptCount: 0 }
    cy.then(() => reservePaidScenarioOperation(titleOperation)).then(result => {
      expect(result.allowed, `paid budget for ${titleOperation.capability}`).to.equal(true)
      paidOperationKeys.push(titleOperationKey)
      return reservePaidScenarioOperation(descriptionOperation)
    }).then(result => {
      expect(result.allowed, `paid budget for ${descriptionOperation.capability}`).to.equal(true)
      paidOperationKeys.push(descriptionOperationKey)
      return cy.task<TProductFixture>("createProductFixture", {
        ownerId: accounts.owner.id,
        key: `background-${suffix}`,
        title: `E2E background product ${suffix}`,
        description: "Run-owned product for a real translation response-pending case.",
        price: 9.75,
        onStock: 4,
      })
    }).then(createdProduct => {
      product = createdProduct
      const editedTitle = `Pending-safe ${createdProduct.translations.en.title}`
      const editedDescription = `${createdProduct.translations.en.description} This unsaved draft must survive the pending translation.`
      const cardSelector = `[data-cy="owner-product"][data-product-id="${createdProduct.id}"]`
      const verifyTranslationResult = (
        interception: Interception,
        field: "title" | "description",
        submittedValue: string,
      ) => {
        if (!interception.response) throw new Error(`The ${field} translation route returned no HTTP response`)
        expect(interception.request.body).to.include({ productId: createdProduct.id, field, value: submittedValue })
        const attemptEvidence = readTranslationProviderEvidence(interception, interception.response.statusCode === 200)

        if (interception.response.statusCode === 200) {
          expect(interception.response.body).to.have.property("product")
          expect(interception.response.body).not.to.have.property("error")
          if (field === "title") titleOutcome = "saved"
          else descriptionOutcome = "saved"
          return cy.get('[data-cy="app-toast"]').should("have.attr", "data-toast-variant", "success")
        }

        const responseError = (interception.response.body as { error?: unknown }).error
        expect(responseError, "the real provider failure has a user-facing explanation").to.be.a("string")
        const errorMessage = String(responseError)
        expect(errorMessage).to.match(/unchanged/i)
        expect(errorMessage).to.match(/contact support|ask the store owner|edit the title|edit the description/i)
        expect(errorMessage).not.to.match(/invalid\s+json|request[_ ]id|stack trace|APIConnectionError|please try again|\btry again\b/i)

        const failureOutcome = interception.response.statusCode === 503
          && /no translation credits|rejected its credentials/i.test(errorMessage)
          ? "blocked_by_configuration"
          : "failed"
        if (field === "title") titleOutcome = failureOutcome
        else descriptionOutcome = failureOutcome

        return cy.get('[data-cy="app-toast"]')
          .should("have.attr", "data-toast-variant", "error")
          .and("contain.text", errorMessage)
          .then(() => cy.task<TProductRow | null>("readRunProduct", createdProduct.id))
          .then(row => {
            expect(row, "the disposable product remains available after a failed translation").not.to.equal(null)
            for (const [locale, originalTranslation] of Object.entries(createdProduct.translations)) {
              expect(row?.translations[locale]?.[field], `${locale} ${field} stayed unchanged after provider failure`)
                .to.equal(originalTranslation[field])
            }
            return recordOpenAIErrorCalls(attemptEvidence.requestIds, createdProduct.id, failureOutcome, errorMessage)
          })
      }

      cy.visit("/?modal=AdminPanel")
      cy.get(cardSelector).should("be.visible")
      cy.get(cardSelector).find('[data-cy="edit-product-description"]').click()
      cy.get(`${cardSelector} #product-description-input[contenteditable="true"]`).clear().type(editedDescription)
      cy.get(cardSelector).find('[data-cy="edit-product-title"]').click()
      cy.get(cardSelector).find('[data-cy="product-title-input"]').clear().type(editedTitle)
      cy.get(cardSelector).find('[data-cy="save-product-title"]').should("be.enabled").click()

      runRapidBrowserBack({ scenarioId, intendedOffsetMs: 250, allowedDelayMs: 100 })
      cy.get('[data-cy="unsaved-keep-editing"]').should("be.visible").and("be.enabled").click()
      cy.get(`${cardSelector} #product-description-input[contenteditable="true"]`).should("contain.text", editedDescription)
      cy.then(() => expect(titleRequestStarted, "the real title request started before Browser Back").to.equal(true))

      cy.wait<Interception>("@translateProductField", { timeout: 90000 }).then(interception => {
        titleInterception = interception
        titleProviderEvidence = readTranslationProviderEvidence(interception, interception.response?.statusCode === 200)
        return verifyTranslationResult(interception, "title", editedTitle)
      })
      cy.get(cardSelector).find('[data-cy="save-product-description"]').should("be.enabled").click()
      cy.wait<Interception>("@translateProductField", { timeout: 90000 }).then(interception => {
        descriptionInterception = interception
        descriptionProviderEvidence = readTranslationProviderEvidence(interception, interception.response?.statusCode === 200)
        return verifyTranslationResult(interception, "description", editedDescription)
      })

      return cy.task<TProductRow | null>("readRunProduct", createdProduct.id).then(row => {
        expect(row).not.to.equal(null)
        for (const [locale, originalTranslation] of Object.entries(createdProduct.translations)) {
          if (titleOutcome === "saved") {
            expect(row?.translations[locale]?.title.trim(), `${locale} title was translated and stored`).to.not.equal("")
            expect(row?.translations[locale]?.title, `${locale} title changed from the prior value`).not.to.equal(originalTranslation.title)
          } else {
            expect(row?.translations[locale]?.title, `${locale} title stayed unchanged after the provider error`).to.equal(originalTranslation.title)
          }
          if (descriptionOutcome === "saved") {
            expect(row?.translations[locale]?.description.trim(), `${locale} description was translated and stored`).to.not.equal("")
            expect(row?.translations[locale]?.description, `${locale} description changed from the prior value`).not.to.equal(originalTranslation.description)
          } else {
            expect(row?.translations[locale]?.description, `${locale} description stayed unchanged after the provider error`).to.equal(originalTranslation.description)
          }
        }
        const requestId = (interception: Interception) => String(
          interception.response?.headers["x-vercel-id"] ?? interception.response?.headers["x-request-id"] ?? interception.id,
        )
        return settlePaidScenarioOperation({
          operationKey: titleOperationKey,
          status: titleOutcome === "saved" ? "completed" : "failed",
          providerResourceId: createdProduct.id,
          details: {
            applicationRequest: "title",
            actualProviderCalls: titleProviderEvidence.attemptCount,
            maxProviderCallsReserved: 2,
            fourLocalesReadBack: titleOutcome === "saved",
            outcome: titleOutcome,
          },
        }).then(() => {
          settledOperationKeys.add(titleOperationKey)
          return settlePaidScenarioOperation({
            operationKey: descriptionOperationKey,
            status: descriptionOutcome === "saved" ? "completed" : "failed",
            providerResourceId: createdProduct.id,
            details: {
              applicationRequest: "description",
              actualProviderCalls: descriptionProviderEvidence.attemptCount,
              maxProviderCallsReserved: 2,
              fourLocalesReadBack: descriptionOutcome === "saved",
              outcome: descriptionOutcome,
            },
          })
        }).then(() => {
          settledOperationKeys.add(descriptionOperationKey)
          return titleOutcome === "saved"
            ? recordOpenAIServiceCalls(titleProviderEvidence.requestIds, "title", titleProviderEvidence.attemptCount, createdProduct.id)
            : null
        }).then(() => descriptionOutcome === "saved"
          ? recordOpenAIServiceCalls(descriptionProviderEvidence.requestIds, "description", descriptionProviderEvidence.attemptCount, createdProduct.id)
          : null).then(() => recordVerifiedRoute({
          method: "POST",
          route: "/api/products/translate-field",
          scenarioId,
          requestId: requestId(titleInterception),
          resourceId: createdProduct.id,
          verificationReference: `supabase:23_products:${createdProduct.id}:${titleOutcome === "saved" ? "translated" : "unchanged"}-title-read-back`,
          details: { outcome: titleOutcome, providerAttempts: titleProviderEvidence.attemptCount },
        })).then(() => recordVerifiedRoute({
          method: "POST",
          route: "/api/products/translate-field",
          scenarioId,
          requestId: requestId(descriptionInterception),
          resourceId: createdProduct.id,
          verificationReference: `supabase:23_products:${createdProduct.id}:${descriptionOutcome === "saved" ? "translated" : "unchanged"}-description-read-back`,
          details: { outcome: descriptionOutcome, providerAttempts: descriptionProviderEvidence.attemptCount },
        })).then(() => {
          const englishTitle = row?.translations.en.title
          if (!englishTitle) throw new Error("The English product title is missing after translation readback")
          cy.reload()
          cy.get(cardSelector).find('[data-cy="edit-product-title"]').should("contain.text", englishTitle)
        })
      })
    })
  })
})
