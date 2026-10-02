import { describe, expect, it } from "vitest"

import { describeProductCreationError } from "./describeProductCreationError"

describe("describeProductCreationError", () => {
  it("reports an offline device without repeating each failed image request", () => {
    const message = describeProductCreationError(new TypeError("Image 1: Failed to fetch"), "compressing product images", false)
    expect(message).toContain("No response while compressing product images")
    expect(message).toContain("device reports no internet connection")
    expect(message).not.toContain("Failed to fetch")
  })

  it("does not claim the device is offline when the browser reports online", () => {
    const message = describeProductCreationError(new TypeError("Failed to fetch"), "publishing the product", true)
    expect(message).toContain("connection or service may be unavailable")
    expect(message).toContain("Check the product list before retrying")
  })

  it("keeps a specific server error", () => {
    expect(describeProductCreationError(new Error("Image 2: size exceeds 1 MB"), "compressing product images", true)).toBe(
      "compressing product images: Image 2: size exceeds 1 MB",
    )
  })
})
