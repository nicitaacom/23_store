// DO NOT import anything here

declare module API {
  // /api/rateLimit
  type RateLimitRequest = {
    limiterName: string
    action: "getRemaining" | "rateLimit"
    userTimezone: string
  }

  type RateLimitResponse = {
    remaining: number
    resetTime: string
  }
}
