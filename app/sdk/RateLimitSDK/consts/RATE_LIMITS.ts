export const RATE_LIMITS = {
  localePage: {
    windowSec: 60,
    maxAllowed: 10, // 10 locale-page requests per minute per IP
    key: () => `page:locale`,
  },
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
    key: () => `ai:prompt`,
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
  utmVisit: {
    windowSec: 86400,
    maxAllowed: 1, // 1 tracked visit per UTC day per user/anonymousId
    key: (userId: string) => `utm:visit:${userId}`,
  },
  utmVisitIp: {
    windowSec: 86400,
    maxAllowed: 4, // cap noisy anonymous traffic from the same IP - 4 visits per day from same IP
    key: (ip: string) => `utm:visit:ip:${ip}`,
  },
} as const
