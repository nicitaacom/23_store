import { describe, expect, it } from "vitest"

import { filterProductsBySearchQuery } from "./productSearch"

function product(title: string, description: string) {
  const translation = { title, description }
  return { translations: { en: translation, fi: translation, ru: translation, se: translation }, variants: null }
}

describe("filterProductsBySearchQuery", () => {
  it("shows matching product names before description mentions", () => {
    const whey = product("Whey Powder", "Protein for drinks")
    const candy = product("Kinder Crispy", "Contains whey powder")
    expect(filterProductsBySearchQuery([candy, whey], "whey")).toEqual([whey])
  })

  it("uses descriptions when no product name matches", () => {
    const candy = product("Kinder Crispy", "Contains whey powder")
    expect(filterProductsBySearchQuery([candy], "whey")).toEqual([candy])
  })

  it("keeps a phrase within one field instead of combining unrelated translations", () => {
    const matching = product("Lay's Green Onion Chips", "Potato snacks")
    const unrelated = product("Green Tea", "Lay's products are sold nearby")
    expect(filterProductsBySearchQuery([unrelated, matching], "lay's")).toEqual([matching])
  })
})
