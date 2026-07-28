// DO NOT import anything here

declare namespace API {
  // /api/ai/generate-image
  type GenerateImageRequest = { prompt: string }
  type GenerateImageResponse = ArrayBuffer

  // api/ai/sales-assistant
  type AISalesAssistantDebugMessage = { role: "user" | "assistant"; content: string }
  type AISalesAssistantDebug = {
    semanticContext: string
    recentMessages: AISalesAssistantDebugMessage[]
    recentSource: "upstash" | "browser-fallback" | "merged"
    pineconeMatches: Array<{
      kind: "message" | "working-memory"
      role: "user" | "assistant" | "system"
      text: string
    }>
  }
  type AISalesAssistantRequest = { promptValue: string; memory: string; conversationHistory: TAIChatMessage[] }
  type AISalesAssistantResponse = { openai: Record<string, unknown>; memory: string; debug?: AISalesAssistantDebug }
  type AISalesAssistantMemoryRequest = { userPrompt: string; assistantReply: string; memory: string }
  type AISalesAssistantMemoryResponse = { memory: string; error?: string }

  // api/ai/
  type AIRequest = { prompt: string }
  type AIResponse = { aiMessage: string }

  // /api/ai/check-print-area
  type AIRect = { leftPct: number; topPct: number; widthPct: number; heightPct: number }
  type AICheckPrintAreaRequest = {
    mockupUrl: string
    mockupRect: AIRect
    printArea: { widthMm: number; heightMm: number }
  }
  type AICheckPrintAreaResponse =
    | {
        isMatching: boolean
        /** the printable surface the model found, in % of the mockup - null when it found none */
        productRect: AIRect | null
        coveragePct: number
        spillPct: number
      }
    | { error: string }

  // /api/rateLimit
  type RateLimitRequest = {
    limiterName: string
    action: "getRemaining" | "rateLimit"
    userTimezone: string
    userId: string
  }

  type RateLimitResponse = {
    remaining: number
    resetTime: string
  }

  // /api/account/avatar
  type UpdateAvatarRequest = {
    avatarUrl: string
  }

  type UpdateAvatarResponse = {
    avatarUrl: string
    resolvedAvatarUrl: string
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
    data: unknown
    status: number
    statusText: string
  }
}
