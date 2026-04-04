// DO NOT import anything here

declare module API {
  type UTMVisitMetadata = {
    userAgent: string | null
    countryCode: string | null
    country: string | null
    region: string | null
    city: string | null
  }

  type UTMTrackVisitRequest = {
    userId: string
    searchParams?: Record<string, string | undefined>
  }

  type UTMTrackVisitResponse = {
    tracked: boolean
  }

  type UTMStatsGroupedItem = {
    name: string
    count: number
  }

  type UTMStatsCountryItem = {
    name: string
    code: string | null
    count: number
  }

  type UTMStatsLocationItem = {
    name: string
    country: string | null
    countryCode: string | null
    region: string | null
    city: string | null
    count: number
  }

  type UTMStatsChartItem = {
    date: string
    visits: number
  }

  type UTMStatsRawItem = {
    id?: number | string
    user_id: string
    visited_at: string
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    utm_term: string | null
    utm_content: string | null
    user_agent: string | null
    location: UTMVisitMetadata
    visitMetadata?: UTMVisitMetadata
  }

  type UTMSelectDBStatsResponse = {
    totalVisits: number
    uniqueUsers: number
    recentVisits: number
    sourceStats: UTMStatsGroupedItem[]
    mediumStats: UTMStatsGroupedItem[]
    campaignStats: UTMStatsGroupedItem[]
    countryStats: UTMStatsCountryItem[]
    locationStats: UTMStatsLocationItem[]
    rawStats: UTMStatsRawItem[]
    chartData: UTMStatsChartItem[]
  }
}
