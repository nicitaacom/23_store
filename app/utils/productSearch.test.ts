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
    const underwear = product("Side-Snap Women's Period Panties with 3-Layer Wavy Waistband", "")
    const tattoo = product("Dreamy Blue Rose Butterfly Tattoo Sticker with Layered Effect", "")
    expect(filterProductsBySearchQuery([unrelated, underwear, tattoo, matching], "lay's")).toEqual([matching])
  })

  it("matches brand words with straight, curly, or omitted apostrophes", () => {
    const straight = product("Lay's Green Onion Chips", "")
    const curly = product("Lay’s Sour Cream Chips", "")
    expect(filterProductsBySearchQuery([straight, curly], "lays")).toEqual([straight, curly])
    expect(filterProductsBySearchQuery([straight, curly], "lay's")).toEqual([straight, curly])
  })
})
