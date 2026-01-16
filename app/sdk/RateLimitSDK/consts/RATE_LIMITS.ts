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
} as const
