import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "./route"
import { POPULAR_PRODUCT_COLUMNS } from "@/libs/popularProducts"

const requests = vi.hoisted(() => ({ createClient: vi.fn(), range: vi.fn() }))

vi.mock("@/libs/publicCatalog", () => ({ createPublicCatalogClient: requests.createClient }))

describe("popular products request range", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requests.range.mockResolvedValue({ data: [], error: null })
    const query = { select: vi.fn(), order: vi.fn(), range: requests.range }
    query.select.mockReturnValue(query)
    query.order.mockReturnValue(query)
    requests.createClient.mockReturnValue({ from: () => query })
  })

  it.each([
    ["", 0, 23],
    ["?start=24&end=48", 24, 47],
    ["?start=48&end=72", 48, 71],
  ])("accepts a bounded range %s", async (query, from, to) => {
    const response = await GET(new Request(`https://example.test/api/popular-products${query}`))
    expect(response.status).toBe(200)
    expect(requests.createClient.mock.results[0]?.value.from().select).toHaveBeenCalledWith(POPULAR_PRODUCT_COLUMNS)
    expect(requests.range).toHaveBeenCalledWith(from, to)
  })

  it.each([
    "?start=0&end=100",
    "?start=-1&end=1",
    "?start=1.5&end=10",
    "?start=0&end=Infinity",
    "?start=5&end=5",
    "?start=30&end=54",
    "?start=24&end=49",
    "?start=9007199254740992&end=9007199254740993",
  ])("rejects %s without contacting Supabase", async query => {
    const response = await GET(new Request(`https://example.test/api/popular-products${query}`))
    expect(response.status).toBe(400)
    expect(requests.createClient).not.toHaveBeenCalled()
  })
})
