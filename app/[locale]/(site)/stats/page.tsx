import { selectDBUTMStatsAction } from "./actions/selectDBUTMStatsAction"
import { UTMDashboard } from "./components/UTMDashboard"

export default async function UTMStatsPage() {
  const selectDBUTMStatsActionResp = await selectDBUTMStatsAction()

  if (typeof selectDBUTMStatsActionResp === "string") return <h1 className="text-danger text-2xl">{selectDBUTMStatsActionResp}</h1>
  else return <UTMDashboard utmStatsResponse={selectDBUTMStatsActionResp} />
}
