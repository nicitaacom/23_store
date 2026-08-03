"use server"

import { IBuyingFlowStats } from "@/ts/interfaces/IBuyingFlowStats"
import { Database } from "@/ts/types_db"
import { BUYING_FLOW_STAGES, CHECKOUT_KINDS, TCheckoutKind } from "@/config/buyingFlowConfig"
import { selectDBUTMStatsAction } from "./selectDBUTMStatsAction"
import supabaseServer from "@/libs/supabase/supabaseServer"

type BuyingFlowEventRow = Pick<
  Database["public"]["Tables"]["23_buying_flow_events"]["Row"],
  "event" | "user_id" | "checkout_kind" | "search_query" | "results_count"
>

function resolveDateRange(dateSelection?: { year: number; month: number }): { start: string; end: string } | null {
  if (!dateSelection?.year) return null
  if (!dateSelection.month)
    return {
      start: new Date(Date.UTC(dateSelection.year, 0, 1)).toISOString(),
      end: new Date(Date.UTC(dateSelection.year + 1, 0, 1)).toISOString(),
    }

  return {
    start: new Date(Date.UTC(dateSelection.year, dateSelection.month - 1, 1)).toISOString(),
    end: new Date(Date.UTC(dateSelection.year, dateSelection.month, 1)).toISOString(),
  }
}

function groupSearches(rows: BuyingFlowEventRow[], missesOnly: boolean): { query: string; count: number }[] {
  const searchCounts = new Map<string, number>()

  for (const row of rows) {
    if (row.event !== "search" || !row.search_query || (missesOnly && row.results_count !== 0)) continue
    const query = row.search_query.trim().toLowerCase()
    if (!query) continue
    searchCounts.set(query, (searchCounts.get(query) || 0) + 1)
  }

  return Array.from(searchCounts, ([query, count]) => ({ query, count }))
    .sort((left, right) => right.count - left.count || left.query.localeCompare(right.query))
    .slice(0, 10)
}

function aggregateBuyingFlowStats(rows: BuyingFlowEventRow[], visitedVisitors: number): IBuyingFlowStats {
  const visitorsByEvent = new Map<string, Set<string>>()
  const checkoutCounts = new Map<TCheckoutKind, number>(CHECKOUT_KINDS.map(kind => [kind, 0]))

  for (const row of rows) {
    if (!visitorsByEvent.has(row.event)) visitorsByEvent.set(row.event, new Set())
    visitorsByEvent.get(row.event)?.add(row.user_id)

    if (row.event === "checkout_click" && CHECKOUT_KINDS.includes(row.checkout_kind as TCheckoutKind)) {
      const checkoutKind = row.checkout_kind as TCheckoutKind
      checkoutCounts.set(checkoutKind, (checkoutCounts.get(checkoutKind) || 0) + 1)
    }
  }

  return {
    stages: BUYING_FLOW_STAGES.map(stage => ({
      stage: stage.event,
      label: stage.label,
      visitors: stage.event === "visited" ? visitedVisitors : visitorsByEvent.get(stage.event)?.size || 0,
    })),
    checkoutKinds: CHECKOUT_KINDS.map(kind => ({ kind, clicks: checkoutCounts.get(kind) || 0 })),
    searchMisses: groupSearches(rows, true),
    topSearches: groupSearches(rows, false),
  }
}

export async function selectDBBuyingFlowStatsAction(
  dateSelection?: { year: number; month: number },
): Promise<IBuyingFlowStats | string> {
  try {
    const [selectDBUTMStatsActionResp, supabase] = await Promise.all([
      selectDBUTMStatsAction(dateSelection),
      supabaseServer(),
    ])
    if (typeof selectDBUTMStatsActionResp === "string") return selectDBUTMStatsActionResp

    const dateRange = resolveDateRange(dateSelection)
    let query = supabase
      .from("23_buying_flow_events")
      .select("event, user_id, checkout_kind, search_query, results_count")
      .order("created_at", { ascending: false })

    if (dateRange) query = query.gte("created_at", dateRange.start).lt("created_at", dateRange.end)

    const { data: eventRows, error } = await query
    if (error) return `Error selecting buying-flow stats: ${error.message}`

    // Row counts are small. A SQL view replaces this TypeScript pass when the table becomes large.
    return aggregateBuyingFlowStats(eventRows ?? [], selectDBUTMStatsActionResp.uniqueUsers)
  } catch (error) {
    return `Error processing buying-flow stats: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
