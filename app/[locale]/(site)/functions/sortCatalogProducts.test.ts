import { describe, expect, it } from "vitest"

import { sortCatalogProducts } from "./sortCatalogProducts"
import { TProductDB } from "@/ts/product/TProductDB"

function product(id: string, onStock: number, categoryId: string, quantities?: number[]): TProductDB {
  return {
    id,
    on_stock: onStock,
    category_id: categoryId,
    price: 1,
    variants: quantities?.map((quantity, index) => ({ id: `${id}-${index}`, label: "option", quantity, price: 1 })),
  } as TProductDB
}

describe("catalog ordering", () => {
  it("puts sold-out products after all available products before pagination", () => {
    const products = [
      product("sold-out", 0, "favorite"),
      product("available", 1, "other"),
      product("variant-available", 0, "other", [0, 3]),
      product("variants-sold-out", 10, "favorite", [0, 0]),
    ]

    const sorted = sortCatalogProducts(products, { favorite: 10 })

    expect(sorted.map(item => item.id)).toEqual(["available", "variant-available", "sold-out", "variants-sold-out"])
    expect(sorted.slice(0, 2).every(item => item.id.includes("available"))).toBe(true)
    expect(products[0].id).toBe("sold-out")
  })

  it("keeps search relevance order even when the first match is sold out", () => {
    const products = [product("best-match", 0, "other"), product("other-match", 1, "favorite")]

    expect(sortCatalogProducts(products, { favorite: 10 }, "match")).toEqual(products)
  })

  it("uses category preferences within each stock group", () => {
    const products = [product("other", 1, "other"), product("favorite", 1, "favorite")]

    expect(sortCatalogProducts(products, { favorite: 5 }).map(item => item.id)).toEqual(["favorite", "other"])
  })
})
