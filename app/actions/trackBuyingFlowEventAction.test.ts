import { beforeEach, describe, expect, it, vi } from "vitest"

import { IBuyingFlowEventInput } from "@/ts/interfaces/IBuyingFlowEventInput"
import { createDeviceId, encodeDeviceId } from "@/utils/deviceId"
import { encryptDeviceId } from "@/utils/deviceIdCookie"
import { trackBuyingFlowEventAction } from "./trackBuyingFlowEventAction"

process.env.DEVICE_ID_ENCRYPTION_KEY = "c1c47798479b34c3848fe8e89362e2e27bd2a3e6093db4b07799b6831241db45"

const actionState = vi.hoisted(() => ({
  cookieValue: undefined as string | undefined,
  rateLimitAllowed: true,
  insertedRows: [] as Record<string, unknown>[],
  insertError: null as string | null,
}))

vi.mock("@upstash/redis", () => ({
  Redis: class Redis {},
}))

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class Ratelimit {
    static fixedWindow() {
      return {}
    }

    async limit() {
      return { success: actionState.rateLimitAllowed }
    }
  },
}))

vi.mock("@/utils/helpersSSR", () => ({
  getCookie: async () => actionState.cookieValue,
}))

vi.mock("@/libs/supabase/supabaseServer", () => ({
  default: async () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        actionState.insertedRows.push(row)
        return { error: actionState.insertError ? { message: actionState.insertError } : null }
      },
    }),
  }),
}))

const SESSION_ID = "123e4567-e89b-42d3-a456-426614174000"

function makeInput(overrides: Record<string, unknown> = {}): IBuyingFlowEventInput {
  return {
    event: "product_view",
    storedDeviceId: encodeDeviceId(createDeviceId()),
    sessionId: SESSION_ID,
    pageUrl: "http://localhost:3023/en/products/product-1",
    locale: "en",
    productId: "product-1",
    ...overrides,
  } as IBuyingFlowEventInput
}

beforeEach(() => {
  actionState.cookieValue = undefined
  actionState.rateLimitAllowed = true
  actionState.insertedRows.length = 0
  actionState.insertError = null
  vi.spyOn(console, "info").mockImplementation(() => {})
})

describe("trackBuyingFlowEventAction validation", () => {
  it.each([
    ["unknown event", { event: "other" }],
    ["unknown checkout kind", { event: "checkout_click", checkoutKind: "cash" }],
    ["checkout kind is required", { event: "checkout_click", checkoutKind: undefined }],
    ["search query is required", { event: "search", searchQuery: " " }],
    ["search query cap", { event: "search", searchQuery: "q".repeat(201) }],
    ["product id cap", { productId: "p".repeat(101) }],
    ["URL cap", { pageUrl: `https://example.com/${"u".repeat(2000)}` }],
    ["negative results count", { event: "search", searchQuery: "shoes", resultsCount: -1 }],
    ["results count cap", { event: "search", searchQuery: "shoes", resultsCount: 10001 }],
    ["invalid URL", { pageUrl: "not a URL" }],
  ])("skips %s", async (_, overrides) => {
    expect(await trackBuyingFlowEventAction(makeInput(overrides))).toEqual({ skipped: true })
    expect(actionState.insertedRows).toHaveLength(0)
  })
})

describe("trackBuyingFlowEventAction identity and insert", () => {
  it("inserts a valid event", async () => {
    const storedDeviceId = encodeDeviceId(createDeviceId())
    const input = makeInput({ storedDeviceId })

    expect(await trackBuyingFlowEventAction(input)).toEqual({ skipped: false })
    expect(actionState.insertedRows).toEqual([
      expect.objectContaining({
        event: "product_view",
        product_id: "product-1",
        session_id: SESSION_ID,
        url: input.pageUrl,
      }),
    ])
  })

  it("uses the cookie id before the transport id", async () => {
    const cookieDeviceId = createDeviceId()
    actionState.cookieValue = encryptDeviceId(cookieDeviceId)

    await trackBuyingFlowEventAction(makeInput({ storedDeviceId: encodeDeviceId(createDeviceId()) }))

    expect(actionState.insertedRows[0].user_id).toBe(cookieDeviceId)
  })

  it("skips when both identity values are missing", async () => {
    expect(await trackBuyingFlowEventAction(makeInput({ storedDeviceId: null }))).toEqual({ skipped: true })
    expect(actionState.insertedRows).toHaveLength(0)
  })

  it("skips when the rate limit is reached", async () => {
    actionState.rateLimitAllowed = false

    expect(await trackBuyingFlowEventAction(makeInput())).toEqual({ skipped: true })
    expect(actionState.insertedRows).toHaveLength(0)
  })
})
