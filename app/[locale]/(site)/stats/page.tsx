import { UTMDashboard } from "./components/UTMDashboard"
import { utmSDK } from "@/sdk/UTMSDK/UTMSDK"

export default async function StatsPage() {
  let utmStatsResponse
  try {
    utmStatsResponse = await utmSDK.selectDBUTMStats()
  } catch (error) {
    return <h1 className="text-danger text-2xl">{error instanceof Error ? error.message : String(error)}</h1>
  }

  return (
    <div className="w-full max-h-[calc(100vh-64px)] min-h-[calc(100vh-64px)] overflow-y-scroll bg-background p-4 md:p-8">
      <UTMDashboard utmStatsResponse={utmStatsResponse} />
    </div>
  )
}
