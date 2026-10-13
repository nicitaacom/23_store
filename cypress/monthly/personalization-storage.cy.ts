import type { Interception } from "cypress/types/net-stubbing"

import { expectRealRejection } from "../support/diagnostics"
import { recordResource, recordVerifiedRoute } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = { id: string; priceId: string; ownerId: string; price: number; onStock: number }
type TStorageReference = { provider: "r2" | "supabase"; bucket: "23_product-personalization-images"; path: string }
type TUploadDestination = {
  uploadId: string
  signedUrl: string
  method: "PUT"
  headers: Record<string, string>
  formField: string | null
  reference: TStorageReference
}
type TRouteResult<TBody> = { statusCode: number; body: TBody; interception: Interception }

const imagePath = "cypress/files/Sour Cream 30% Savya LITOVSKAYA.png"
const scenarioId = "personalization-storage"
let routeSequence = 0

function browserRequest<TBody>(method: string, url: string, body?: Record<string, unknown>): Cypress.Chainable<TRouteResult<TBody>> {
  const alias = `plan25PersonalizationStorage${++routeSequence}`
  cy.intercept(method, url).as(alias)

  return cy.window().then(browserWindow => browserWindow.fetch(url, {
    method,
    credentials: "include",
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
  }).then(async response => ({ statusCode: response.status, body: await response.json() as TBody })))
    .then(result => cy.wait<Interception>(`@${alias}`).then(interception => ({ ...result, interception })))
}

