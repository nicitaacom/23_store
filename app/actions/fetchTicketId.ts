import { getUserId } from "@/utils/getUserId"
import { TAPITicketGetTicketIdData, TAPITicketGetTicketIdRequest } from "@/api/ticket/get-ticket-id/route"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

// simple in-memory cache (browser + server safe)
let ticketIdPromiseCache: Promise<string | undefined> | null = null

const fetchTicketId = async (): Promise<string | undefined> => {
  const userId = getUserId()
  if (!userId) return undefined
  if (userId.includes("anonymousId")) return userId

  if (ticketIdPromiseCache) return ticketIdPromiseCache

  ticketIdPromiseCache = (async () => {
    try {
      const response = await fetch("/api/ticket/get-ticket-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
        } satisfies TAPITicketGetTicketIdRequest),
      })

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response))
      }

      const data = (await response.json()) as TAPITicketGetTicketIdData | ""

      return typeof data === "string" ? undefined : data.ticket_id ?? undefined
    } catch (error) {
      console.error(33, "error - ", error)
      return crypto.randomUUID()
    }
  })()

  return ticketIdPromiseCache
}

export default fetchTicketId
