"use server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"
import { parseUTMVisitMetadata } from "@/utils/utmVisitMetadata"

/**
 * Fetches raw UTM stats from the database as an array of objects matching the IDBUTMStats structure
 * (each with fields like id, user_id, visited_at, utm_source, etc.).
 * Processes this data to compute aggregates: total visits, unique users, grouped counts for sources/mediums/campaigns,
 * recent visits in last 30 days, and a slice of raw stats.
 * Returns an aggregated object with these computed values if successful, or a string error message on failure.
 * Note: The return type differs from the raw database type - it's a custom aggregated stats object for dashboard use.
 */
export async function selectDBUTMStatsAction(): Promise<IUTMAggregatedStats | string> {
  try {
    // 1. Get all UTM stats
    const { data: stats, error } = await supabaseAdmin.from("utm_stats").select("*").order("visited_at", { ascending: false })
    if (error) return `Error fetching UTM stats: ${error.message}`
    // 2. Calculate aggregated data
    const totalVisits = stats?.length || 0
    if (!totalVisits)
      return {
        totalVisits: 0,
        uniqueUsers: 0,
        recentVisits: 0,
        sourceStats: [],
        mediumStats: [],
        campaignStats: [],
        countryStats: [],
        locationStats: [],
        rawStats: [],
        chartData: [],
      }
    const enrichedStats = stats.map(stat => ({
      ...stat,
      visitMetadata: parseUTMVisitMetadata(stat.user_agent),
    }))

    const uniqueUsers = new Set(enrichedStats.map(stat => stat.user_id)).size
    const sourceStatsObj = enrichedStats.reduce((acc: { [key: string]: number }, stat) => {
      const source = stat.utm_source || "direct"
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})
    const mediumStatsObj = enrichedStats.reduce((acc: { [key: string]: number }, stat) => {
      const medium = stat.utm_medium || "none"
      acc[medium] = (acc[medium] || 0) + 1
      return acc
    }, {})
    const campaignStatsObj = enrichedStats.reduce((acc: { [key: string]: number }, stat) => {
      const campaign = stat.utm_campaign || "no-campaign"
      acc[campaign] = (acc[campaign] || 0) + 1
      return acc
    }, {})
    const countryStatsMap = new Map<string, { name: string; code: string | null; count: number }>()
    const locationStatsMap = new Map<
      string,
      { name: string; country: string | null; countryCode: string | null; region: string | null; city: string | null; count: number }
    >()

    for (const stat of enrichedStats) {
      const countryName = stat.visitMetadata.country || "Unknown"
      const countryCode = stat.visitMetadata.countryCode || null
      const countryKey = countryCode || countryName
      const existingCountry = countryStatsMap.get(countryKey)

      countryStatsMap.set(countryKey, {
        name: countryName,
        code: countryCode,
        count: (existingCountry?.count || 0) + 1,
      })

      const locationName = stat.visitMetadata.city
        ? `${stat.visitMetadata.city}, ${countryName}`
        : stat.visitMetadata.region
          ? `${stat.visitMetadata.region}, ${countryName}`
          : countryName
      const locationKey = [countryCode || countryName, stat.visitMetadata.region || "", stat.visitMetadata.city || ""].join("|")
      const existingLocation = locationStatsMap.get(locationKey)

      locationStatsMap.set(locationKey, {
        name: locationName,
        country: stat.visitMetadata.country,
        countryCode,
        region: stat.visitMetadata.region,
        city: stat.visitMetadata.city,
        count: (existingLocation?.count || 0) + 1,
      })
    }

    // 3. Get recent visits (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentVisitsArray = enrichedStats.filter(stat => new Date(stat.visited_at) >= thirtyDaysAgo)
    const recentVisits = recentVisitsArray.length

    // 4. Compute chartData (daily visits)
    const chartDataMap = new Map<string, number>()
    for (const stat of enrichedStats) {
      const date = new Date(stat.visited_at).toISOString().split("T")[0]
      chartDataMap.set(date, (chartDataMap.get(date) || 0) + 1)
    }
    const chartData = Array.from(chartDataMap, ([date, visits]) => ({ date, visits })).sort((a, b) =>
      a.date.localeCompare(b.date),
    )

    const toArray = (obj: { [key: string]: number }): { name: string; count: number }[] =>
      Object.entries(obj).map(([name, count]) => ({ name, count }))
    return {
      totalVisits,
      uniqueUsers,
      sourceStats: toArray(sourceStatsObj),
      mediumStats: toArray(mediumStatsObj),
      campaignStats: toArray(campaignStatsObj),
      countryStats: Array.from(countryStatsMap.values()).sort((a, b) => b.count - a.count),
      locationStats: Array.from(locationStatsMap.values()).sort((a, b) => b.count - a.count),
      recentVisits,
      rawStats: enrichedStats.slice(0, 10).map(stat => ({
        ...stat,
        location: stat.visitMetadata,
      })),
      chartData,
    }
  } catch (error) {
    return `Error processing UTM stats: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
