import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { getUserId } from "@/utils/getUserId"

// simple in-memory cache (browser + server safe)
let ticketIdPromiseCache: Promise<string | undefined> | null = null

const fetchTicketId = async (): Promise<string | undefined> => {
  const userId = getUserId()
  if (!userId) return undefined
  if (userId.includes("anonymousId")) return userId

  if (ticketIdPromiseCache) return ticketIdPromiseCache

  ticketIdPromiseCache = (async () => {
    try {
      return supportSDK.getTicketId({ userId })
    } catch (error) {
      console.error(33, "error - ", error)
      return crypto.randomUUID()
    }
  })()

  return ticketIdPromiseCache
}

export default fetchTicketId
