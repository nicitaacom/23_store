import { beforeEach, describe, expect, it, vi } from "vitest"

import { Database } from "@/ts/types_db"
import { selectDBBuyingFlowStatsAction } from "./selectDBBuyingFlowStatsAction"

type BuyingFlowEventRow = Pick<
  Database["public"]["Tables"]["23_buying_flow_events"]["Row"],
  "event" | "user_id" | "checkout_kind" | "search_query" | "results_count"
>

const readState = vi.hoisted(() => ({
  rows: [] as BuyingFlowEventRow[],
  visitedVisitors: 0,
}))

vi.mock("./selectDBUTMStatsAction", () => ({
  selectDBUTMStatsAction: async () => ({ uniqueUsers: readState.visitedVisitors }),
}))

vi.mock("@/libs/supabase/supabaseServer", () => ({
  default: async () => ({
    from: () => {
      const queryBuilder = {
        select: () => queryBuilder,
        order: () => queryBuilder,
        gte: () => queryBuilder,
        lt: () => queryBuilder,
        then: (resolve: (value: { data: BuyingFlowEventRow[]; error: null }) => unknown) =>
          Promise.resolve({ data: readState.rows, error: null }).then(resolve),
      }
      return queryBuilder
    },
  }),
}))

function row(values: Partial<BuyingFlowEventRow>): BuyingFlowEventRow {
  return {
    event: "product_view",
    user_id: "visitor-1",
    checkout_kind: null,
    search_query: null,
    results_count: null,
    ...values,
  }
}

beforeEach(() => {
  readState.rows = []
  readState.visitedVisitors = 0
})

describe("selectDBBuyingFlowStatsAction aggregation", () => {
  it("counts distinct visitors per stage", async () => {
    readState.visitedVisitors = 4
    readState.rows = [
      row({ event: "product_view" }),
      row({ event: "product_view" }),
      row({ event: "product_view", user_id: "visitor-2" }),
      row({ event: "add_to_cart" }),
    ]
    const stats = await selectDBBuyingFlowStatsAction()

    expect(typeof stats === "string" ? [] : stats.stages.map(stage => stage.visitors)).toEqual([4, 2, 1, 0, 0])
  })

  it("groups every checkout kind and keeps request better prices first", async () => {
    readState.visitedVisitors = 1
    readState.rows = [
      row({ event: "checkout_click", checkout_kind: "stripe" }),
      row({ event: "checkout_click", checkout_kind: "stripe" }),
      row({ event: "checkout_click", checkout_kind: "request_better_prices" }),
    ]
    const stats = await selectDBBuyingFlowStatsAction()

    expect(typeof stats === "string" ? [] : stats.checkoutKinds).toEqual([
      { kind: "request_better_prices", clicks: 1 },
      { kind: "stripe", clicks: 2 },
      { kind: "paypal", clicks: 0 },
      { kind: "metamask", clicks: 0 },
      { kind: "solana", clicks: 0 },
    ])
  })

  it("separates missed searches and limits both lists to ten", async () => {
    readState.visitedVisitors = 12
    readState.rows = Array.from({ length: 12 }, (_, index) =>
      row({
        event: "search",
        user_id: `visitor-${index}`,
        search_query: index === 0 ? "  Shoes " : `query-${index}`,
        results_count: index % 2,
      }),
    )
    readState.rows.push(row({ event: "search", search_query: "SHOES", results_count: 0 }))
    const stats = await selectDBBuyingFlowStatsAction()

    if (typeof stats === "string") throw new Error(stats)
    expect(stats.searchMisses[0]).toEqual({ query: "shoes", count: 2 })
    expect(stats.searchMisses.every(search => search.query === "shoes" || Number(search.query.split("-")[1]) % 2 === 0)).toBe(
      true,
    )
    expect(stats.topSearches).toHaveLength(10)
  })
})
