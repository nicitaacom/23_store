import { getUserId } from "@/utils/getUserId"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"

// Reuse the selected ticket ID request within this module
let ticketIdRequest: Promise<string | undefined> | null = null

async function selectTicketId(): Promise<string | undefined> {
  const userId = getUserId()
  if (!userId) return undefined
  if (userId.includes("anonymousId")) return userId

  if (ticketIdRequest) return ticketIdRequest

  ticketIdRequest = (async () => {
    try {
      return supportSDK.getTicketId({ userId })
    } catch (error) {
      console.error(33, "error - ", error)
      return crypto.randomUUID()
    }
  })()

  return ticketIdRequest
}

export default selectTicketId
