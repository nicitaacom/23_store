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
  authPer15Min: {
    windowSec: 900, // 15 minutes
    maxAllowed: 5, // up to 5 attempts per 15 min
    key: (userId: string) => `auth:15min:${userId}`,
  },
  authPerDay: {
    windowSec: 86400, // 24 hours
    maxAllowed: 50, // up to 50 attempts per day
    key: (userId: string) => `auth:day:${userId}`,
  },
} as const
