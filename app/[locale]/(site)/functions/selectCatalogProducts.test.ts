import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { selectCatalogProducts } from "./selectCatalogProducts"
import supabaseServer from "@/libs/supabase/supabaseServer"

vi.mock("@/libs/supabase/supabaseServer", () => ({ default: vi.fn() }))

type TCatalogResponse = Awaited<ReturnType<typeof selectCatalogProducts>>
const responses: TCatalogResponse[] = []
const selectTable = vi.fn()
const filterCategories = vi.fn()

function failedResponse(status: number): TCatalogResponse {
  return {
    data: null,
    error: { message: "no available server\n", code: "", details: "", hint: "" },
    status,
    statusText: "Unavailable",
    count: null,
  }
}

describe("catalog database reads", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    responses.length = 0
    selectTable.mockImplementation(() => {
      const query = {
        select: vi.fn(),
        order: vi.fn(),
        in: filterCategories,
        then: (resolve: (response: TCatalogResponse) => unknown) => Promise.resolve(responses.shift()!).then(resolve),
      }
      query.select.mockReturnValue(query)
      query.order.mockReturnValue(query)
      filterCategories.mockReturnValue(query)
      return query
    })
    vi.mocked(supabaseServer).mockResolvedValue({ from: selectTable } as unknown as Awaited<ReturnType<typeof supabaseServer>>)
  })

  afterEach(() => vi.useRealTimers())

  it("recovers from temporary failures and keeps the category filter on every read", async () => {
    const success = {
      data: [{ id: "catalog-product" }],
      error: null,
      status: 200,
      statusText: "OK",
      count: null,
    } as unknown as TCatalogResponse
    responses.push(failedResponse(503), failedResponse(503), success)

    const responsePromise = selectCatalogProducts(["category-1"])
    await vi.runAllTimersAsync()

    expect(await responsePromise).toBe(success)
    expect(selectTable).toHaveBeenCalledTimes(3)
    expect(filterCategories).toHaveBeenCalledTimes(3)
    expect(filterCategories).toHaveBeenCalledWith("category_id", ["category-1"])
  })

  it("returns the original database error after two retries instead of throwing it", async () => {
    const failure = failedResponse(503)
    responses.push(failure, failure, failure)

    const responsePromise = selectCatalogProducts()
    await vi.runAllTimersAsync()

    expect(await responsePromise).toBe(failure)
    expect(selectTable).toHaveBeenCalledTimes(3)
    expect(filterCategories).not.toHaveBeenCalled()
  })

  it("does not retry a permanent query failure", async () => {
    const failure = failedResponse(400)
    responses.push(failure)

    expect(await selectCatalogProducts()).toBe(failure)
    expect(selectTable).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("retries network failures reported by the database client", async () => {
    const success = { data: [], error: null, status: 200, statusText: "OK", count: null } as TCatalogResponse
    responses.push(failedResponse(0), success)

    const responsePromise = selectCatalogProducts()
    await vi.runAllTimersAsync()

    expect(await responsePromise).toBe(success)
    expect(selectTable).toHaveBeenCalledTimes(2)
  })
})
