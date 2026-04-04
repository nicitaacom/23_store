import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { parseUTMVisitMetadata } from "@/utils/utmVisitMetadata"

export async function selectDBUTMStats(): Promise<API.UTMSelectDBStatsResponse | string> {
  try {
    const { data: stats, error } = await supabaseAdmin.from("utm_stats").select("*").order("visited_at", { ascending: false })
    if (error) return `Error fetching UTM stats: ${error.message}`

    const totalVisits = stats?.length || 0
    if (!totalVisits) {
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
    }

    const enrichedStats = stats.map(stat => ({
      ...stat,
      visitMetadata: parseUTMVisitMetadata(stat.user_agent),
    }))

    const uniqueUsers = new Set(enrichedStats.map(stat => stat.user_id)).size
    const sourceStatsObj = enrichedStats.reduce((acc: Record<string, number>, stat) => {
      const source = stat.utm_source || "direct"
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})
    const mediumStatsObj = enrichedStats.reduce((acc: Record<string, number>, stat) => {
      const medium = stat.utm_medium || "none"
      acc[medium] = (acc[medium] || 0) + 1
      return acc
    }, {})
    const campaignStatsObj = enrichedStats.reduce((acc: Record<string, number>, stat) => {
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

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentVisits = enrichedStats.filter(stat => new Date(stat.visited_at) >= thirtyDaysAgo).length

    const chartDataMap = new Map<string, number>()
    for (const stat of enrichedStats) {
      const date = new Date(stat.visited_at).toISOString().split("T")[0]
      chartDataMap.set(date, (chartDataMap.get(date) || 0) + 1)
    }

    const toArray = (object: Record<string, number>) => Object.entries(object).map(([name, count]) => ({ name, count }))

    return {
      totalVisits,
      uniqueUsers,
      sourceStats: toArray(sourceStatsObj),
      mediumStats: toArray(mediumStatsObj),
      campaignStats: toArray(campaignStatsObj),
      countryStats: Array.from(countryStatsMap.values()).sort((left, right) => right.count - left.count),
      locationStats: Array.from(locationStatsMap.values()).sort((left, right) => right.count - left.count),
      recentVisits,
      rawStats: enrichedStats.slice(0, 10).map(stat => ({
        ...stat,
        location: stat.visitMetadata,
      })),
      chartData: Array.from(chartDataMap, ([date, visits]) => ({ date, visits })).sort((left, right) => left.date.localeCompare(right.date)),
    }
  } catch (error) {
    return `Error processing UTM stats: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
