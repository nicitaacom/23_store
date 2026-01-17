// DO NOT import anything here

declare module API {
  // /api/ai/generate-image
  type GenerateImageRequest = { prompt: string }
  type GenerateImageResponse = ArrayBuffer

  // api/ai
  type AIRequest = { promptValue: string; memory: string }
  type AIResponse = { openai: string; memory: string }

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