describe("monthly real-service personalization storage", function () {
  this.timeout(300000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null
  let storageReference: TStorageReference | null = null
  let storageObjectJournaled = false
  let storageObjectCleaned = false
  let designId: string | null = null
  let designJournaled = false
  let designCleaned = false
  let productDeleted = false

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    storageReference = null
    storageObjectJournaled = false
    storageObjectCleaned = false
    designId = null
    designJournaled = false
    designCleaned = false
    productDeleted = false
    cy.signIn(accounts.owner)
    cy.visit("/en")
  })

  afterEach(() => {
    if (!product) return
    const fixture = product
    const removeDesign = () => {
      if (!designJournaled || !designId || designCleaned) return cy.wrap(null, { log: false })
      return cy.task<string>("cleanupRunPersonalizedDesign", {
        ownerId: accounts.owner.id,
        userId: accounts.owner.id,
        productId: fixture.id,
        designId,
      }).then(verificationReference => {
        designCleaned = true
        return cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId,
          resourceId: designId,
          verificationReference,
          at: new Date().toISOString(),
        }, { log: false })
      })
    }
    const removeImage = () => {
      if (!storageObjectJournaled || !storageReference || storageObjectCleaned) return cy.wrap(null, { log: false })
      return browserRequest<{ success?: boolean; error?: string }>("POST", "/api/storage/delete", { reference: storageReference })
        .then(result => {
          expect(result.statusCode, "remove only the exact run-owned image").to.equal(200)
          return cy.task<string>("verifyStorageObjectAbsent", storageReference)
        }).then(verificationReference => cy.task("markRunStorageObjectCleaned", {
          ownerId: accounts.owner.id,
          reference: storageReference,
        }).then(() => {
          storageObjectCleaned = true
          return cy.task("appendE2EEvidence", {
            kind: "scenario-cleanup",
            status: "passed",
            scenarioId,
            resourceId: storageReference?.path,
            verificationReference,
            at: new Date().toISOString(),
          }, { log: false })
        }))
    }

    cy.signIn(accounts.owner)
    removeDesign().then(() => removeImage()).then(() => {
      if (productDeleted) return null
      return cy.request({ method: "POST", url: "/api/products/delete", body: { id: fixture.id }, failOnStatusCode: false })
        .then(response => {
          expect(response.status, "delete the run-owned Stripe TEST product through the app").to.equal(200)
          productDeleted = true
          return cy.task("readRunProduct", fixture.id).should("equal", null)
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
    })
  })

  it("uploads real image bytes, checks ownership and readback, records a design, and cleans exact ids", () => {
    const suffix = String(Cypress.env("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-16)
    let uploadId = ""
    let prepareInterception: Interception | null = null
    let uploadDestination: TUploadDestination | null = null
    let expectedBytes = { size: 0, sha256: "" }
    let publicUrl = ""
    let designCreateInterception: Interception

    cy.task<TProductFixture>("createProductFixture", {
      ownerId: accounts.owner.id,
      key: `personalize-${suffix}`,
      title: `E2E personalization storage ${suffix}`,
      description: "Run-owned product for an exact image upload and personalization record.",
      price: 11.25,
      onStock: 3,
    }).then(createdProduct => {
      product = createdProduct
      return cy.readFile(imagePath, "base64")
    }).then(base64 => cy.task<{ size: number; sha256: string }>("getProductImageFixtureMetadata").then(metadata => ({ base64, metadata })))
      .then(({ base64, metadata }) => {
        expectedBytes = metadata
        return browserRequest<TUploadDestination>("POST", "/api/storage/prepare", {
          bucket: "23_product-personalization-images",
          entityId: product?.id,
          filename: `plan25-${suffix}.png`,
          contentType: "image/png",
          size: metadata.size,
          upsert: false,
        }).then(result => {
          expect(result.statusCode, "real signed upload authorization").to.equal(200)
          expect(result.body.uploadId).to.be.a("string").and.not.equal("")
          expect(result.body.method).to.equal("PUT")
          expect(result.body.formField).to.equal(null)
          expect(result.body.reference).to.include({ bucket: "23_product-personalization-images" })
          uploadId = result.body.uploadId
          prepareInterception = result.interception
          uploadDestination = result.body
          storageReference = result.body.reference
          return recordResource("storage_object", result.body.reference.path, accounts.owner.id, {
            provider: result.body.reference.provider,
            bucket: result.body.reference.bucket,
            path: result.body.reference.path,
            productId: product?.id,
            scenarioId,
          }).then(() => {
            storageObjectJournaled = true
            return cy.wrap(null, { log: false })
          })
        }).then(() => cy.window().then(async browserWindow => {
          if (!uploadDestination) throw new Error("Storage upload destination was not retained in this run")
          const binary = browserWindow.atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let byteIndex = 0; byteIndex < binary.length; byteIndex += 1) bytes[byteIndex] = binary.charCodeAt(byteIndex)
          const uploadResponse = await browserWindow.fetch(uploadDestination.signedUrl, {
            method: uploadDestination.method,
            headers: uploadDestination.headers,
            body: bytes,
          }).catch(() => {
            throw new Error("Browser could not transfer the image to the signed storage destination")
          })
          return { statusCode: uploadResponse.status, uploadId: uploadDestination.uploadId }
        }))
      })
      .then(result => {
        expect(result.statusCode, "provider accepted the exact fixture bytes").to.be.within(200, 299)
        expect(result.uploadId).to.equal(uploadId)
        return browserRequest<{ reference: TStorageReference; publicUrl: string }>("POST", "/api/storage/complete", { uploadId })
      }).then(result => {
        expect(result.statusCode, "real upload completion route").to.equal(200)
        expect(result.body.reference).to.deep.equal(storageReference)
        publicUrl = result.body.publicUrl
        expect(publicUrl).to.include(storageReference?.path)
        return cy.task<string>("verifyStorageObjectPresent", { reference: storageReference, expected: expectedBytes })
          .then(verificationReference => {
            if (!prepareInterception) throw new Error("Signed storage preparation request is missing from this run")
            return recordVerifiedRoute({
              method: "POST",
              route: "/api/storage/prepare",
              scenarioId,
              requestId: prepareInterception.id,
              providerId: uploadId,
              resourceId: storageReference?.path,
              verificationReference,
            }).then(() => recordVerifiedRoute({
              method: "POST",
              route: "/api/storage/complete",
              scenarioId,
              requestId: result.interception.id,
              providerId: uploadId,
              resourceId: storageReference?.path,
              verificationReference,
            }))
          })
      }).then(() => browserRequest<{ objects: Array<{ path: string; size: number; bucket: string; provider: string }> }>(
        "POST",
        "/api/storage/list",
        { bucket: "23_product-personalization-images", entityId: product?.id },
      )).then(result => {
        expect(result.statusCode, "real storage listing").to.equal(200)
        const listed = result.body.objects.find(object => object.path === storageReference?.path)
        expect(listed).to.include({
          path: storageReference?.path,
          size: expectedBytes.size,
          bucket: "23_product-personalization-images",
          provider: storageReference?.provider,
        })
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/storage/list",
          scenarioId,
          requestId: result.interception.id,
          resourceId: storageReference?.path,
          providerId: storageReference?.bucket,
          verificationReference: `provider-list:${storageReference?.bucket}/${storageReference?.path}:size-${expectedBytes.size}`,
        })
      }).then(() => browserRequest<{ url: string }>("POST", "/api/storage/download", { reference: storageReference }))
      .then(result => {
        expect(result.statusCode, "real signed download route").to.equal(200)
        expect(result.body.url).to.match(/^https:\/\//)
        return cy.window().then(browserWindow => browserWindow.fetch(result.body.url).then(async response => ({
          statusCode: response.status,
          byteLength: (await response.arrayBuffer()).byteLength,
        })).catch(() => {
          throw new Error("Browser could not download the run-owned file from its signed storage URL")
        })).then(download => ({ result, download }))
      }).then(({ result, download }) => {
        expect(download.statusCode, "signed object download").to.equal(200)
        expect(download.byteLength).to.equal(expectedBytes.size)
        return cy.task<string>("verifyStorageObjectPresent", { reference: storageReference, expected: expectedBytes })
          .then(verificationReference => recordVerifiedRoute({
            method: "POST",
            route: "/api/storage/download",
            scenarioId,
            requestId: result.interception.id,
            providerId: storageReference?.path,
            resourceId: storageReference?.path,
            verificationReference: `${verificationReference};browser-download:${download.byteLength}-bytes`,
          }))
      }).then(() => {
        expectRealRejection({ method: "POST", pathname: "/api/storage/download", statusCode: 403 })
        return cy.signIn(accounts.other)
      }).then(() => browserRequest<{ error?: string }>("POST", "/api/storage/download", { reference: storageReference }))
      .then(result => {
        expect(result.statusCode, "another run account receives a forbidden response").to.equal(403)
        return cy.task<string>("verifyStorageObjectPresent", { reference: storageReference, expected: expectedBytes })
          .then(verificationReference => recordVerifiedRoute({
            method: "POST",
            route: "/api/storage/download",
            scenarioId,
            requestId: result.interception.id,
            resourceId: storageReference?.path,
            providerId: storageReference?.bucket,
            verificationReference: `${verificationReference};other-run-account:403`,
            details: { expectedHttpStatus: 403 },
          }))
      }).then(() => cy.signIn(accounts.owner))
      .then(() => browserRequest<{ design_id?: string; error?: string }>("POST", "/api/personalized-designs", {
        product_id: product?.id,
        user_id: accounts.owner.id,
        source_url: publicUrl,
        source_width_px: 1254,
        source_height_px: 1254,
        print_width_mm: 100,
        print_height_mm: 100,
        placement: { scale: 1, offsetXPct: 0, offsetYPct: 0 },
        effective_dpi: 318,
      }))
      .then(result => {
        expect(result.statusCode, "real personalized-design insert").to.equal(200)
        expect(result.body.design_id).to.be.a("string").and.not.equal("")
        designId = result.body.design_id ?? null
        designCreateInterception = result.interception
        if (!product || !designId) throw new Error("Personalized design response omitted its real row id")
        const createdProduct = product
        const createdDesignId = designId
        return recordResource("personalized_design", createdDesignId, accounts.owner.id, {
          productId: createdProduct.id,
          userId: accounts.owner.id,
          sourceUrl: publicUrl,
          scenarioId,
        }).then(() => {
          designJournaled = true
          return cy.task<{ design: Record<string, unknown>; verificationReference: string } | null>("readRunPersonalizedDesign", {
            ownerId: accounts.owner.id,
            userId: accounts.owner.id,
            productId: createdProduct.id,
            designId: createdDesignId,
          })
        }).then(readback => {
          expect(readback?.design).to.include({ id: designId, product_id: product?.id, owner_id: accounts.owner.id, source_url: publicUrl })
          if (!readback || !designId) throw new Error("Personalized-design row is missing from the exact database readback")
          return recordVerifiedRoute({
            method: "POST",
            route: "/api/personalized-designs",
            scenarioId,
            requestId: designCreateInterception.id,
            resourceId: designId,
            providerId: storageReference?.path,
            verificationReference: `${readback.verificationReference};storage-bytes:${expectedBytes.size}:${expectedBytes.sha256}`,
          })
        })
      }).then(() => cy.task<string>("cleanupRunPersonalizedDesign", {
        ownerId: accounts.owner.id,
        userId: accounts.owner.id,
        productId: product?.id,
        designId,
      })).then(verificationReference => {
        designCleaned = true
        return cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId,
          resourceId: designId,
          verificationReference,
          at: new Date().toISOString(),
        }, { log: false })
      }).then(() => browserRequest<{ success?: boolean }>("POST", "/api/storage/delete", { reference: storageReference }))
      .then(result => {
        expect(result.statusCode, "real exact-object delete route").to.equal(200)
        return cy.task<string>("verifyStorageObjectAbsent", storageReference).then(verificationReference => ({ result, verificationReference }))
      }).then(({ result, verificationReference }) => cy.task("markRunStorageObjectCleaned", {
        ownerId: accounts.owner.id,
        reference: storageReference,
      }).then(() => {
        storageObjectCleaned = true
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/storage/delete",
          scenarioId,
          requestId: result.interception.id,
          resourceId: storageReference?.path,
          providerId: storageReference?.bucket,
          verificationReference,
        })
      }))
      .then(() => cy.request({ method: "POST", url: "/api/products/delete", body: { id: product?.id }, failOnStatusCode: false }))
      .then(response => {
        expect(response.status, "remove the run-owned product fixture").to.equal(200)
        productDeleted = true
        return cy.task("readRunProduct", product?.id).should("equal", null)
      }).then(() => {
        if (!product) throw new Error("Run-owned product fixture is missing after cleanup")
        return cy.task<string>("verifyStripeResourcesInactive", { productId: product.id, priceId: product.priceId })
      }).then(verificationReference => {
        if (!product) throw new Error("Run-owned product fixture is missing after cleanup")
        return cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId,
          resourceId: product.id,
          providerId: product.priceId,
          verificationReference: `${verificationReference};supabase:23_products:${product.id}:absent`,
          at: new Date().toISOString(),
        }, { log: false })
      })
  })
})
