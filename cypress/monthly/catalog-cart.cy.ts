import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedRoute, recordVerifiedServiceOperation } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TProductFixture = {
  id: string
  priceId: string
  ownerId: string
  price: number
  onStock: number
  variants: Array<{ id: string; label: string; price: number; quantity: number; group_id?: string; options?: Record<string, string> }> | null
  translations: Record<string, { title: string; description: string }>
}

const selectedVariant = (product: TProductFixture) => product.variants?.find(variant => variant.quantity > 0) ?? null
const productCart = (product: TProductFixture, quantity: number, variant = selectedVariant(product)) => {
  const variantId = variant?.id ?? null
  return {
    [variantId ? `${product.id}::${variantId}` : product.id]: { id: product.id, quantity, variantId, designId: null },
  }
}

describe("monthly real-service catalog and cart", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let product: TProductFixture | null = null

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    product = null
    cy.intercept({ method: "GET", url: "**/rest/v1/23_users_cart*" }).as("loadRunCart")
    cy.signIn(accounts.owner)
    cy.task("waitForRunCart", { ownerId: accounts.owner.id, expected: {} }).then(() => {
      const suffix = String(Cypress.expose("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
      return cy.task<TProductFixture>("createProductFixture", {
        ownerId: accounts.owner.id,
        key: `cart-${suffix}`,
        title: `E2E cart product ${suffix}`,
        description: "Disposable product for the real catalog and cart journey.",
        price: 13.4,
        onStock: 8,
        variants: [
          {
            id: `cart-stocked-${suffix}`,
            label: "E2E stocked size",
            options: { Size: "Stocked" },
            group_id: `cart-size-${suffix}`,
            price: 14.3,
            quantity: 2,
          },
          {
            id: `cart-sold-out-${suffix}`,
            label: "E2E sold-out size",
            options: { Size: "Sold out" },
            group_id: `cart-size-${suffix}`,
            price: 15.8,
            quantity: 0,
          },
        ],
      }).then(createdProduct => {
        product = createdProduct
      })
    })
  })

  afterEach(() => {
    if (!product) return
    const fixture = product
    cy.signIn(accounts.owner)
    cy.task("cleanupRunCart", accounts.owner.id).then(() => cy.request({
      method: "POST",
      url: "/api/products/delete",
      body: { id: fixture.id },
      failOnStatusCode: false,
    })).then(response => {
      expect(response.status, "exact run-owned product cleanup").to.equal(200)
      return cy.task("waitForRunCart", { ownerId: accounts.owner.id, expected: {} })
    }).then(() => cy.task("readRunProduct", fixture.id)).should("equal", null)
      .then(() => cy.task<string>("verifyStripeResourcesInactive", {
        productId: fixture.id,
        priceId: fixture.priceId,
      }))
      .then(verificationReference => recordVerifiedRoute({
        method: "POST",
        route: "/api/products/delete",
        scenarioId: "product-delete",
        resourceId: fixture.id,
        providerId: fixture.priceId,
        verificationReference: `${verificationReference};supabase:23_products:${fixture.id}:absent;supabase:23_users_cart:${accounts.owner.id}:empty`,
        details: { cleanup: true, cartOwnerId: accounts.owner.id },
      }))
  })

  it("persists quantity changes, calculates the real total, and honors clear-cart cancel and confirm", () => {
    if (!product) throw new Error("Run-owned cart product fixture was not created")
    const fixture = product
    const variant = selectedVariant(fixture)
    const soldOutVariant = fixture.variants?.find(candidate => candidate.quantity === 0)
    if (!variant) throw new Error("Cart fixture needs one in-stock product variant")
    if (!soldOutVariant) throw new Error("Cart fixture needs one sold-out product variant")
    let clearRequested = false
    cy.intercept({ method: "PATCH", url: "**/rest/v1/23_users_cart*" }, request => {
      const cartProducts = request.body?.cart_products && typeof request.body.cart_products === "object"
        ? Object.values(request.body.cart_products) as Array<{ quantity?: number }>
        : []
      const quantity = cartProducts.reduce((total, entry) => total + (Number(entry.quantity) || 0), 0)
      request.alias = quantity === 0
        ? clearRequested ? "persistRunCartEmpty" : "persistRunCartInitialization"
        : `persistRunCartQuantity${quantity}`
    })
    const verifyCartSave = (quantity: number) => cy.wait<Interception>(`@persistRunCartQuantity${quantity}`, { timeout: 20000 }).then(interception => {
      expect(interception.response?.statusCode, "authenticated cart update response").to.be.within(200, 299)
      return cy.task<{ cart: Record<string, unknown>; verificationReference: string }>("waitForRunCart", {
        ownerId: accounts.owner.id,
        expected: productCart(fixture, quantity),
      }).then(readback => {
        expect(readback.cart).to.deep.equal(productCart(fixture, quantity))
        return recordVerifiedServiceOperation({
          sourcePath: "app/storages/DBStorage.ts",
          functionName: "saveProducts",
          callName: "supabase-update",
          requestId: String(interception.id),
          scenarioId: "catalog-cart",
          resourceId: fixture.id,
          verificationReference: readback.verificationReference,
          details: { accountId: accounts.owner.id, quantity },
        })
      })
    })

    cy.visit(`/en/products/${fixture.id}`)
    cy.wait<Interception>("@loadRunCart", { timeout: 20000 }).then(interception => {
      expect(interception.response?.statusCode, "authenticated cart read response").to.be.within(200, 299)
      return cy.task<{ cart: Record<string, unknown>; verificationReference: string }>("waitForRunCart", {
        ownerId: accounts.owner.id,
        expected: {},
      }).then(readback => {
        expect(readback.cart).to.deep.equal({})
        return recordVerifiedServiceOperation({
          sourcePath: "app/storages/DBStorage.ts",
          functionName: "getProducts",
          callName: "supabase-select",
          requestId: String(interception.id),
          scenarioId: "catalog-cart",
          resourceId: accounts.owner.id,
          verificationReference: readback.verificationReference,
          details: { accountId: accounts.owner.id, cartIsEmpty: true },
        })
      })
    })
    cy.get("h1").should("contain.text", fixture.translations.en.title)
    cy.get(`[data-cy="add-to-cart-${fixture.id}-${variant.id}"]`).should("be.enabled").click()
    cy.get('[data-cy="cart-quantity"]').should("have.text", "1")
    verifyCartSave(1)

    cy.get(`[data-cy="product-quantity-increase-${fixture.id}-${variant.id}"]`).should("be.enabled").click()
    cy.get('[data-cy="cart-quantity"]').should("have.text", "2")
    verifyCartSave(2)

    cy.reload()
    cy.get(`[data-cy="product-quantity-decrease-${fixture.id}-${variant.id}"]`).should("be.visible").click()
    cy.get('[data-cy="cart-quantity"]').should("have.text", "1")
    verifyCartSave(1)

    cy.then(() => { clearRequested = true })
    cy.get(`[data-cy="product-quantity-clear-${fixture.id}-${variant.id}"]`).should("be.enabled").click()
    cy.get('[data-cy="cart-quantity"]').should("not.exist")
    cy.wait<Interception>("@persistRunCartEmpty", { timeout: 20000 }).then(interception => {
      expect(interception.response?.statusCode, "remove-line cart update response").to.be.within(200, 299)
      return cy.task<{ cart: Record<string, unknown>; verificationReference: string }>("waitForRunCart", {
        ownerId: accounts.owner.id,
        expected: {},
      }).then(readback => {
        expect(readback.cart).to.deep.equal({})
        return recordVerifiedServiceOperation({
          sourcePath: "app/storages/DBStorage.ts",
          functionName: "saveProducts",
          callName: "supabase-update",
          requestId: String(interception.id),
          scenarioId: "catalog-cart",
          resourceId: fixture.id,
          verificationReference: readback.verificationReference,
          details: { accountId: accounts.owner.id, lineRemoved: true },
        })
      })
    })
    cy.then(() => { clearRequested = false })
    cy.get(`[data-cy="add-to-cart-${fixture.id}-${variant.id}"]`).should("be.enabled").click()
    verifyCartSave(1)

    cy.get('[data-cy="open-cart"]').click()
    cy.get('[data-cy="cart-subtotal"]').should("have.text", new Intl.NumberFormat("en-US", {
      currency: "USD",
      style: "currency",
    }).format(variant.price))
    cy.get('[data-cy="cart-total"]').should("have.text", new Intl.NumberFormat("en-US", {
      currency: "USD",
      style: "currency",
    }).format(variant.price))

    cy.get('[data-cy="clear-cart"]').click()
    cy.get('[data-cy="cancel-clear-cart"]').should("be.enabled").click()
    cy.get('[data-cy="cart-total"]').should("be.visible")
    cy.task<{ cart: Record<string, unknown> }>("waitForRunCart", {
      ownerId: accounts.owner.id,
      expected: productCart(fixture, 1),
    }).its("cart").should("deep.equal", productCart(fixture, 1))

    cy.then(() => { clearRequested = true })
    cy.get('[data-cy="clear-cart"]').click()
    cy.get('[data-cy="confirm-clear-cart"]').should("be.enabled").click()
    cy.get('[data-cy="empty-cart"]').should("be.visible")
    cy.wait<Interception>("@persistRunCartEmpty", { timeout: 20000 }).then(interception => {
      expect(interception.response?.statusCode, "confirmed cart clear response").to.be.within(200, 299)
      return cy.task<{ cart: Record<string, unknown>; verificationReference: string }>("waitForRunCart", {
      ownerId: accounts.owner.id,
      expected: {},
      }).then(readback => ({ interception, readback }))
    }).then(({ interception, readback }) => {
      expect(readback.cart).to.deep.equal({})
      return recordVerifiedServiceOperation({
        sourcePath: "app/storages/DBStorage.ts",
        functionName: "saveProducts",
        callName: "supabase-update",
        requestId: String(interception.id),
        scenarioId: "catalog-cart",
        resourceId: fixture.id,
        verificationReference: readback.verificationReference,
        details: { accountId: accounts.owner.id, cartIsEmpty: true },
      })
    })

    cy.then(() => { clearRequested = false })
    cy.visit(`/en/products/${fixture.id}`)
    cy.get(`[data-cy="add-to-cart-${fixture.id}-${variant.id}"]`).should("be.enabled").click()
    verifyCartSave(1)
    cy.get(`[data-cy="product-quantity-increase-${fixture.id}-${variant.id}"]`).click()
    verifyCartSave(2)

    let stockLimitViolation = false
    cy.get(`[data-cy="product-quantity-increase-${fixture.id}-${variant.id}"]`).then($button => {
      if ($button.is(":disabled")) return
      stockLimitViolation = true
      return cy.wrap($button).click().then(() => cy.wait<Interception>("@persistRunCartQuantity3", { timeout: 20000 }))
        .then(interception => cy.task<{ cart: Record<string, unknown>; verificationReference: string }>("waitForRunCart", {
          ownerId: accounts.owner.id,
          expected: productCart(fixture, 3),
        }).then(readback => {
          expect(readback.cart).to.deep.equal(productCart(fixture, 3))
          return recordVerifiedServiceOperation({
            sourcePath: "app/storages/DBStorage.ts",
            functionName: "saveProducts",
            callName: "supabase-update",
            requestId: String(interception.id),
            scenarioId: "catalog-cart",
            resourceId: fixture.id,
            verificationReference: readback.verificationReference,
            details: { expectedStock: variant.quantity, persistedQuantity: 3 },
          }).then(() => cy.task("appendE2EEvidence", {
            kind: "application-defect",
            status: "failed",
            scenarioId: "catalog-cart",
            resourceId: fixture.id,
            message: `The quantity control remained enabled beyond variant stock ${variant.quantity}; Supabase accepted quantity 3.`,
            verificationReference: readback.verificationReference,
            at: new Date().toISOString(),
          }, { log: false }))
        }))
    })

    let soldOutVariantViolation = false
    cy.get(`[data-cy="product-variant-option-Size-Sold out"]`).then($option => {
      if ($option.is(":disabled")) return
      soldOutVariantViolation = true
      return cy.wrap($option).click()
        .then(() => cy.get(`[data-cy="add-to-cart-${fixture.id}-${soldOutVariant.id}"]`).should("be.enabled").click())
        .then(() => cy.wait<Interception>(`@persistRunCartQuantity${stockLimitViolation ? 4 : 3}`, { timeout: 20000 }))
        .then(interception => {
          const expectedCart = {
            ...productCart(fixture, stockLimitViolation ? 3 : 2),
            ...productCart(fixture, 1, soldOutVariant),
          }
          return cy.task<{ cart: Record<string, unknown>; verificationReference: string }>("waitForRunCart", {
            ownerId: accounts.owner.id,
            expected: expectedCart,
          }).then(readback => {
            expect(readback.cart).to.deep.equal(expectedCart)
            return recordVerifiedServiceOperation({
              sourcePath: "app/storages/DBStorage.ts",
              functionName: "saveProducts",
              callName: "supabase-update",
              requestId: String(interception.id),
              scenarioId: "catalog-cart",
              resourceId: fixture.id,
              verificationReference: readback.verificationReference,
              details: { soldOutVariantId: soldOutVariant.id, persistedQuantity: 1 },
            }).then(() => cy.task("appendE2EEvidence", {
              kind: "application-defect",
              status: "failed",
              scenarioId: "catalog-cart",
              resourceId: fixture.id,
              message: `The sold-out variant ${soldOutVariant.id} remained selectable and was added to the run-owned cart.`,
              verificationReference: readback.verificationReference,
              at: new Date().toISOString(),
            }, { log: false }))
          })
        })
    })
    cy.then(() => {
      if (stockLimitViolation || soldOutVariantViolation) {
        throw new Error(`Cart stock behavior failed: ${[
          stockLimitViolation ? "quantity exceeded available variant stock" : "",
          soldOutVariantViolation ? "sold-out variant could be added" : "",
        ].filter(Boolean).join("; ")}`)
      }
    })
  })
})
