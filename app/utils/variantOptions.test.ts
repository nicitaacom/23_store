import { describe, expect, it } from "vitest"

import type { TProductVariant } from "@/ts/product/TProductVariant"
import { chooseVariantForOption, cleanVariantOptions, expandVariantOptionValues, getVariantOptionGroups, labelForVariantCombination, toVariantOptionValues } from "./variantOptions"

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

  it("keeps the parent variant when two parents share the same weight values", () => {
    const grouped: TProductVariant[] = [
      { id: "blue-5", group_id: "blue", label: "Blue 5 kg", options: { Weight: "5 kg" }, price: 10, quantity: 2 },
      { id: "blue-10", group_id: "blue", label: "Blue 10 kg", options: { Weight: "10 kg" }, price: 18, quantity: 0 },
      { id: "red-5", group_id: "red", label: "Red 5 kg", options: { Weight: "5 kg" }, price: 10, quantity: 2 },
      { id: "red-10", group_id: "red", label: "Red 10 kg", options: { Weight: "10 kg" }, price: 18, quantity: 2 },
    ]

    expect(chooseVariantForOption(grouped, grouped[2], "Weight", "10 kg")?.id).toBe("red-10")
    expect(chooseVariantForOption(grouped, grouped[0], "Weight", "10 kg")?.id).toBe("blue-10")
  })

  it("adds repeated values as separate purchasable combinations", () => {
    const choices = { Size: ["36", "38"], Color: ["Blue", "Red"] }
    const combinations = expandVariantOptionValues(choices)
    expect(combinations).toEqual([
      { Size: "36", Color: "Blue" },
      { Size: "36", Color: "Red" },
      { Size: "38", Color: "Blue" },
      { Size: "38", Color: "Red" },
    ])
    expect(toVariantOptionValues(combinations[0])).toEqual({ Size: ["36"], Color: ["Blue"] })
    expect(labelForVariantCombination("Shoe", combinations[2], 2)).toBe("Shoe / Size: 38 / Color: Blue")
  })

  it("keeps generated combinations within the variant limit", () => {
    expect(expandVariantOptionValues({ Size: Array.from({ length: 100 }, (_, index) => String(index)) })).toHaveLength(33)
  })
})
