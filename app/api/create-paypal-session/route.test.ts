import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "./route"

const stripeRequests = vi.hoisted(() => ({ createSession: vi.fn(), createCustomer: vi.fn() }))

vi.mock("@/libs/payment/getAuthenticatedPaymentUserId", () => ({ getAuthenticatedPaymentUserId: async () => null }))
vi.mock("@/libs/supabase/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ in: async () => ({
      error: null,
      data: [{ id: "prod_fixture", price: 12, translations: { fi: { title: "Desk tray" } }, img_url: [], variants: null }],
    }) }) }),
  },
}))
vi.mock("@/libs/stripe", () => ({ stripe: {
  checkout: { sessions: { create: stripeRequests.createSession } },
  customers: { create: stripeRequests.createCustomer },
} }))

describe("PayPal Checkout Session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_PRODUCTION_URL", "https://www.jokik.fi")
    stripeRequests.createSession.mockResolvedValue({ url: "https://checkout.stripe.com/pay/fixture", lastResponse: { requestId: "req_fixture" } })
  })

  afterEach(() => vi.unstubAllEnvs())

  it.each([null, "guest@example.test"])("starts hosted checkout with email %s and leaves customer creation to Stripe", async email => {
    const response = await POST(new Request("https://www.jokik.fi/api/create-paypal-session", {
      method: "POST",
      body: JSON.stringify({ products: [{ productId: "prod_fixture", quantity: 1 }], email }),
    }))

    expect(response.status).toBe(200)
    expect(stripeRequests.createCustomer).not.toHaveBeenCalled()
    expect(stripeRequests.createSession).toHaveBeenCalledWith(expect.objectContaining({
      customer_email: email ?? undefined,
      payment_method_types: ["paypal"],
      shipping_address_collection: { allowed_countries: ["FI"] },
      cancel_url: "https://www.jokik.fi/payment/?status=canceled",
    }))
  })
})
