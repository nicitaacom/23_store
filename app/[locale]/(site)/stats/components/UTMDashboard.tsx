"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Area, AreaChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { IoChevronDown, IoCalendar, IoTrendingUp, IoGlobeOutline, IoLocationOutline } from "react-icons/io5"

import { IUTMAggregatedStats, IUTMCountryStat, IUTMLocationStat } from "@/ts/interfaces/IUTMAggregatedStats"
import { selectDBUTMStatsAction } from "../actions/selectDBUTMStatsAction"

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]
const FIRST_YEAR = 2023 // year the store launched — don't offer years before this
const DAILY_VISITS_RANGE_OPTIONS = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "Last Week", days: 7 },
  { key: "month", label: "Last Month", days: 30 },
  { key: "threeMonths", label: "Last 3 Months", days: 90 },
  { key: "year", label: "Last Year", days: 365 },
] as const

type DailyVisitsRangeKey = (typeof DAILY_VISITS_RANGE_OPTIONS)[number]["key"]

const getCountryFlag = (countryCode: string | null) => {
  if (!countryCode || countryCode.length !== 2) return "🌍"
  return countryCode
    .toUpperCase()
    .split("")
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("")
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function shiftDate(date: Date, days: number): Date {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function formatChartAxisLabel(value: string, range: DailyVisitsRangeKey): string {
  const date = parseDateKey(value)

  if (range === "year") {
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatChartTooltipLabel(value: string): string {
  return parseDateKey(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatChartDateRange(startDate: Date | null, endDate: Date | null): string {
  if (!startDate || !endDate) return ""

  const sameYear = startDate.getFullYear() === endDate.getFullYear()
  const startFormat: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" }

  const startLabel = startDate.toLocaleDateString("en-US", startFormat)
  const endLabel = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return formatDateKey(startDate) === formatDateKey(endDate) ? endLabel : `${startLabel} - ${endLabel}`
}

function getDailyVisitsRangeData(data: API.UTMStatsChartItem[], range: DailyVisitsRangeKey) {
  if (!data.length) {
    return {
      points: [] as API.UTMStatsChartItem[],
      startDate: null as Date | null,
      endDate: null as Date | null,
    }
  }

  const sortedData = [...data].sort((left, right) => left.date.localeCompare(right.date))
  const rangeOption = DAILY_VISITS_RANGE_OPTIONS.find(option => option.key === range) || DAILY_VISITS_RANGE_OPTIONS[2]
  const endDate = parseDateKey(sortedData[sortedData.length - 1].date)
  const startDate = shiftDate(endDate, -(rangeOption.days - 1))
  const visitsByDate = new Map<string, number>()

  for (const item of sortedData) {
    visitsByDate.set(item.date, (visitsByDate.get(item.date) || 0) + item.visits)
  }

  const points: API.UTMStatsChartItem[] = []
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = shiftDate(cursor, 1)) {
    const dateKey = formatDateKey(cursor)
    points.push({
      date: dateKey,
      visits: visitsByDate.get(dateKey) || 0,
    })
  }

  return { points, startDate, endDate }
}

// Mock data generator based on selected period
const getMockData = (year: number, month: number): IUTMAggregatedStats => {
  // 1. Generate base multiplier based on month (0 = entire year)
  const monthMultipliers = [12, 0.8, 0.9, 1.1, 1.2, 1.3, 1.4, 1.5, 1.2, 1.1, 0.9, 1.6, 1.8] // Index 0 = entire year
  const yearMultiplier = year === 2025 ? 1 : year === 2024 ? 0.85 : year === 2023 ? 0.7 : 0.6
  const baseMultiplier = monthMultipliers[month] * yearMultiplier

  // 2. Base numbers that will be multiplied
  const baseVisits = 1200
  const baseUsers = 800
  const baseRecent = 300

  // 3. Calculate totals
  const totalVisits = Math.round(baseVisits * baseMultiplier)
  const uniqueUsers = Math.round(baseUsers * baseMultiplier)
  const recentVisits = Math.round(baseRecent * baseMultiplier)

  // 4. Generate source stats with variation
  const sourceBases = [
    { name: "Google", base: 360 },
    { name: "Facebook", base: 240 },
    { name: "Twitter", base: 130 },
    { name: "LinkedIn", base: 80 },
  ]
  const sourceStats = sourceBases.map(source => ({
    name: source.name,
    count: Math.round(source.base * baseMultiplier * (0.8 + Math.random() * 0.4)),
  }))

  // 5. Generate medium stats with variation
  const mediumBases = [
    { name: "Organic", base: 470 },
    { name: "Paid", base: 290 },
    { name: "Social", base: 240 },
    { name: "Email", base: 100 },
  ]
  const mediumStats = mediumBases.map(medium => ({
    name: medium.name,
    count: Math.round(medium.base * baseMultiplier * (0.8 + Math.random() * 0.4)),
  }))

  // 6. Generate campaign stats with seasonal variations
  const campaigns =
    month === 0
      ? [
          "Summer Sale",
          "Winter Promo",
          "Black Friday",
          "Spring Launch",
          "Holiday Special",
          "Back to School",
          "Valentine's Day",
          "Easter Sale",
        ]
      : month <= 3
        ? ["Winter Promo", "Valentine's Day", "Spring Launch", "Easter Sale"]
        : month <= 6
          ? ["Spring Launch", "Summer Sale", "Back to School", "Mid-Year Sale"]
          : month <= 9
            ? ["Summer Sale", "Back to School", "Fall Collection", "Halloween Sale"]
            : ["Black Friday", "Holiday Special", "Winter Promo", "Cyber Monday"]

  const campaignStats = campaigns
    .map((name, index) => ({
      name,
      count: Math.round((100 + index * 50) * baseMultiplier * (0.7 + Math.random() * 0.6)),
    }))
    .sort((a, b) => b.count - a.count)
  const countryStats: IUTMCountryStat[] = [
    { name: "Finland", code: "FI", count: Math.round(420 * baseMultiplier) },
    { name: "Sweden", code: "SE", count: Math.round(220 * baseMultiplier) },
    { name: "Germany", code: "DE", count: Math.round(180 * baseMultiplier) },
    { name: "India", code: "IN", count: Math.round(60 * baseMultiplier) },
  ]
  const locationStats: IUTMLocationStat[] = [
    { name: "Helsinki, Finland", country: "Finland", countryCode: "FI", region: "Uusimaa", city: "Helsinki", count: 180 },
    { name: "Espoo, Finland", country: "Finland", countryCode: "FI", region: "Uusimaa", city: "Espoo", count: 96 },
    { name: "Stockholm, Sweden", country: "Sweden", countryCode: "SE", region: "Stockholm County", city: "Stockholm", count: 82 },
    { name: "Berlin, Germany", country: "Germany", countryCode: "DE", region: "Berlin", city: "Berlin", count: 64 },
  ]

  // 7. Generate daily chart data for the selected period
  const chartData: { date: string; visits: number }[] = []
  if (month === 0) {
    // Entire year - generate daily data so range filters stay meaningful
    for (let cursor = new Date(year, 0, 1); cursor <= new Date(year, 11, 31); cursor = shiftDate(cursor, 1)) {
      const monthIndex = cursor.getMonth() + 1
      const monthlyMultiplier = monthMultipliers[monthIndex] * yearMultiplier
      chartData.push({
        date: formatDateKey(cursor),
        visits: Math.round((baseVisits / 30) * monthlyMultiplier * (0.7 + Math.random() * 0.6)),
      })
    }
  } else {
    // Specific month - generate daily data points
    const daysInMonth = new Date(year, month, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDateKey(new Date(year, month - 1, day))
      const dailyVariation = 0.7 + Math.random() * 0.6
      chartData.push({
        date,
        visits: Math.round((totalVisits / daysInMonth) * dailyVariation),
      })
    }
  }

  // 8. Generate raw stats with appropriate dates
  const sources = ["google", "facebook", "twitter", "linkedin", "direct"]
  const mediums = ["cpc", "social", "organic", "email", "none"]
  const rawStats = Array.from({ length: Math.min(20, Math.round(baseMultiplier * 5)) }, _ => ({
    utm_source: sources[Math.floor(Math.random() * sources.length)],
    utm_medium: mediums[Math.floor(Math.random() * mediums.length)],
    utm_campaign: campaigns[Math.floor(Math.random() * campaigns.length)] || "",
    visited_at: chartData[Math.floor(Math.random() * chartData.length)]?.date || formatDateKey(new Date()),
  }))

  return {
    totalVisits,
    uniqueUsers,
    recentVisits,
    sourceStats,
    mediumStats,
    campaignStats: campaignStats.slice(0, 8),
    countryStats,
    locationStats,
    rawStats,
    chartData,
  }
}

function DailyVisitsChart({ data }: { data: { date: string; visits: number }[] }) {
  const [selectedRange, setSelectedRange] = useState<DailyVisitsRangeKey>("month")

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg mobile:text-xl font-bold text-title">Daily Visits</h3>
          <p className="text-sm text-subTitle">Traffic trend by date</p>
        </div>
        <div className="flex flex-col items-center justify-center h-[300px] text-subTitle rounded-lg border border-border-color/20 bg-background/40">
          <IoTrendingUp className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm opacity-75">Chart data will appear here</p>
        </div>
      </div>
    )
  }

  const { points, startDate, endDate } = getDailyVisitsRangeData(data, selectedRange)
  const rangeSummary = formatChartDateRange(startDate, endDate)
  const showDots = points.length <= 45

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 mobile:flex-row mobile:items-start mobile:justify-between">
        <div>
          <h3 className="text-lg mobile:text-xl font-bold text-title">Daily Visits</h3>
          <p className="text-sm text-subTitle">{rangeSummary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAILY_VISITS_RANGE_OPTIONS.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedRange(option.key)}
              className={`rounded-full px-3 py-1.5 text-xs mobile:text-sm font-medium transition-colors ${
                selectedRange === option.key ? "bg-brand text-foreground" : "bg-background/60 text-subTitle hover:bg-active-color"
              }`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[340px] rounded-lg border border-border-color/20 bg-background/40 p-3 mobile:p-4">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="dailyVisitsStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="dailyVisitsFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color) / 0.25)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--subTitle))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              interval="preserveStartEnd"
              tickMargin={12}
              tickFormatter={(value: string) => formatChartAxisLabel(value, selectedRange)}
            />
            <YAxis
              stroke="hsl(var(--subTitle))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={56}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number | string | undefined) => [`${Number(value || 0).toLocaleString()} visits`, "Traffic"]}
              labelFormatter={label => (typeof label === "string" ? formatChartTooltipLabel(label) : label)}
              contentStyle={{
                backgroundColor: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border-color))",
                borderRadius: "12px",
                color: "hsl(var(--title))",
              }}
              cursor={{ stroke: "hsl(var(--border-color))", strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="visits"
              stroke="url(#dailyVisitsStroke)"
              fill="url(#dailyVisitsFill)"
              strokeWidth={3}
              animationDuration={450}
              dot={showDots ? { r: 4, fill: "#22C55E", stroke: "#111827", strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: "#22C55E", stroke: "#111827", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function UTMDashboard({ utmStatsResponse }: { utmStatsResponse: IUTMAggregatedStats }) {
  // 1. State management for date selection
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(0) // 0 = "Entire Year"
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  // Seed with the all-time prop so the dashboard renders immediately; the period effect then
  // replaces it with data filtered to the selected month/year.
  const [currentData, setCurrentData] = useState<IUTMAggregatedStats | null>(() =>
    utmStatsResponse.totalVisits > 0 ? utmStatsResponse : null,
  )
  const [forceRender, setForceRender] = useState(0) // Force re-render trigger

  // 2. Whenever the selected period changes (incl. mount), fetch stats filtered to that period.
  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      const response = await selectDBUTMStatsAction({ year: selectedYear, month: selectedMonth })
      if (cancelled) return

      // On a server error, fall back to whatever we already had (or the initial prop).
      const resolved = typeof response === "string" ? null : response
      const nextData = resolved ?? (utmStatsResponse.totalVisits > 0 ? null : getMockData(selectedYear, selectedMonth))
      if (nextData) setCurrentData(nextData)
      setIsAnimating(false)
      setForceRender(prev => prev + 1)
    }

    loadStats()
    return () => {
      cancelled = true
    }
  }, [selectedYear, selectedMonth, utmStatsResponse])

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

  // 3. Date handling functions
  const months = [
    "Entire Year",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, i) => currentYear - i)

  const handleDateChange = (year: number, month: number) => {
    setIsAnimating(true)
    setSelectedYear(year)
    setSelectedMonth(month)
    setIsDatePickerOpen(false)
    // The period effect re-fetches filtered stats and clears isAnimating when it resolves.
  }

  // 5. Empty state component
  const EmptyState = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-[300px] text-subTitle">
      <IoTrendingUp className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">No data available</p>
      <p className="text-sm opacity-75">{title} data will appear here</p>
    </div>
  )

  // Don't render until data is loaded
  if (!currentData) return null

  const stats = currentData
  const topCountries = stats.countryStats.slice(0, 8)
  const topLocations = stats.locationStats.slice(0, 6)

  return (
    <div className="min-h-screen bg-background p-4 mobile:p-6">
      <motion.div
        key={forceRender} // Force re-render when this changes
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto">
        {/* Header with Date Picker */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-col mobile:flex-row mobile:items-center mobile:justify-between gap-4">
            <div>
              <h1 className="text-3xl mobile:text-4xl font-bold text-title mb-2">UTM Analytics Dashboard</h1>
              <p className="text-subTitle">
                Track your marketing campaign performance {utmStatsResponse.totalVisits === 0 ? "(mock data)" : ""}
              </p>
            </div>

            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="bg-brand text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow">
                <IoCalendar className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {months[selectedMonth]} {selectedYear}
                </span>
                <IoChevronDown
                  className={`w-4 h-4 text-foreground transition-transform ${isDatePickerOpen ? "rotate-180" : ""}`}
                />
              </motion.button>

              <AnimatePresence>
                {isDatePickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 bg-foreground border border-border-color rounded-lg shadow-xl z-50 min-w-[200px]">
                    <div className="p-4">
                      <div className="mb-4">
                        <label className="text-xs font-medium text-subTitle mb-2 block">Year</label>
                        <div className="grid grid-cols-3 gap-1">
                          {years.map(year => (
                            <button
                              key={year}
                              onClick={() => handleDateChange(year, selectedMonth)}
                              className={`px-2 py-1 text-sm rounded transition-colors ${
                                year === selectedYear ? "bg-brand text-white" : "text-title hover:bg-active-color"
                              }`}>
                              {year}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-subTitle mb-2 block">Period</label>
                        <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-border-color scrollbar-track-transparent">
                          {months.map((month, index) => (
                            <button
                              key={index}
                              onClick={() => handleDateChange(selectedYear, index)}
                              className={`px-2 py-1 text-sm text-left rounded transition-colors ${
                                index === selectedMonth ? "bg-brand text-white" : "text-title hover:bg-active-color"
                              }`}>
                              {month}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 mobile:grid-cols-2 laptop:grid-cols-5 gap-4 mobile:gap-6 mb-8">
          {[
            {
              title: "Total Visits",
              value: stats.totalVisits,
              bgClass: "bg-brand",
              titleClass: "text-foreground",
              numberClass: "text-foreground",
            },
            {
              title: "Unique Users",
              value: stats.uniqueUsers,
              bgClass: "bg-foreground text-title border border-border-color",
            },
            {
              title: "Recent Visits (30d)",
              value: stats.recentVisits,
              bgClass: "bg-info text-white",
              numberClass: "text-foreground",
            },
            {
              title: "Campaigns",
              value: stats.campaignStats.length,
              bgClass: "bg-foreground text-title border border-border-color",
            },
            {
              title: "Countries",
              value: stats.countryStats.length,
              bgClass: "bg-foreground text-title border border-border-color",
            },
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              className={`${metric.bgClass} p-4 mobile:p-6 rounded-xl shadow-lg`}>
              <h3 className={`${metric.titleClass} text-xs mobile:text-sm font-medium opacity-90`}>{metric.title}</h3>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className={`${metric.numberClass} text-2xl mobile:text-3xl font-bold mt-2`}>
                {isAnimating ? "..." : metric.value.toLocaleString()}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Grid */}
        <motion.div className="grid grid-cols-1 laptop:grid-cols-2 gap-6 mobile:gap-8">
          {/* UTM Sources Chart */}
          <motion.div
            variants={itemVariants}
            className="bg-foreground border border-border-color p-4 mobile:p-6 rounded-xl shadow-lg">
            <h3 className="text-lg mobile:text-xl font-bold text-title mb-4">Traffic Sources</h3>
            {stats.sourceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.sourceStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color) / 0.3)" />
                  <XAxis dataKey="name" stroke="hsl(var(--subTitle))" fontSize={12} />
                  <YAxis stroke="hsl(var(--subTitle))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--foreground))",
                      border: "1px solid hsl(var(--border-color))",
                      borderRadius: "8px",
                      color: "hsl(var(--title))",
                    }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Traffic sources" />
            )}
          </motion.div>

          {/* UTM Medium Pie Chart */}
          <motion.div
            variants={itemVariants}
            className="bg-foreground border border-border-color p-4 mobile:p-6 rounded-xl shadow-lg">
            <h3 className="text-lg mobile:text-xl font-bold text-title mb-4">Traffic Medium</h3>
            {stats.mediumStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.mediumStats}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    labelLine={false}
                    label={(props: any) => {
                      const percent = props.percent || 0
                      return `${props.name}: ${(percent * 100).toFixed(0)}%`
                    }}>
                    {stats.mediumStats.map((_, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--foreground))",
                      border: "1px solid hsl(var(--border-color))",
                      borderRadius: "8px",
                      color: "hsl(var(--title))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Traffic medium" />
            )}
          </motion.div>
        </motion.div>

        <motion.div className="grid grid-cols-1 laptop:grid-cols-2 gap-6 mobile:gap-8 mt-6 mobile:mt-8">
          <motion.div
            variants={itemVariants}
            className="bg-foreground border border-border-color p-4 mobile:p-6 rounded-xl shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-brand/15 p-2 text-brand">
                <IoGlobeOutline className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg mobile:text-xl font-bold text-title">Visitor Countries</h3>
                <p className="text-sm text-subTitle">Geographic traffic based on edge headers</p>
              </div>
            </div>
            {topCountries.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topCountries} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color) / 0.3)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--subTitle))" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    stroke="hsl(var(--subTitle))"
                    fontSize={12}
                    tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 16)}...` : value)}
                  />
                  <Tooltip
                    formatter={(value: number | string | undefined) => [`${Number(value || 0).toLocaleString()} visits`, "Traffic"]}
                    labelFormatter={(_, payload) => {
                      const country = payload?.[0]?.payload as IUTMCountryStat | undefined
                      return country ? `${getCountryFlag(country.code)} ${country.name}` : "Country"
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--foreground))",
                      border: "1px solid hsl(var(--border-color))",
                      borderRadius: "8px",
                      color: "hsl(var(--title))",
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Country" />
            )}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-foreground border border-border-color p-4 mobile:p-6 rounded-xl shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-info/15 p-2 text-info">
                <IoLocationOutline className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg mobile:text-xl font-bold text-title">Where Visitors Come From</h3>
                <p className="text-sm text-subTitle">Top locations ranked by visit share</p>
              </div>
            </div>
            {topLocations.length > 0 ? (
              <div className="space-y-4">
                {topLocations.map((location, index) => {
                  const share = stats.totalVisits > 0 ? Math.round((location.count / stats.totalVisits) * 100) : 0

                  return (
                    <motion.div
                      key={`${location.name}-${index}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="rounded-xl border border-border-color/70 bg-background/50 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-title">
                            {getCountryFlag(location.countryCode)} {location.name}
                          </p>
                          <p className="text-sm text-subTitle">{location.country || "Unknown country"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-title">{location.count.toLocaleString()}</p>
                          <p className="text-xs text-subTitle">{share}% of visits</p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-border-color/30">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-info"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(share, 4)}%` }}
                          transition={{ delay: 0.15 + index * 0.08, duration: 0.45 }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="Location" />
            )}
          </motion.div>
        </motion.div>

        {/* Daily Visits Chart - Full Width */}
        <motion.div
          variants={itemVariants}
          className="bg-foreground border border-border-color p-4 mobile:p-6 rounded-xl shadow-lg mt-6 mobile:mt-8">
          <DailyVisitsChart data={stats.chartData || []} />
        </motion.div>
      </motion.div>
    </div>
  )
}
