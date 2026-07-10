export interface IUTMCountryStat {
  name: string
  code: string | null
  count: number
}

export interface IUTMLocationStat {
  name: string
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
  count: number
}

export interface IUTMAggregatedStats {
  totalVisits: number
  uniqueUsers: number
  sourceStats: Array<{ name: string; count: number }>
  mediumStats: Array<{ name: string; count: number }>
  campaignStats: Array<{ name: string; count: number }>
  countryStats: IUTMCountryStat[]
  locationStats: IUTMLocationStat[]
  recentVisits: number
  rawStats: Array<API.UTMStatsRawItem>
  chartData: { date: string; visits: number }[]
}
