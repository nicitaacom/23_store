import { UTMDashboard } from "./components/UTMDashboard"
import { selectDBUTMStats } from "@/api/utm/select/selectDBUTMStats"

export default async function StatsPage() {
  let utmStatsResponse: Awaited<ReturnType<typeof selectDBUTMStats>>
  try {
    utmStatsResponse = await selectDBUTMStats()
  } catch (error) {
    return <h1 className="p-4 text-2xl text-danger">Failed to load stats dashboard.</h1>
  }

  if (typeof utmStatsResponse === "string") return <h1 className="p-4 text-2xl text-danger">Failed to load stats dashboard.</h1>

  return (
    <div className="w-full max-h-[calc(100vh-64px)] min-h-[calc(100vh-64px)] overflow-y-scroll bg-background p-4 md:p-8">
      <UTMDashboard utmStatsResponse={utmStatsResponse} />
    </div>
  )
}
