import { getI18n } from "@/locales/server"
import { UTMDashboard } from "./components/UTMDashboard"
import { selectDBUTMStatsAction } from "./actions/selectDBUTMStatsAction"

export default async function StatsPage() {
  const t = await getI18n()

  const utmStatsResponse = await selectDBUTMStatsAction()

  if (typeof utmStatsResponse === "string") return <h1 className="text-danger text-2xl">{utmStatsResponse}</h1>

  return (
    <div className="w-full max-h-[calc(100vh-64px)] min-h-[calc(100vh-64px)] overflow-y-scroll bg-background p-4 md:p-8">
      <UTMDashboard utmStatsResponse={utmStatsResponse} />
    </div>
  )
}
