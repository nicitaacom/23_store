import { describe, expect, it } from "vitest"

import type { TProductVariant } from "@/ts/product/TProductVariant"
import { chooseVariantForOption, cleanVariantOptions, getVariantOptionGroups } from "./variantOptions"

const variants: TProductVariant[] = [
  { id: "blue-small", label: "Blue S", options: { Color: "Blue", Size: "S" }, price: 10, quantity: 2 },
  { id: "blue-large", label: "Blue L", options: { Color: "Blue", Size: "L" }, price: 12, quantity: 0 },
  { id: "red-small", label: "Red S", options: { Color: "Red", Size: "S" }, price: 10, quantity: 3 },
]

describe("variant options", () => {
  it("keeps named choices and excludes malformed values", () => {
    expect(cleanVariantOptions({ Color: " Blue ", Size: " L ", Empty: " ", Count: 2 })).toEqual({ Color: "Blue", Size: "L" })
    expect(getVariantOptionGroups(variants)).toEqual([
      { name: "Color", values: ["Blue", "Red"] },
      { name: "Size", values: ["S", "L"] },
    ])
  })

  it("keeps other selected choices when a matching combination exists", () => {
    expect(chooseVariantForOption(variants, variants[0], "Size", "L")?.id).toBe("blue-large")
    expect(chooseVariantForOption(variants, variants[0], "Color", "Red")?.id).toBe("red-small")
  })
})
