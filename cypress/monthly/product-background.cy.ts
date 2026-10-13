import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedRoute, reservePaidScenarioOperation, settlePaidScenarioOperation } from "./support"
import { runRapidBrowserBack } from "../support/rapidActions"

type TRunAccount = { id: string; email: string; password: string; role: string }
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

const scenarioId = "product-background"

describe("monthly real-service product background work", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null
  let paidOperationKeys: string[] = []
  let settledOperationKeys = new Set<string>()
  let titleRequestStarted = false

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    paidOperationKeys = []
    settledOperationKeys = new Set<string>()
    titleRequestStarted = false
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
    const runId = String(Cypress.env("E2E_RUN_ID"))
    const suffix = runId.replace(/[^a-z0-9-]/gi, "-").slice(-18)
    const titleOperationKey = `${runId}:product-background:title`
    const descriptionOperationKey = `${runId}:product-background:description`
    const fieldTranslationCalls = Number(Cypress.env("E2E_TRANSLATE_FIELD_MAX_PROVIDER_CALLS"))

    expect(fieldTranslationCalls, "configured translation calls for edit and pending-dialog cases").to.be.at.least(4)

    const titleOperation = {
      operationKey: titleOperationKey,
      provider: "openai",
      capability: "owner title translation during pending UI work",
      estimateName: "field_translation",
      paidCallCount: 1,
    }
    const descriptionOperation = {
      operationKey: descriptionOperationKey,
      provider: "openai",
      capability: "owner description translation after pending UI work",
      estimateName: "field_translation",
      paidCallCount: 1,
    }
    let titleInterception: Interception
    let descriptionInterception: Interception
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
        expect(interception.request.body).to.include({ productId: createdProduct.id, field: "title", value: editedTitle })
        expect(interception.response?.statusCode).to.equal(200)
      })
      cy.get(cardSelector).find('[data-cy="save-product-description"]').should("be.enabled").click()
      cy.wait<Interception>("@translateProductField", { timeout: 90000 }).then(interception => {
        descriptionInterception = interception
        expect(interception.request.body).to.include({ productId: createdProduct.id, field: "description", value: editedDescription })
        expect(interception.response?.statusCode).to.equal(200)
      })

      return cy.task<TProductRow | null>("readRunProduct", createdProduct.id).then(row => {
        expect(row).not.to.equal(null)
        for (const [locale, originalTranslation] of Object.entries(createdProduct.translations)) {
          expect(row?.translations[locale]?.title.trim(), `${locale} title was translated and stored`).to.not.equal("")
          expect(row?.translations[locale]?.title, `${locale} title changed from the prior value`).not.to.equal(originalTranslation.title)
          expect(row?.translations[locale]?.description.trim(), `${locale} description was translated and stored`).to.not.equal("")
          expect(row?.translations[locale]?.description, `${locale} description changed from the prior value`).not.to.equal(originalTranslation.description)
        }
        settledOperationKeys.add(titleOperationKey)
        settledOperationKeys.add(descriptionOperationKey)
        const requestId = (interception: Interception) => String(
          interception.response?.headers["x-vercel-id"] ?? interception.response?.headers["x-request-id"] ?? interception.id,
        )
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/products/translate-field",
          scenarioId,
          requestId: requestId(titleInterception),
          resourceId: createdProduct.id,
          verificationReference: `supabase:23_products:${createdProduct.id}:translated-title-read-back`,
        }).then(() => recordVerifiedRoute({
          method: "POST",
          route: "/api/products/translate-field",
          scenarioId,
          requestId: requestId(descriptionInterception),
          resourceId: createdProduct.id,
          verificationReference: `supabase:23_products:${createdProduct.id}:translated-description-read-back`,
        })).then(() => {
          const englishTitle = row?.translations.en.title
          if (!englishTitle) throw new Error("Translated English title was not stored")
          cy.reload()
          cy.get(cardSelector).find('[data-cy="edit-product-title"]').should("contain.text", englishTitle)
        })
      })
    })
  })
})
