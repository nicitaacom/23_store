import { beforeEach, describe, expect, it, vi } from "vitest"

import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import useCartStore from "./cartStore"

const trackingState = vi.hoisted(() => ({
  events: [] as Record<string, unknown>[],
}))

vi.mock("@/utils/trackBuyingFlowEvent", () => ({
  trackBuyingFlowEvent: (event: Record<string, unknown>) => trackingState.events.push(event),
}))

vi.mock("./useUser", () => ({
  default: { getState: () => ({ user: null }) },
}))

beforeEach(() => {
  useCartStore.setState({ products: {}, productsData: [] })
  trackingState.events.length = 0
})

describe("cartStore buying-flow event", () => {
  it("sends add_to_cart for a new cart key", () => {
    useCartStore.getState().increaseProductQuantity("product-1")

    expect(trackingState.events).toEqual([{ event: "add_to_cart", productId: "product-1" }])
  })

  it("stays silent for a quantity increase", () => {
    useCartStore.setState({ products: { "product-1": { id: "product-1", quantity: 1, variantId: null, designId: null } } })

    useCartStore.getState().increaseProductQuantity("product-1")

    expect(trackingState.events).toHaveLength(0)
  })

  it("stays silent for a sold-out line", () => {
    useCartStore.setState({
      productsData: [
        {
          cartKey: "product-1",
          selectedVariant: { quantity: 0 },
        } as unknown as TProductAfterDB,
      ],
    })

    useCartStore.getState().increaseProductQuantity("product-1")

    expect(trackingState.events).toHaveLength(0)
  })
})
