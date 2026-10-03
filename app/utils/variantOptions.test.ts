import { describe, expect, it } from "vitest"

import type { TProductVariant } from "@/ts/product/TProductVariant"
import { chooseVariantForOption, cleanVariantOptions, expandVariantOptionValues, getProductVariantSelectionLabel, getVariantGroupLabel, getVariantGroupOptions, getVariantOptionGroups, groupProductVariants, groupVariantDrafts, toVariantOptionValues, updateVariantGroupOptions } from "./variantOptions"

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
  })

  it("keeps generated combinations within the variant limit", () => {
    expect(expandVariantOptionValues({ Size: Array.from({ length: 100 }, (_, index) => String(index)) })).toHaveLength(33)
  })

  it("keeps sizes under one variant label and preserves existing purchase IDs", () => {
    const drafts = [
      { id: "grey-38", group_id: "grey", label: "Grey", options: { Size: ["38.5"] }, price: 17.44, quantity: 114 },
      { id: "grey-39", group_id: "grey", label: "Grey / Size: 39.5", options: { Size: ["39.5"] }, price: 19, quantity: 5 },
      { id: "blue-40", group_id: "blue", label: "Blue", options: { Size: ["40"] }, price: 22, quantity: 3 },
    ]

    const group = groupVariantDrafts(drafts)[0]
    expect(getVariantGroupLabel(group)).toBe("Grey")
    expect(getVariantGroupOptions(group)).toEqual({ Size: ["38.5", "39.5"] })

    const updated = updateVariantGroupOptions(drafts, "grey", { Size: ["38.5", "39.5", "40"] })
    expect(groupVariantDrafts(updated)).toHaveLength(2)
    expect(updated.map(variant => variant.label)).toEqual(["Grey", "Grey", "Grey", "Blue"])
    expect(updated[0].id).toBe("grey-38")
    expect(updated[1].id).toBe("grey-39")
    expect(updated[1].price).toBe(19)
    expect(updated[2].options).toEqual({ Size: ["40"] })
    expect(updated[3]).toEqual(drafts[2])
  })

  it("shows one variant choice per group while retaining the chosen size in an order label", () => {
    const sizedVariants: TProductVariant[] = [
      { id: "grey-38", group_id: "grey", label: "Grey", options: { Size: "38.5" }, price: 17.44, quantity: 114 },
      { id: "grey-40", group_id: "grey", label: "Grey / Size: 40", options: { Size: "40" }, price: 17.44, quantity: 8 },
    ]
    expect(groupProductVariants(sizedVariants)).toHaveLength(1)
    expect(getProductVariantSelectionLabel(sizedVariants[1])).toBe("Grey / Size: 40")
    expect(chooseVariantForOption(sizedVariants, sizedVariants[0], "Size", "40")?.id).toBe("grey-40")
  })

  it("keeps a purchase ID when parameter names arrive in a different order", () => {
    const drafts = [{ id: "grey-38", group_id: "grey", label: "Grey", options: { Color: ["Grey"], Size: ["38.5"] } }]
    const updated = updateVariantGroupOptions(drafts, "grey", { Size: ["38.5"], Color: ["Grey"] })
    expect(updated).toHaveLength(1)
    expect(updated[0].id).toBe("grey-38")
  })

  it("keeps the variant ID when its first parameter is added or removed", () => {
    const draft = { id: "grey", label: "Grey", options: {} }
    const withSize = updateVariantGroupOptions([draft], "grey", { Size: ["38.5"] })
    expect(withSize[0].id).toBe("grey")
    expect(updateVariantGroupOptions(withSize, "grey", {})[0].id).toBe("grey")
  })
})
