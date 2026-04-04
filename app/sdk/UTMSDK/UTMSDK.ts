import { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"
import { BaseSDK } from "@/sdk/BaseSDK"

export class UTMSDK extends BaseSDK {
  async trackVisit(request: API.UTMTrackVisitRequest) {
    return this.postJson<API.UTMTrackVisitRequest, API.UTMTrackVisitResponse>(
      "/api/utm/track",
      request satisfies API.UTMTrackVisitRequest,
    )
  }

  async selectDBUTMStats() {
    return this.getJson<IUTMAggregatedStats>("/api/utm/select")
  }
}

export const utmSDK = new UTMSDK()
