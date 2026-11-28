import { describe, expect, it, vi } from "vitest"

import { handleAIFunctionCall } from "./aiFunctionHandlers"

const calls = vi.hoisted(() => ({ createProduct: vi.fn(), addToCart: vi.fn() }))
vi.mock("@/functions/createProductFn", () => ({ createProductFn: calls.createProduct }))
vi.mock("@/store/user/cartStore", () => ({ default: { getState: () => ({ increaseProductQuantity: calls.addToCart }) } }))
vi.mock("@/sdk/AISDK/AISDK", () => ({ aiSDK: {} }))
vi.mock("@/functions/uploadImageFn", () => ({ uploadImageFn: vi.fn() }))
vi.mock("@/functions/uploadImageFolder", () => ({ getAiImageFolder: vi.fn() }))

describe("sales assistant purchase requests", () => {
  it("does not create a product or add model-generated details to the cart", async () => {
    const requestSpy = vi.spyOn(globalThis, "fetch")
    const response = await handleAIFunctionCall("addProductToCart", {
      product: { title: "Imagined product", subtitle: "Unverified", price: 1 },
      quantity: 5,
      t: () => "Choose an item from the catalog.",
    })

    expect(response).toEqual({ success: false, message: "Choose an item from the catalog." })
    expect(calls.createProduct).not.toHaveBeenCalled()
    expect(calls.addToCart).not.toHaveBeenCalled()
    expect(requestSpy).not.toHaveBeenCalled()
    requestSpy.mockRestore()
  })
})
