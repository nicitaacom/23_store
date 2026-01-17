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

  // /api/coinmarketcap
  type CoinmarketcapRequest = {
    amount: number
    symbol: string
    convert: string
  }

  type TCurrencyQuote = {
    id: number
    symbol: string
    name: string
    amount: number
    last_updated: string
    quote: {
      [currency: string]: {
        price: number
        last_updated: string
      }
    }
  }

  type CoinmarketcapResponse = {
    status: {
      timestamp: string
      error_code: number
      error_message: string | null
      elapsed: number
      credit_count: number
      notice: string | null
    }
    data: TCurrencyQuote[]
  }

  // /api/telegram
  type TelegramRequest = {
    message: string
  }

  type TelegramResponse = {
    data: any
    status: number
    statusText: string
  }
}
