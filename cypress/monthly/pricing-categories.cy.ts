import type { Interception } from "cypress/types/net-stubbing"

import { recordResource, recordVerifiedRoute } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TCategory = { id: string; name: string; parent_id: string | null }
type TRouteResult<TBody> = { statusCode: number; body: TBody; interception: Interception }

let routeSequence = 0

function browserRequest<TBody>(method: string, url: string, body?: Record<string, unknown>): Cypress.Chainable<TRouteResult<TBody>> {
  const alias = `plan25CategoryRoute${++routeSequence}`
  cy.intercept(method, url).as(alias)
  return cy.window().then(browserWindow => browserWindow.fetch(url, {
    method,
    credentials: "include",
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
  }).then(async response => ({ statusCode: response.status, body: await response.json() as TBody })))
    .then(result => cy.wait<Interception>(`@${alias}`).then(interception => ({ ...result, interception })))
}

describe("monthly real-service categories and account-scoped views", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let category: TCategory | null = null
  let categoryJournaled = false
  let categoryViewJournaled = false

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    category = null
    categoryJournaled = false
    categoryViewJournaled = false
  })

  afterEach(() => {
    const createdCategory = category
    if (categoryViewJournaled && createdCategory) {
      cy.task<string>("cleanupRunCategoryView", { ownerId: accounts.owner.id, categoryId: createdCategory.id })
        .then(verificationReference => cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId: "pricing-categories",
          resourceId: `${accounts.owner.id}:${createdCategory.id}`,
          verificationReference,
          at: new Date().toISOString(),
        }, { log: false }))
    }
    if (categoryJournaled && createdCategory) {
      cy.signIn(accounts.admin)
      cy.visit("/en")
      browserRequest<{ ok: boolean }>("DELETE", "/api/categories/delete", { id: createdCategory.id })
        .then(result => {
          expect(result.statusCode, "delete only the exact run-owned category").to.equal(200)
          expect(result.body).to.deep.equal({ ok: true })
          return cy.task<string>("markRunCategoryCleaned", { ownerId: accounts.admin.id, categoryId: createdCategory.id })
            .then(verificationReference => recordVerifiedRoute({
              method: "DELETE",
              route: "/api/categories/delete",
              scenarioId: "pricing-categories",
              requestId: result.interception.id,
              resourceId: createdCategory.id,
              verificationReference,
              details: { cleanup: true },
            }))
        })
    }
  })

  it("creates, lists, counts, renames and deletes one run-owned category and syncs one run user's view counter", () => {
    const suffix = String(Cypress.env("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
    const originalName = `E2E category ${suffix}`
    const updatedName = `${originalName} updated`

    cy.signIn(accounts.admin)
    cy.visit("/en")
    browserRequest<{ category: TCategory }>("POST", "/api/categories/insert", { name: originalName })
      .then(result => {
        expect(result.statusCode, "real category creation response").to.equal(201)
        expect(result.body.category).to.include({ name: originalName, parent_id: null })
        const createdCategory = result.body.category
        category = createdCategory
        return recordResource("category_row", createdCategory.id, accounts.admin.id, { scenarioId: "pricing-categories", name: originalName })
          .then(() => {
            categoryJournaled = true
            return cy.task<{ category: TCategory; verificationReference: string } | null>("readRunCategory", {
              ownerId: accounts.admin.id,
              categoryId: createdCategory.id,
            })
          })
          .then(readback => {
            expect(readback?.category).to.deep.equal(category)
            if (!readback || !category) throw new Error("Created category is missing from the exact Supabase readback")
            return recordVerifiedRoute({
              method: "POST",
              route: "/api/categories/insert",
              scenarioId: "pricing-categories",
              requestId: result.interception.id,
              resourceId: category.id,
              verificationReference: readback.verificationReference,
            })
          })
      })
      .then(() => browserRequest<{ categories: TCategory[] }>("GET", "/api/categories/select"))
      .then(result => {
        expect(result.statusCode).to.equal(200)
        expect(result.body.categories).to.deep.include(category)
        if (!category) throw new Error("Run-owned category was not retained after creation")
        return recordVerifiedRoute({
          method: "GET",
          route: "/api/categories/select",
          scenarioId: "pricing-categories",
          requestId: result.interception.id,
          resourceId: category.id,
          verificationReference: `api:categories:select:contains-run-owned:${category.id}`,
        })
      })
      .then(() => {
        if (!category) throw new Error("Run-owned category is missing before count")
        return browserRequest<{ count: number }>("GET", `/api/categories/count?id=${category.id}`)
      })
      .then(result => {
        expect(result.statusCode).to.equal(200)
        expect(result.body.count, "new category begins with no products").to.equal(0)
        if (!category) throw new Error("Run-owned category is missing after count")
        return recordVerifiedRoute({
          method: "GET",
          route: "/api/categories/count",
          scenarioId: "pricing-categories",
          requestId: result.interception.id,
          resourceId: category.id,
          verificationReference: `api:categories:count:${category.id}:0`,
        })
      })
      .then(() => {
        if (!category) throw new Error("Run-owned category is missing before update")
        return browserRequest<{ category: TCategory }>("PATCH", "/api/categories/update", { id: category.id, name: updatedName })
      })
      .then(result => {
        expect(result.statusCode).to.equal(200)
        expect(result.body.category).to.include({ id: category?.id, name: updatedName, parent_id: null })
        if (!category) throw new Error("Run-owned category disappeared during update")
        const updatedCategory = result.body.category
        category = updatedCategory
        return cy.task<{ category: TCategory; verificationReference: string } | null>("readRunCategory", {
          ownerId: accounts.admin.id,
          categoryId: updatedCategory.id,
        }).then(readback => {
          expect(readback?.category).to.deep.equal(updatedCategory)
          if (!readback) throw new Error("Category update is absent from Supabase")
          return recordVerifiedRoute({
            method: "PATCH",
            route: "/api/categories/update",
            scenarioId: "pricing-categories",
            requestId: result.interception.id,
            resourceId: updatedCategory.id,
            verificationReference: readback.verificationReference,
          })
        })
      })
      .then(() => cy.signIn(accounts.owner))
      .then(() => cy.visit("/en"))
      .then(() => {
        if (!category) throw new Error("Run-owned category is missing before account view test")
        const viewedCategory = category
        return cy.task<{ view: { view_count: number } | null }>("readRunCategoryView", {
          ownerId: accounts.owner.id,
          categoryId: viewedCategory.id,
        }).then(readback => {
          expect(readback.view, "new run-owned account starts without a view row").to.equal(null)
          return recordResource("category_view", `${accounts.owner.id}:${viewedCategory.id}`, accounts.owner.id, {
            scenarioId: "pricing-categories",
            categoryId: viewedCategory.id,
          }).then(() => {
            categoryViewJournaled = true
            return browserRequest<{ ok: boolean }>("POST", "/api/category-views/increment", {
              category_id: viewedCategory.id,
              delta: 2,
            })
          })
        })
      })
      .then(result => {
        expect(result.statusCode).to.equal(200)
        expect(result.body).to.deep.equal({ ok: true })
        if (!category) throw new Error("Run-owned category is missing after view increment")
        const viewedCategory = category
        return cy.task<{ view: { view_count: number } | null; verificationReference: string }>("readRunCategoryView", {
          ownerId: accounts.owner.id,
          categoryId: viewedCategory.id,
        }).then(readback => {
          expect(readback.view?.view_count).to.equal(2)
          return recordVerifiedRoute({
            method: "POST",
            route: "/api/category-views/increment",
            scenarioId: "pricing-categories",
            requestId: result.interception.id,
            resourceId: viewedCategory.id,
            verificationReference: readback.verificationReference,
          })
        })
      })
      .then(() => browserRequest<{ views: Array<{ category_id: string; view_count: number }> }>("GET", "/api/category-views/select"))
      .then(result => {
        const view = result.body.views.find(candidate => candidate.category_id === category?.id)
        expect(result.statusCode).to.equal(200)
        expect(view?.view_count).to.equal(2)
        if (!category) throw new Error("Run-owned category is missing from view selection")
        return recordVerifiedRoute({
          method: "GET",
          route: "/api/category-views/select",
          scenarioId: "pricing-categories",
          requestId: result.interception.id,
          resourceId: category.id,
          verificationReference: `api:category-views:select:${accounts.owner.id}:${category.id}:2`,
        })
      })
      .then(() => {
        if (!category) throw new Error("Run-owned category is missing before view sync")
        return browserRequest<{ ok: boolean }>("POST", "/api/category-views/sync", {
          views: { [category.id]: 1 },
        })
      })
      .then(result => {
        expect(result.statusCode).to.equal(200)
        return cy.task<{ view: { view_count: number } | null; verificationReference: string }>("readRunCategoryView", {
          ownerId: accounts.owner.id,
          categoryId: category?.id ?? "",
        }).then(readback => {
          expect(readback.view?.view_count, "stale browser sync preserves the stored counter").to.equal(2)
          if (!category) throw new Error("Run-owned category is missing after stale sync")
          return recordVerifiedRoute({
            method: "POST",
            route: "/api/category-views/sync",
            scenarioId: "pricing-categories",
            requestId: result.interception.id,
            resourceId: category.id,
            verificationReference: `${readback.verificationReference}:stale-value-preserved-at-2`,
          })
        })
      })
      .then(() => {
        if (!category) throw new Error("Run-owned category is missing before view sync update")
        return browserRequest<{ ok: boolean }>("POST", "/api/category-views/sync", {
          views: { [category.id]: 4 },
        })
      })
      .then(result => {
        expect(result.statusCode).to.equal(200)
        return cy.task<{ view: { view_count: number } | null; verificationReference: string }>("readRunCategoryView", {
          ownerId: accounts.owner.id,
          categoryId: category?.id ?? "",
        }).then(readback => {
          expect(readback.view?.view_count).to.equal(4)
          if (!category) throw new Error("Run-owned category is missing after view sync update")
          return recordVerifiedRoute({
            method: "POST",
            route: "/api/category-views/sync",
            scenarioId: "pricing-categories",
            requestId: result.interception.id,
            resourceId: category.id,
            verificationReference: `${readback.verificationReference}:monotonic-value-updated-to-4`,
          })
        })
      })
  })
})
