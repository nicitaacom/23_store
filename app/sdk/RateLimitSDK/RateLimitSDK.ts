import moment from "moment-timezone"
import { TRateLimiterName } from "./types/TRateLimiterName"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getUserId } from "@/utils/getUserId"

type Action = API.RateLimitRequest["action"]

export class RateLimitSDK {
  async rateLimit(t: TI18nFunction, limiterName: TRateLimiterName): Promise<API.RateLimitResponse> {
    return this.requestFn(t, "rateLimit", limiterName)
  }

  async getRemaining(t: TI18nFunction, limiterName: TRateLimiterName): Promise<API.RateLimitResponse> {
    return this.requestFn(t, "getRemaining", limiterName)
  }

  private async requestFn(t: TI18nFunction, action: Action, limiterName: TRateLimiterName): Promise<API.RateLimitResponse> {
    // 1. get timezone
    const userTimezone = moment.tz.guess()
    const userId = getUserId()

    // 2. send request
    const response = await fetch("/api/rate-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        limiterName,
        userTimezone,
        userId,
      } satisfies API.RateLimitRequest),
    })

    // 3. handle errors
    if (response.status === 429) throw new Error(t("sdk.rate_limit_exeeded"))
    if (!response.ok) throw new Error(t("sdk.rate_limit_request_failed"))

    // 4. return parsed result
    return (await response.json()) as API.RateLimitResponse
  }
}
