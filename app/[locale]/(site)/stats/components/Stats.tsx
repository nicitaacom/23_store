// app/stats/components/Stats.tsx
"use client"

import CountUp from "react-countup"
import { motion } from "framer-motion"
import { FaGoogle, FaTwitter, FaFacebookF, FaTiktok, FaLink } from "react-icons/fa"
import React from "react"
import { useScopedI18n } from "@/locales/client"

type StatsResponse = {
  stats:
    | {
        clicks: number
        created_at: string
        id: string
        utm_source: string
      }[]
    | null
}

// Map UTM sources to icons and colors
const sourceConfig = (source: string) => {
  const lowerSource = source.toLowerCase()

  if (lowerSource.includes("google"))
    return {
      icon: <FaGoogle className="text-blue-500" />,
      color: "bg-blue-500/10",
      name: "Google",
      barColor: "bg-blue-500",
    }
  if (lowerSource.includes("twitter"))
    return {
      icon: <FaTwitter className="text-sky-400" />,
      color: "bg-sky-400/10",
      name: "Twitter",
      barColor: "bg-sky-400",
    }
  if (lowerSource.includes("facebook"))
    return {
      icon: <FaFacebookF className="text-blue-600" />,
      color: "bg-blue-600/10",
      name: "Facebook",
      barColor: "bg-blue-600",
    }
  if (lowerSource.includes("tiktok"))
    return {
      icon: <FaTiktok className="text-black dark:text-foreground" />,
      color: "bg-foreground/10",
      name: "TikTok",
      barColor: "bg-foreground",
    }

  return {
    icon: <FaLink className="text-info" />,
    color: "bg-info/10",
    name: source,
    barColor: "bg-info",
  }
}

export function Stats({ stats }: StatsResponse) {
  const totalClicks = stats?.reduce((sum, stat) => sum + stat.clicks, 0) || 1 // Ensure never zero
  const t = useScopedI18n("stats")

  // Calculate percentages
  const statsWithPercentage =
    stats
      ?.map(stat => ({
        ...stat,
        percentage: totalClicks ? (stat.clicks / totalClicks) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage) || []

  return (
    <div className="w-full overflow-y-auto">
      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-foreground rounded-xl p-4 tablet:p-6 shadow-lg mb-4 tablet:mb-6">
        <div className="flex flex-col mobile:flex-row mobile:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand/10 p-2 mobile:p-3 rounded-full">
              <div className="bg-brand p-1.5 mobile:p-2 rounded-full text-title-foreground">
                <FaLink size={16} className="mobile:size-5" />
              </div>
            </div>
            <div>
              <h2 className="text-lg mobile:text-xl font-bold text-title">{t("total_campaign_clicks")}</h2>
              <p className="text-subTitle text-sm mobile:text-base">{t("across_all_sources")}</p>
            </div>
          </div>

          <div className="text-3xl mobile:text-4xl laptop:text-5xl font-bold text-brand">
            <CountUp end={totalClicks} duration={3} separator="," />
          </div>
        </div>
      </motion.div>

      {/* Percentage Distribution Header */}
      <div className="mb-4 tablet:mb-6">
        <h3 className="text-xl mobile:text-2xl font-bold text-title mb-3 tablet:mb-4">{t("traffic_distribution")}</h3>

        {/* Progress Bar Container */}
        <div className="w-full bg-background rounded-full h-3 mobile:h-4 mb-4 tablet:mb-6 overflow-hidden">
          {statsWithPercentage.map((stat, index) => {
            const config = sourceConfig(stat.utm_source)
            return (
              <motion.div
                key={stat.id}
                initial={{ width: 0 }}
                animate={{ width: `${stat.percentage}%` }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                className={`h-full ${config.barColor} inline-block`}
                style={{ marginLeft: index === 0 ? 0 : "-0.25rem" }}
              />
            )
          })}
        </div>
      </div>

      {/* Individual Source Cards */}
      <div className="grid grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 gap-3 tablet:gap-4">
        {statsWithPercentage.map((stat, index) => {
          const config = sourceConfig(stat.utm_source)

          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-foreground rounded-xl p-4 tablet:p-6 shadow-lg ${config.color}`}>
              <div className="flex justify-between items-start mb-3 tablet:mb-4">
                <div className="flex items-center gap-2 tablet:gap-3">
                  <div className="bg-background p-2 tablet:p-3 rounded-lg">
                    {React.cloneElement(config.icon, {
                      className: `${config.icon.props.className} size-4 tablet:size-5`,
                    })}
                  </div>
                  <h3 className="text-base tablet:text-lg font-bold text-title">{config.name}</h3>
                </div>
                <span className="text-subTitle text-xs tablet:text-sm">{new Date(stat.created_at).toLocaleDateString()}</span>
              </div>

              <div className="mb-3 tablet:mb-4">
                <div className="flex justify-between items-center mb-1 tablet:mb-2">
                  <div className="text-xl tablet:text-2xl font-bold text-title">
                    <CountUp end={stat.clicks} duration={3} delay={0.2} separator="," />
                  </div>
                  <div className="text-lg tablet:text-xl font-bold text-title">
                    <CountUp end={stat.percentage} duration={2} decimals={1} suffix="%" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-background rounded-full h-1.5 tablet:h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.percentage}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full ${config.barColor}`}
                  />
                </div>
              </div>

              <div className="pt-2 tablet:pt-3 border-t border-border-color">
                <div className="flex justify-between text-subTitle text-sm tablet:text-base">
                  <span>{t("performance")}:</span>
                  <span
                    className={`font-bold ${
                      stat.percentage > 40 ? "text-success" : stat.percentage > 20 ? "text-warning" : "text-danger"
                    }`}>
                    {stat.percentage > 40 ? "Excellent" : stat.percentage > 20 ? "Good" : "Needs improvement"}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
