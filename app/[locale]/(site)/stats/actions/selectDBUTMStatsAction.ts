"use server"

import { selectDBUTMStats } from "@/api/utm/select/selectDBUTMStats"
import { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"

/**
 * Fetches raw UTM stats from the database as an array of objects matching the IDBUTMStats structure
 * (each with fields like id, user_id, visited_at, utm_source, etc.).
 * Processes this data to compute aggregates: total visits, unique users, grouped counts for sources/mediums/campaigns,
 * recent visits in last 30 days, and a slice of raw stats.
 * Returns an aggregated object with these computed values if successful, or a string error message on failure.
 * Note: The return type differs from the raw database type - it's a custom aggregated stats object for dashboard use.
 */
export async function selectDBUTMStatsAction(): Promise<IUTMAggregatedStats | string> {
  return selectDBUTMStats()
}
