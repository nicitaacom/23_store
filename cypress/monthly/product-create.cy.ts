import type { Interception } from "cypress/types/net-stubbing"

import {
  recordBlockedRoute,
  recordResource,
  recordVerifiedRoute,
  reservePaidScenarioOperation,
  settlePaidScenarioOperation,
} from "./support"
import { runRapidBrowserBack } from "../support/rapidActions"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TStorageReference = { provider: "r2" | "supabase"; bucket: string; path: string }
type TProductRow = {
  id: string
  owner_id: string
  price_id: string
  price: number
  on_stock: number
  category_id: string | null
  img_url: string[]
  variants: Array<{ id: string; label: string; price: number; quantity: number }> | null
  personalization: { isEnabled: boolean; defaultConfig: { mockupUrl: string; printArea: { widthMm: number; heightMm: number }; mockupRect: { leftPct: number; topPct: number; widthPct: number; heightPct: number } } | null } | null
  translations: Record<string, { title: string; description: string }>
}
type TProductWorkerEvidence = {
  requestId: string
  workerName: string
  workerStatus: "invoked" | "timeout"
  workerRequestId?: string
  workerVersion?: string
}

const scenarioId = "product-create-from-admin-panel"
const sourceImagePath = "cypress/files/Sour Cream 30% Savya LITOVSKAYA.png"

function runKey(name: string) {
  return `${String(Cypress.env("E2E_RUN_ID"))}:product-create:${name}`
}

