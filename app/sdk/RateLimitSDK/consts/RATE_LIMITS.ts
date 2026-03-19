export const RATE_LIMITS = {
  newMessage: {
    windowSec: 60,
    maxAllowed: 8, // 8 per minute
    key: () => `message:new`,
  },
  newTicket: {
    windowSec: 86400,
    maxAllowed: 5, // 5 per day
    key: () => `ticket:new`,
  },
  aiPrompt: {
    windowSec: 3600,
    maxAllowed: 100, // 100 per hour
    key: () => `ai:text`,
  },
  aiGenerateImage: {
    windowSec: 3600,
    maxAllowed: 10, // 10 per hour
    key: () => `ai:image`,
  },
  requestBetterPrices: {
    windowSec: 86400,
    maxAllowed: 2, // 2 per day
    key: () => `request:betterPrices`,
  },
} as const
