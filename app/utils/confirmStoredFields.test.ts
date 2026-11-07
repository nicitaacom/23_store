import { describe, expect, it } from "vitest"

import type { TProductDB } from "@/ts/product/TProductDB"
import { claimFieldRevision, confirmDescription, confirmPrice, confirmStock, confirmTitle, isLatestFieldRevision } from "./confirmStoredFields"

function row(title: string, price: number, description = "Kept description"): TProductDB {
  const translation = { title, description }
  return {
    id: "prod_race",
    price_id: `price_${price}`,
    owner_id: "owner",
    translations: { en: { ...translation }, fi: { ...translation }, ru: { ...translation }, se: { ...translation } },
    price,
    img_url: [],
    on_stock: 4,
    ai_price_baseline: price,
  }
}

describe("confirmStoredFields", () => {
  it("keeps a title stored while the price request was still open", () => {
    const stored = row("Sour Cream & Onion 160 g", 8.89, "owner description")
    const priceResponse = row("Sour Cream 160 g", 8.88, "stale description")
    priceResponse.price_id = "price_new"
    priceResponse.ai_price_baseline = 8.88

    const next = confirmPrice(stored, priceResponse)

    expect(next.translations.en.title).toBe("Sour Cream & Onion 160 g")
    expect(next.translations.fi.description).toBe("owner description")
    expect(next.price).toBe(8.88)
    expect(next.price_id).toBe("price_new")
    expect(next.ai_price_baseline).toBe(8.88)
    expect(next.on_stock).toBe(4)
  })

  it("keeps a price stored while the title request was still open", () => {
    const stored = row("Sour Cream 160 g", 8.88)
    stored.price_id = "price_new"
    const titleResponse = row("Sour Cream & Onion 160 g", 8.89, "stale description")
    titleResponse.price_id = "price_old"

    const next = confirmTitle(stored, titleResponse)

    expect(next.translations.en.title).toBe("Sour Cream & Onion 160 g")
    expect(next.translations.ru.title).toBe("Sour Cream & Onion 160 g")
    expect(next.translations.en.description).toBe("Kept description")
    expect(next.price).toBe(8.88)
    expect(next.price_id).toBe("price_new")
  })

  it("keeps a title when a stock response arrives after the title was stored", () => {
    const stored = row("Sour Cream & Onion 160 g", 8.88)
    const stockResponse = row("Sour Cream 160 g", 8.88)
    stockResponse.on_stock = 12

    const next = confirmStock(stored, stockResponse)

    expect(next.translations.en.title).toBe("Sour Cream & Onion 160 g")
    expect(next.on_stock).toBe(12)
  })

  it("keeps a title when a description response arrives later", () => {
    const stored = row("Sour Cream & Onion 160 g", 8.88, "owner description")
    const descriptionResponse = row("Sour Cream 160 g", 1, "new description")

    const next = confirmDescription(stored, descriptionResponse)

    expect(next.translations.en.title).toBe("Sour Cream & Onion 160 g")
    expect(next.translations.en.description).toBe("new description")
    expect(next.price).toBe(8.88)
  })

  it("ignores an older revision after a newer claim", () => {
    expect(isLatestFieldRevision("row-1", "title", claimFieldRevision("row-1", "title"))).toBe(true)
    const older = claimFieldRevision("row-1", "price")
    claimFieldRevision("row-1", "price")
    expect(isLatestFieldRevision("row-1", "price", older)).toBe(false)
  })

  it("keeps the title when the price response arrives after the title response", () => {
    const stored = row("Sour Cream 160 g", 8.89)
    const titleResponse = row("Sour Cream & Onion 160 g", 8.89)
    const priceResponse = row("Sour Cream 160 g", 8.88)

    const afterTitle = confirmTitle(stored, titleResponse)
    const afterLatePrice = confirmPrice(afterTitle, priceResponse)

    expect(afterLatePrice.translations.se.title).toBe("Sour Cream & Onion 160 g")
    expect(afterLatePrice.price).toBe(8.88)
  })
})
