import axios from "axios"
import { getUserId } from "@/utils/getUserId"
import { TAPITicketGetTicketIdRequest, TAPITicketGetTicketIdResponse } from "@/api/ticket/get-ticket-id/route"

// simple in-memory cache (browser + server safe)
let ticketIdPromiseCache: Promise<string | undefined> | null = null

const fetchTicketId = async (): Promise<string | undefined> => {
  const userId = getUserId()
  if (!userId) return undefined
  if (userId.includes("anonymousId")) return userId

  if (ticketIdPromiseCache) return ticketIdPromiseCache

  ticketIdPromiseCache = (async () => {
    try {
      const response: TAPITicketGetTicketIdResponse = await axios.post("/api/ticket/get-ticket-id", {
        userId,
      } satisfies TAPITicketGetTicketIdRequest)

      return response.data?.ticket_id ?? undefined
    } catch (error) {
      console.error(33, "error - ", error)
      return crypto.randomUUID()
    }
  })()

  return ticketIdPromiseCache
}

export default fetchTicketId
