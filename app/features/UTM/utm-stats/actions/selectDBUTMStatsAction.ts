"use server"

import { selectDBUTMStats } from "@/api/utm/select/selectDBUTMStats"
import { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"

export async function selectDBUTMStatsAction(): Promise<IUTMAggregatedStats | string> {
  return selectDBUTMStats()
}
