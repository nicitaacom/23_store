import moment from "moment-timezone"
import { TRateLimiterName } from "./types/TRateLimiterName"

type Action = API.RateLimitRequest["action"]

export class RateLimitSDK {
  async rateLimit(limiterName: TRateLimiterName): Promise<API.RateLimitResponse> {
    return this.requestFn("rateLimit", limiterName)
  }

  async getRemaining(limiterName: TRateLimiterName): Promise<API.RateLimitResponse> {
    return this.requestFn("getRemaining", limiterName)
  }

  private async requestFn(action: Action, limiterName: TRateLimiterName): Promise<API.RateLimitResponse> {
    // 1. get timezone
    const userTimezone = moment.tz.guess()

    // 2. send request
    const response = await fetch("/api/rate-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        limiterName,
        userTimezone,
      } satisfies API.RateLimitRequest),
    })

    // 3. handle errors
    if (response.status === 429) throw new Error("Rate limit exceeded")
    if (!response.ok) throw new Error("Rate limit request failed")

    // 4. return parsed result
    return (await response.json()) as API.RateLimitResponse
  }
}