describe("monthly real-service product creation", function () {
  this.timeout(700000)
  let accounts: TRunAccounts
  let paidOperationKeys: string[] = []
  let settledOperationKeys = new Set<string>()
  let scenarioProductId = ""
  let scenarioProductDeleted = false
  let titleTranslationStarted = false
  let unsavedDialogVisibleDuringTranslation = false
  let unsavedDialogBlockedDuringTranslation = false

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    paidOperationKeys = []
    settledOperationKeys = new Set<string>()
    scenarioProductId = ""
    scenarioProductDeleted = false
    titleTranslationStarted = false
    unsavedDialogVisibleDuringTranslation = false
    unsavedDialogBlockedDuringTranslation = false
    cy.signIn(accounts.owner)
    cy.intercept("POST", "/api/ai/suggest-category").as("suggestCategory")
    cy.intercept("POST", "/api/tinify").as("compressProductImage")
    cy.intercept("POST", "/api/products/add").as("createStripeProduct")
    cy.intercept("POST", "/api/storage/prepare").as("prepareProductImageUpload")
    cy.intercept("POST", "/api/storage/complete").as("completeProductImageUpload")
    cy.intercept("POST", "/api/products/translate-insert").as("insertAndTranslateProduct")
    cy.intercept("POST", "/api/products/translate-field", request => {
      if (request.body?.field !== "title") return
      titleTranslationStarted = true
      request.on("before:response", response => {
        response.setDelay(3000)
      })
    }).as("translateProductField")
    cy.intercept("POST", "/api/products/update").as("updateStripeProductImages")
    cy.intercept("POST", "/api/products/delete").as("deleteProduct")
  })

  afterEach(() => {
    if (scenarioProductId && !scenarioProductDeleted) {
      cy.request({ method: "POST", url: "/api/products/delete", body: { id: scenarioProductId }, failOnStatusCode: false })
        .then(response => {
          if (response.status >= 200 && response.status < 300) {
            scenarioProductDeleted = true
            return cy.task("appendE2EEvidence", {
              kind: "scenario-cleanup",
              status: "passed",
              scenarioId,
              resourceId: scenarioProductId,
              method: "POST",
              route: "/api/products/delete",
              verificationReference: `product-delete-route:${scenarioProductId}`,
              at: new Date().toISOString(),
            }, { log: false })
          }
          return cy.task("appendE2EEvidence", {
            kind: "scenario-cleanup",
            status: "failed",
            scenarioId,
            resourceId: scenarioProductId,
            message: `Application product cleanup returned HTTP ${response.status}; run-level journal cleanup remains required`,
            at: new Date().toISOString(),
          }, { log: false })
        })
    }
    paidOperationKeys.filter(operationKey => !settledOperationKeys.has(operationKey)).forEach(operationKey => {
      settlePaidScenarioOperation({
        operationKey,
        status: "unknown",
        details: { scenarioId, reason: "The browser scenario ended before the paid request was independently settled" },
      })
    })
  })

  it("creates from the supplied image, waits for the real translation worker, verifies services, and deletes its own product", () => {
    const runId = String(Cypress.env("E2E_RUN_ID"))
    const runSuffix = runId.replace(/[^a-zA-Z0-9-]/g, "-").slice(-20)
    const title = `Sour Cream 30% Savya LITOVSKAYA E2E ${runSuffix}`
    const description = "A chilled dairy product with a smooth texture and a mild tang."
    const variantLabel = "500 g container"
    const selectedPrice = 12.5
    const selectedStock = 12
    const translationCallCount = Number(Cypress.env("E2E_TRANSLATION_MAX_PROVIDER_CALLS"))
    const fieldTranslationCallCount = Number(Cypress.env("E2E_TRANSLATE_FIELD_MAX_PROVIDER_CALLS"))

    expect(translationCallCount, "configured maximum translation-provider calls").to.be.greaterThan(0)
    expect(fieldTranslationCallCount, "configured field-translation calls across edit and pending-dialog cases").to.be.at.least(4)

    const paidOperations = [
      {
        operationKey: runKey("tinify"),
        provider: "tinify",
        capability: "product image compression",
        estimateName: "product_image_compression",
        paidCallCount: 1,
      },
      {
        operationKey: runKey("category-suggestion"),
        provider: "openai",
        capability: "product category suggestion",
        estimateName: "category_suggestion",
        paidCallCount: 1,
      },
      {
        operationKey: runKey("translation-worker"),
        provider: "aws-lambda-and-configured-ai-provider",
        capability: "four-language product translation",
        estimateName: "product_translation_worker",
        paidCallCount: translationCallCount,
      },
    ]
    const fieldTranslationOperation = {
      operationKey: runKey("field-translations"),
      provider: "openai",
      capability: "owner title and description translation",
      estimateName: "field_translation",
      paidCallCount: 2,
    }

    paidOperations.forEach(operation => {
      cy.then(() => reservePaidScenarioOperation(operation)).then(result => {
        expect(result.allowed, `paid budget for ${operation.capability}`).to.equal(true)
        paidOperationKeys.push(operation.operationKey)
      })
    })

    cy.visit("/?modal=AdminPanel")
    cy.get('[data-cy="add-product-layout"]').should("be.visible")
    cy.get('[data-testid="add-product-upload"]').selectFile(sourceImagePath, { action: "drag-drop" })
    cy.get('[data-cy="add-product-layout"] img[alt="product-preview-1"]').should("be.visible")
    cy.get("#title").clear().type(title)
    cy.get("#add-product-description").click().type(description)
    cy.get('[data-cy="add-product-variant-label"]').clear().type(variantLabel)
    cy.get('[data-cy="add-product-variant-price"]').clear().type(String(selectedPrice))
    cy.get('[data-cy="add-product-variant-quantity"]').clear().type(String(selectedStock))
    cy.get('[data-cy="add-product-variant-submit"]').click()
    cy.get('[data-cy="create-product"]').should("be.enabled").click()

    let categoryInterception: Interception
    let compressionInterception: Interception
    let createInterception: Interception
    let prepareInterception: Interception
    let completeInterception: Interception
    let updateInterception: Interception
    let deleteInterception: Interception
    let titleEditInterception: Interception
    let descriptionEditInterception: Interception
    let manageUpdateInterception: Interception
    let categoryId = ""
    let storageDestination: { uploadId: string; reference: TStorageReference } = {
      uploadId: "",
      reference: { provider: "r2", bucket: "23_product-images", path: "" },
    }
    let imageUrl = ""
    let productId = ""
    let priceId = ""
    let stripePriceIds: string[] = []
    let workerEvidence: TProductWorkerEvidence = { requestId: "", workerName: "", workerStatus: "timeout" }
    let workerExecutionVerificationReference: string | null = null

    cy.wait("@suggestCategory", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      categoryInterception = interception
      const responseBody = interception.response?.body as { category_id?: unknown } | undefined
      expect(typeof responseBody?.category_id === "string" && responseBody.category_id.length > 0).to.equal(true)
      categoryId = String(responseBody?.category_id)
    })

    cy.wait("@compressProductImage", { timeout: 90000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.headers["content-type"]).to.match(/^image\//)
      compressionInterception = interception
    })

    cy.wait("@createStripeProduct", { timeout: 30000 }).then(interception => {
      createInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      productId = interception.response?.body.product
      priceId = interception.response?.body.id
      stripePriceIds = [priceId]
      scenarioProductId = productId
      expect(typeof productId).to.equal("string")
      expect(productId.length > 0).to.equal(true)
      expect(typeof priceId).to.equal("string")
      expect(priceId.length > 0).to.equal(true)
      return recordResource("stripe_product", productId, accounts.owner.id, { provider: "stripe", mode: "test", scenarioId })
        .then(() => recordResource("stripe_price", priceId, accounts.owner.id, { provider: "stripe", mode: "test", productId, scenarioId }))
    })

    cy.wait("@prepareProductImageUpload", { timeout: 30000 }).then(interception => {
      prepareInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      storageDestination = interception.response?.body
      expect(typeof storageDestination.uploadId === "string" && storageDestination.uploadId.length > 0).to.equal(true)
      expect(storageDestination.reference).to.include({ bucket: "23_product-images" })
      return recordResource("storage_object", storageDestination.reference.path, accounts.owner.id, {
        provider: storageDestination.reference.provider,
        bucket: storageDestination.reference.bucket,
        path: storageDestination.reference.path,
        scenarioId,
      })
    })

    cy.wait("@completeProductImageUpload", { timeout: 60000 }).then(interception => {
      completeInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      imageUrl = interception.response?.body.publicUrl
      expect(imageUrl).to.be.a("string").and.include(storageDestination.reference.path)
    })

    cy.wait("@insertAndTranslateProduct", { timeout: 90000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.body.ok).to.equal(true)
      workerEvidence = interception.response?.body.evidence
      expect(workerEvidence.workerName).to.equal("23-ai-translate")
      expect(["invoked", "timeout"]).to.include(workerEvidence.workerStatus)
      return recordResource("product_row", productId, accounts.owner.id, { scenarioId, priceId })
        .then(() => recordResource("worker", workerEvidence.workerRequestId ?? productId, accounts.owner.id, {
          scenarioId,
          workerName: workerEvidence.workerName,
          lambdaRequestId: workerEvidence.workerRequestId ?? null,
          workerVersion: workerEvidence.workerVersion ?? null,
          productId,
          terminal: false,
        }))
    })

    cy.wait("@updateStripeProductImages", { timeout: 30000 }).then(interception => {
      updateInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
    })

    cy.task<{ product: TProductRow; verificationReference: string; translatedLocales: string[] }>("waitForTranslatedProduct", {
      productId,
      title,
      description,
      timeoutMs: 600000,
    }).then(readback => {
      const product = readback.product
      expect(product).to.include({ id: productId, owner_id: accounts.owner.id, price_id: priceId, price: selectedPrice, on_stock: selectedStock })
      expect(product.category_id).to.equal(categoryId)
      expect(product.img_url).to.have.length(1)
      expect(product.img_url[0]).to.equal(imageUrl)
      expect(Object.keys(product.translations)).to.include.members(["en", "fi", "ru", "se"])
      expect(readback.translatedLocales).to.have.length(3)

      return cy.task<{ verificationReference: string }>("verifyStripeTestProduct", {
        productId,
        priceId,
        ownerId: accounts.owner.id,
        amountCents: Math.round(selectedPrice * 100),
        imageUrl,
      }).then(stripeReadback => ({ readback, stripeReadback }))
    }).then(({ readback, stripeReadback }) => {
      cy.request({ url: imageUrl, encoding: "binary", failOnStatusCode: false }).then(imageResponse => {
        expect(imageResponse.status).to.be.within(200, 299)
        expect(imageResponse.headers["content-type"]).to.match(/^image\//)
        expect(imageResponse.body.length).to.be.greaterThan(1024)

        const productCreatedEvent = cy.window().then(browserWindow => {
          const timeline = (browserWindow as unknown as Window & { __e2eRunTimeline?: Array<Record<string, unknown>> }).__e2eRunTimeline ?? []
          const matchingEvent = timeline.find(event => event.kind === "product-created-pusher-event" && event.productId === productId)
          expect(Boolean(matchingEvent), "actual product:created Pusher event received by the browser").to.equal(true)
          if (typeof matchingEvent?.productId !== "string") throw new Error("Pusher event did not include a product id")
          return matchingEvent.productId
        })

        productCreatedEvent.then(eventProductId => {
          if (workerEvidence.workerStatus === "invoked") {
            if (!workerEvidence.workerRequestId) throw new Error("Invoked Lambda response did not include its AWS request id")
            cy.task<{ verificationReference: string }>("verifyLambdaExecution", {
              requestId: workerEvidence.workerRequestId,
              functionName: workerEvidence.workerName,
            }).then(workerReadback => {
              workerExecutionVerificationReference = workerReadback.verificationReference
              return cy.task("recordWorkerCompletion", {
                runId: Cypress.env("E2E_RUN_ID"),
                resourceId: workerEvidence.workerRequestId,
                ownerId: accounts.owner.id,
                details: { productId, workerName: workerEvidence.workerName, terminalLogVerified: true },
                verificationReference: `${readback.verificationReference};pusher-event:${eventProductId};${workerReadback.verificationReference}`,
              })
            })
          }
          cy.get(`[data-cy="owner-product"][data-product-id="${productId}"]`).should("be.visible")
          cy.reload()
          cy.get(`[data-cy="owner-product"][data-product-id="${productId}"]`).should("be.visible")

          const cardSelector = `[data-cy="owner-product"][data-product-id="${productId}"]`
          const editedTitle = `${title} edited`
          const editedDescription = `${description} Updated for monthly check.`

          cy.get(cardSelector).find('[data-cy="edit-product-description"]').click()
          cy.get(`${cardSelector} #product-description-input[contenteditable="true"]`)
            .clear().type(editedDescription)
          cy.then(() => reservePaidScenarioOperation(fieldTranslationOperation)).then(result => {
            expect(result.allowed, "paid budget for owner title and description translation").to.equal(true)
            paidOperationKeys.push(fieldTranslationOperation.operationKey)
          })
          cy.get(cardSelector).find('[data-cy="edit-product-title"]').click()
          cy.get(cardSelector).find('[data-cy="product-title-input"]').clear().type(editedTitle)
          cy.get(cardSelector).find('[data-cy="save-product-title"]').should("be.enabled").click()
          runRapidBrowserBack({ scenarioId: "product-background", intendedOffsetMs: 250, allowedDelayMs: 100 })
          cy.wait(100)
          cy.get("body").then($body => {
            const button = $body.find('[data-cy="unsaved-keep-editing"]')
            unsavedDialogVisibleDuringTranslation = button.length > 0
            if (!unsavedDialogVisibleDuringTranslation) {
              return cy.task("appendE2EEvidence", {
                kind: "application-defect",
                status: "failed",
                scenarioId: "product-background",
                resourceId: productId,
                message: "Browser Back did not show the unsaved-changes dialog while a separate description draft remained",
                at: new Date().toISOString(),
              }, { log: false })
            }
            unsavedDialogBlockedDuringTranslation = Cypress.$(button).is(":disabled")
            if (!unsavedDialogBlockedDuringTranslation) return
            return cy.task("appendE2EEvidence", {
              kind: "application-defect",
              status: "failed",
              scenarioId: "product-background",
              resourceId: productId,
              message: "The Keep editing button was disabled while the real title translation request was pending",
              at: new Date().toISOString(),
            }, { log: false })
          })
          cy.then(() => {
            if (!titleTranslationStarted) {
              return cy.task("appendE2EEvidence", {
                kind: "application-defect",
                status: "failed",
                scenarioId: "product-background",
                resourceId: productId,
                message: "The title translation request had not reached the application at the 250 ms browser-back action",
                at: new Date().toISOString(),
              }, { log: false })
            }
            return undefined
          })
          cy.wait("@translateProductField", { timeout: 90000 }).then(interception => {
            titleEditInterception = interception
            expect(interception.request.body).to.include({ productId, field: "title", value: editedTitle })
            expect(interception.response?.statusCode).to.equal(200)
          })
          cy.then(() => {
            if (!unsavedDialogVisibleDuringTranslation) return undefined
            cy.get('[data-cy="unsaved-keep-editing"]').should("be.enabled").click()
            return cy.get(`${cardSelector} #product-description-input[contenteditable="true"]`)
              .should("contain.text", editedDescription)
          })
          cy.get(cardSelector).find('[data-cy="save-product-description"]').should("be.enabled").click()
          cy.wait("@translateProductField", { timeout: 90000 }).then(interception => {
            descriptionEditInterception = interception
            expect(interception.request.body).to.include({ productId, field: "description", value: editedDescription })
            expect(interception.response?.statusCode).to.equal(200)
          })
          cy.task<TProductRow | null>("readRunProduct", productId).should(product => {
            expect(product, "translated title and description database row").not.to.equal(null)
            expect(Object.values(product?.translations ?? {}).some(translation => translation.title === editedTitle)).to.equal(true)
            expect(Object.values(product?.translations ?? {}).some(translation => translation.description === editedDescription)).to.equal(true)
          })
          cy.get(cardSelector).find('[data-cy="edit-product-title"]').should("contain.text", editedTitle)

          const actualRequestId = (interception: Interception) => String(
            interception.response?.headers["x-vercel-id"] ?? interception.response?.headers["x-request-id"] ?? interception.id,
          )
          const managedTitle = `Managed ${editedTitle}`
          const managedDescription = `${editedDescription} Owner page save.`
          cy.visit(`/en/products/${productId}/manage`)
          cy.get('[data-cy="manage-product-info-panel"]').should("be.visible")
          cy.get("#title").clear().type(managedTitle)
          cy.get("#subTitle").clear().type(managedDescription)
          cy.get('[data-cy="manage-save"]').should("be.enabled").click()
          cy.wait("@updateStripeProductImages", { timeout: 30000 }).then(interception => {
            manageUpdateInterception = interception
            expect(interception.request.body.productId).to.equal(productId)
            expect(interception.request.body.translations.en).to.include({ title: managedTitle, description: managedDescription })
            expect(interception.response?.statusCode).to.equal(200)
          })
          cy.task<TProductRow | null>("readRunProduct", productId).should(product => {
            expect(product?.translations.en).to.include({ title: managedTitle, description: managedDescription })
          })
          cy.reload()
          cy.get("#title").should("have.value", managedTitle)

          cy.task<TProductRow | null>("readRunProduct", productId).then(managedProduct => {
            expect(managedProduct?.translations.en).to.include({ title: managedTitle, description: managedDescription })
            return cy.task<{ verificationReference: string }>("verifyStripeTestProduct", {
              productId,
              priceId,
              ownerId: accounts.owner.id,
              amountCents: Math.round(selectedPrice * 100),
              imageUrl,
              name: managedProduct?.translations.fi.title,
              description: managedProduct?.translations.fi.description,
            }).then(stripeEditReadback => {
              expect(managedProduct).not.to.equal(null)
              expect(Object.keys(managedProduct?.translations ?? {})).to.include.members(["en", "fi", "ru", "se"])
              const titleLocale = Object.entries(managedProduct?.translations ?? {}).find(([, value]) => value.title === editedTitle)?.[0]
              const descriptionLocale = Object.entries(managedProduct?.translations ?? {}).find(([, value]) => value.description === editedDescription)?.[0]
              expect(titleLocale, "title saved to an actual locale").to.be.a("string")
              expect(descriptionLocale, "description saved to an actual locale").to.be.a("string")
              const editEvidence = [
                () => recordVerifiedRoute({
                  method: "POST",
                  route: "/api/products/translate-field",
                  scenarioId: "product-edit",
                  requestId: actualRequestId(titleEditInterception),
                  resourceId: productId,
                  verificationReference: `supabase:23_products:${productId}:title:${titleLocale}`,
                }),
                () => recordVerifiedRoute({
                  method: "POST",
                  route: "/api/products/translate-field",
                  scenarioId: "product-edit",
                  requestId: actualRequestId(descriptionEditInterception),
                  resourceId: productId,
                  verificationReference: `supabase:23_products:${productId}:description:${descriptionLocale}`,
                }),
                () => recordVerifiedRoute({
                  method: "POST",
                  route: "/api/products/update",
                  scenarioId: "product-edit",
                  requestId: actualRequestId(manageUpdateInterception),
                  resourceId: productId,
                  verificationReference: `supabase:23_products:${productId}:translations:en;${stripeEditReadback.verificationReference}`,
                }),
              ]
              const runIdValue = String(Cypress.env("E2E_RUN_ID"))
              const routeEvidence = [
                ...editEvidence,
                () => recordVerifiedRoute({ method: "POST", route: "/api/ai/suggest-category", scenarioId: "ai-tools", requestId: actualRequestId(categoryInterception), providerId: categoryId, verificationReference: `23_products:${productId}:category_id`, details: { runId: runIdValue } }),
                () => recordVerifiedRoute({ method: "POST", route: "/api/tinify", scenarioId: "personalization-storage", requestId: actualRequestId(compressionInterception), resourceId: storageDestination.reference.path, verificationReference: `${storageDestination.reference.provider}:${storageDestination.reference.bucket}/${storageDestination.reference.path}:image-bytes-read-back` }),
                () => recordVerifiedRoute({ method: "POST", route: "/api/products/add", scenarioId: "product-create", requestId: actualRequestId(createInterception), providerId: productId, verificationReference: stripeReadback.verificationReference, details: { stripePriceId: priceId } }),
                () => recordVerifiedRoute({ method: "POST", route: "/api/storage/prepare", scenarioId: "personalization-storage", requestId: actualRequestId(prepareInterception), providerId: storageDestination.uploadId, resourceId: storageDestination.reference.path, verificationReference: `${storageDestination.reference.provider}:${storageDestination.reference.bucket}/${storageDestination.reference.path}:published-and-readable` }),
                () => recordVerifiedRoute({ method: "POST", route: "/api/storage/complete", scenarioId: "personalization-storage", requestId: actualRequestId(completeInterception), providerId: storageDestination.uploadId, resourceId: storageDestination.reference.path, verificationReference: `${storageDestination.reference.provider}:${storageDestination.reference.bucket}/${storageDestination.reference.path}:published-and-readable` }),
                () => workerExecutionVerificationReference
                  ? recordVerifiedRoute({
                      method: "POST",
                      route: "/api/products/translate-insert",
                      scenarioId: "product-create",
                      requestId: workerEvidence.requestId,
                      providerId: workerEvidence.workerRequestId ?? productId,
                      resourceId: productId,
                      verificationReference: `${readback.verificationReference};pusher-event:${eventProductId};${workerExecutionVerificationReference}`,
                      details: { workerName: workerEvidence.workerName, workerStatus: workerEvidence.workerStatus, workerVersion: workerEvidence.workerVersion ?? null, terminalLogVerified: true },
                    })
                  : recordBlockedRoute(
                      "POST",
                      "/api/products/translate-insert",
                      "product-create",
                      "The product row and Pusher event were observed, but a terminal Lambda log with an exact request ID was unavailable; worker execution remains unverified.",
                      { requestId: workerEvidence.requestId, providerId: productId, resourceId: productId },
                    ),
                () => recordVerifiedRoute({ method: "POST", route: "/api/products/update", scenarioId: "product-edit", requestId: actualRequestId(updateInterception), providerId: productId, verificationReference: `${stripeReadback.verificationReference}:image-url-present` }),
              ]
              return routeEvidence.reduce<Cypress.Chainable<unknown>>(
                (previousEvidence, recordEvidence) => previousEvidence.then(() => recordEvidence()),
                cy.wrap(null as unknown, { log: false }),
              ).then(() => {
                const updateOwnedProduct = (
                  updateName: string,
                  fields: Record<string, unknown>,
                  verify: (product: TProductRow) => void,
                ) => cy.window().then(browserWindow => browserWindow.fetch("/api/products/update", {
                  method: "POST",
                  credentials: "include",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ productId, ...fields }),
                }).then(response => response.status)).then(status => {
                  expect(status, `${updateName} owner update`).to.equal(200)
                  return cy.wait<Interception>("@updateStripeProductImages", { timeout: 30000 }).then(interception => {
                    expect(interception.response?.statusCode).to.equal(200)
                    return cy.task<TProductRow | null>("readRunProduct", productId).then(updatedProduct => {
                    expect(updatedProduct, `${updateName} database readback`).not.to.equal(null)
                    if (!updatedProduct) throw new Error(`${updateName} database readback is missing`)
                    verify(updatedProduct)
                    return recordVerifiedRoute({
                      method: "POST",
                      route: "/api/products/update",
                      scenarioId: "product-edit",
                      requestId: interception.id,
                      resourceId: productId,
                      verificationReference: `supabase:23_products:${productId}:${updateName}:read-back`,
                      details: { updatedFields: Object.keys(fields) },
                    }).then(() => updatedProduct)
                  })
                  })
                })

                const replacementVariant = {
                  id: `${productId}-e2e-variant`,
                  label: "E2E 750 g container",
                  price: selectedPrice + 1,
                  quantity: 5,
                }
                const personalization = {
                  isEnabled: true,
                  defaultConfig: {
                    mockupUrl: imageUrl,
                    printArea: { widthMm: 80, heightMm: 60 },
                    mockupRect: { leftPct: 10, topPct: 15, widthPct: 80, heightPct: 70 },
                  },
                }

                return updateOwnedProduct("stock", { onStock: selectedStock + 3 }, product => {
                  expect(product.on_stock).to.equal(selectedStock + 3)
                  expect(product.price_id).to.equal(priceId)
                  expect(product.img_url).to.deep.equal([imageUrl])
                }).then(() => updateOwnedProduct("variants", { variants: [replacementVariant] }, product => {
                  expect(product.variants).to.have.length(1)
                  expect(product.variants?.[0]).to.include(replacementVariant)
                  expect(product.on_stock).to.equal(replacementVariant.quantity)
                  expect(product.price_id).to.equal(priceId)
                })).then(() => updateOwnedProduct("category", { category_id: null }, product => {
                  expect(product.category_id).to.equal(null)
                })).then(() => updateOwnedProduct("category-restored", { category_id: categoryId }, product => {
                  expect(product.category_id).to.equal(categoryId)
                })).then(() => updateOwnedProduct("personalization", { personalization }, product => {
                  expect(product.personalization?.isEnabled).to.equal(true)
                  expect(product.personalization?.defaultConfig?.mockupUrl).to.equal(imageUrl)
                  expect(product.on_stock).to.equal(replacementVariant.quantity)
                })).then(() => updateOwnedProduct("personalization-cleared", { personalization: null }, product => {
                  expect(product.personalization).to.equal(null)
                  expect(product.category_id).to.equal(categoryId)
                })).then(() => updateOwnedProduct("price", { price: selectedPrice + 2.25 }, product => {
                  expect(product.price).to.equal(selectedPrice + 2.25)
                  expect(product.price_id).not.to.equal(priceId)
                  expect(product.on_stock).to.equal(replacementVariant.quantity)
                  expect(product.img_url).to.deep.equal([imageUrl])
                })).then(updatedProduct => {
                  const previousPriceId = priceId
                  priceId = updatedProduct.price_id
                  stripePriceIds.push(priceId)
                  return recordResource("stripe_price", priceId, accounts.owner.id, {
                    provider: "stripe",
                    mode: "test",
                    productId,
                    scenarioId: "product-edit",
                  }).then(() => cy.task<{ verificationReference: string }>("verifyStripeTestProduct", {
                    productId,
                    priceId,
                    ownerId: accounts.owner.id,
                    amountCents: Math.round((selectedPrice + 2.25) * 100),
                    imageUrl,
                  })).then(stripePriceReadback => {
                    expect(stripePriceReadback.verificationReference).to.include("livemode-false:active")
                    return cy.task<string>("verifyStripePriceInactive", previousPriceId).then(inactivePriceReference => {
                      return recordVerifiedRoute({
                        method: "POST",
                        route: "/api/products/update",
                        scenarioId: "product-edit",
                        resourceId: productId,
                        providerId: priceId,
                        verificationReference: `${stripePriceReadback.verificationReference};${inactivePriceReference}`,
                        details: { updatedFields: ["price"], previousPriceId },
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })

    cy.task<TProductRow | null>("readRunProduct", productId).should("not.equal", null).then(product => {
      expect(product?.id).to.equal(productId)
    })
    cy.task<{ result: number; verified: boolean }>("settlePaidOperation", {
      operationKey: runKey("tinify"),
      status: "completed",
      providerResourceId: storageDestination.reference.path,
      details: { outputBytesWereReadBack: true },
    }).then(() => settledOperationKeys.add(runKey("tinify")))
    cy.task("settlePaidOperation", {
      operationKey: runKey("category-suggestion"),
      status: "completed",
      providerResourceId: categoryId,
      details: { categoryIdWasPersisted: true },
    }).then(() => settledOperationKeys.add(runKey("category-suggestion")))
    cy.task("settlePaidOperation", {
      operationKey: runKey("translation-worker"),
      status: "completed",
      providerResourceId: workerEvidence.workerRequestId ?? workerEvidence.requestId,
      details: { productId, fourLocalesWereReadBack: true, pusherEventWasReceived: true },
    }).then(() => settledOperationKeys.add(runKey("translation-worker")))
    cy.task("settlePaidOperation", {
      operationKey: runKey("field-translations"),
      status: "completed",
      providerResourceId: productId,
      details: { providerCallCount: 2, titleAndDescriptionWereReadBack: true },
    }).then(() => settledOperationKeys.add(runKey("field-translations")))

    cy.visit("/?modal=AdminPanel")
    cy.get('[data-cy="admin-action-delete"]').click()
    cy.get(`[data-cy="delete-product"][data-product-id="${productId}"]`).should("be.visible")
      .find('[data-cy="request-product-delete"]').click()
    cy.get('[data-cy="cancel-product-delete"]').should("be.enabled").click()
    cy.get(`[data-cy="delete-product"][data-product-id="${productId}"]`).should("be.visible")
    cy.task<TProductRow | null>("readRunProduct", productId).should("not.equal", null)
    cy.get(`[data-cy="delete-product"][data-product-id="${productId}"]`)
      .find('[data-cy="request-product-delete"]').click()
    cy.get('[data-cy="confirm-product-delete"]').should("be.enabled").click()
    cy.wait("@deleteProduct", { timeout: 60000 }).then(interception => {
      deleteInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.body).to.deep.equal({ id: productId })
      scenarioProductDeleted = true
    })
    cy.get("@deleteProduct.all").should("have.length", 1)
    cy.task<TProductRow | null>("readRunProduct", productId).should("equal", null)
    cy.task("verifyStripeResourcesInactive", { productId, priceId }).then(verificationReference => {
      expect(verificationReference).to.be.a("string")
      stripePriceIds.filter(registeredPriceId => registeredPriceId !== priceId).forEach(registeredPriceId => {
        cy.task("verifyStripeResourcesInactive", { productId, priceId: registeredPriceId })
          .its("length").should("be.greaterThan", 0)
      })
      cy.task("verifyStorageObjectAbsent", storageDestination.reference).then(storageReference => {
        expect(storageReference).to.be.a("string")
        cy.get("body").then(() => {
          return recordVerifiedRoute({
            method: "POST",
            route: "/api/products/delete",
            scenarioId: "product-delete",
            requestId: String(deleteInterception.response?.headers["x-vercel-id"]
              ?? deleteInterception.response?.headers["x-request-id"] ?? deleteInterception.id),
            providerId: productId,
            verificationReference: `${String(verificationReference)};${String(storageReference)};supabase:23_products:${productId}:absent`,
            details: { stripePriceId: priceId },
          })
        })
      })
    })
    cy.then(() => {
      if (titleTranslationStarted && unsavedDialogVisibleDuringTranslation && !unsavedDialogBlockedDuringTranslation) return
      throw new Error("Browser Back did not keep the unsaved description draft usable during the real title translation request")
    })
  })
})
