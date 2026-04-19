"use server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"
import { parseUTMVisitMetadata } from "@/utils/utmVisitMetadata"

const PROJECT_URL_FRAGMENTS = ["://localhost:3023/", "://23-store.vercel.app/", "://jokik.fi/", "://www.jokik.fi/"]

const EMPTY_STATS: IUTMAggregatedStats = {
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

function sortGroupedStats<T extends { count: number }>(stats: T[]): T[] {
  return stats.sort((left, right) => right.count - left.count)
}

function toGroupedStats(groupMap: Map<string, number>) {
  return sortGroupedStats(Array.from(groupMap, ([name, count]) => ({ name, count })))
}

function formatLocationName(country: string | null, region: string | null, city: string | null) {
  const locationParts = [city, region, country].filter(Boolean)
  return locationParts.length > 0 ? locationParts.join(", ") : null
}

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
    const urlFilters = PROJECT_URL_FRAGMENTS.map(urlFragment => `url.ilike.%${urlFragment}%`).join(",")

    const { data: stats, error } = await supabaseAdmin
      .from("utm_stats")
      .select("id, user_id, created_at, source, medium, campaign, url, user_agent")
      .or(urlFilters)
      .order("created_at", { ascending: false })

    if (error) return `Error fetching UTM stats: ${error.message}`
    if (!stats?.length) return EMPTY_STATS

    const statsWithMetadata = stats.map(stat => {
      const visitMetadata = parseUTMVisitMetadata(stat.user_agent)

      return {
        ...stat,
        visitMetadata,
      }
    })

    const sourceStatsMap = new Map<string, number>()
    const mediumStatsMap = new Map<string, number>()
    const campaignStatsMap = new Map<string, number>()
    const countryStatsMap = new Map<string, { name: string; code: string | null; count: number }>()
    const locationStatsMap = new Map<
      string,
      {
        name: string
        country: string | null
        countryCode: string | null
        region: string | null
        city: string | null
        count: number
      }
    >()
    const chartDataMap = new Map<string, number>()

    for (const stat of statsWithMetadata) {
      const source = stat.source || "direct"
      const medium = stat.medium || "direct"
      const campaign = stat.campaign || "no-campaign"
      const dateKey = new Date(stat.created_at).toISOString().split("T")[0]
      const locationName = formatLocationName(stat.visitMetadata.country, stat.visitMetadata.region, stat.visitMetadata.city)
      const countryKey = stat.visitMetadata.countryCode || stat.visitMetadata.country

      sourceStatsMap.set(source, (sourceStatsMap.get(source) || 0) + 1)
      mediumStatsMap.set(medium, (mediumStatsMap.get(medium) || 0) + 1)
      campaignStatsMap.set(campaign, (campaignStatsMap.get(campaign) || 0) + 1)
      chartDataMap.set(dateKey, (chartDataMap.get(dateKey) || 0) + 1)

      if (countryKey) {
        const currentCountry = countryStatsMap.get(countryKey)
        countryStatsMap.set(countryKey, {
          name: stat.visitMetadata.country || stat.visitMetadata.countryCode || "Unknown country",
          code: stat.visitMetadata.countryCode,
          count: (currentCountry?.count || 0) + 1,
        })
      }

      if (locationName) {
        const locationKey = [
          stat.visitMetadata.countryCode,
          stat.visitMetadata.country,
          stat.visitMetadata.region,
          stat.visitMetadata.city,
        ]
          .filter(Boolean)
          .join("|")
        const currentLocation = locationStatsMap.get(locationKey)

        locationStatsMap.set(locationKey, {
          name: locationName,
          country: stat.visitMetadata.country,
          countryCode: stat.visitMetadata.countryCode,
          region: stat.visitMetadata.region,
          city: stat.visitMetadata.city,
          count: (currentLocation?.count || 0) + 1,
        })
      }
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return {
      totalVisits: statsWithMetadata.length,
      uniqueUsers: new Set(statsWithMetadata.map(stat => stat.user_id)).size,
      recentVisits: statsWithMetadata.filter(stat => new Date(stat.created_at) >= thirtyDaysAgo).length,
      sourceStats: toGroupedStats(sourceStatsMap),
      mediumStats: toGroupedStats(mediumStatsMap),
      campaignStats: toGroupedStats(campaignStatsMap),
      countryStats: sortGroupedStats(Array.from(countryStatsMap.values())),
      locationStats: sortGroupedStats(Array.from(locationStatsMap.values())),
      rawStats: statsWithMetadata.slice(0, 10).map(stat => ({
        id: stat.id,
        user_id: stat.user_id,
        visited_at: stat.created_at,
        utm_source: stat.source,
        utm_medium: stat.medium,
        utm_campaign: stat.campaign,
        utm_term: null,
        utm_content: null,
        user_agent: stat.user_agent,
        location: stat.visitMetadata,
        visitMetadata: stat.visitMetadata,
      })),
      chartData: Array.from(chartDataMap, ([date, visits]) => ({ date, visits })).sort((left, right) =>
        left.date.localeCompare(right.date),
      ),
    }
  } catch (error) {
    return `Error processing UTM stats: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
