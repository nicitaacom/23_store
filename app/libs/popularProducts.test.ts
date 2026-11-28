import { beforeEach, describe, expect, it, vi } from "vitest"

import { POPULAR_PRODUCT_COLUMNS, selectPopularProducts } from "./popularProducts"

const requests = vi.hoisted(() => ({ createClient: vi.fn(), range: vi.fn() }))

vi.mock("@/libs/publicCatalog", () => ({ createPublicCatalogClient: requests.createClient }))

describe("popular product database projection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requests.range.mockResolvedValue({ data: [], count: 0, error: null })
    const query = { select: vi.fn(), order: vi.fn(), range: requests.range }
    query.select.mockReturnValue(query)
    query.order.mockReturnValue(query)
    requests.createClient.mockReturnValue({ from: () => query })
  })

  it("fetches only the fields rendered by the public popular-product cards", async () => {
    const selectPopularProductsResp = await selectPopularProducts({ limit: 24 })
    const query = requests.createClient.mock.results[0]?.value.from()

    expect(query.select).toHaveBeenCalledWith(POPULAR_PRODUCT_COLUMNS, { count: "exact" })
    expect(query.range).toHaveBeenCalledWith(0, 23)
    expect(selectPopularProductsResp.products).toEqual([])
  })
})
