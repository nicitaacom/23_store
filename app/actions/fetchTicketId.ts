import { cache } from "react"
import axios from "axios"

import { TAPITicketGetTicketIdRequest, TAPITicketGetTicketIdResponse } from "@/api/ticket/get-ticket-id/route"
import { getUserId } from "@/utils/getUserId"

const fetchTicketIdCache = cache(async (userId: string) => {
  const ticket_id: TAPITicketGetTicketIdResponse = await axios.post("/api/ticket/get-ticket-id", {
    userId,
  } as TAPITicketGetTicketIdRequest)
  return ticket_id.data.ticket_id
})

// I getTicketId to subscribe pusher to this channelId (ticketId) to get live-update
const fetchTicketId = async (): Promise<string | undefined> => {
  const userId = getUserId()
  if (!userId) return undefined

  try {
    // 1 user may have only 1 open ticket - that's why single()
    // TODO - its should work wrong if user authenticated because you select ticket .eq owner_username that equals userId
    // so owner_username will always not match user_id that's why you always get new ticketId after page reloading
    const ticket_id = await fetchTicketIdCache(userId)
    if (ticket_id) {
      // Return the existing open ticketId
      return ticket_id
    } else {
      // please don't return any ticketId here because so you will create ticketId in store and it will be used in future
      // I create ticketId (in store and DB) only when user send first message
    }
  } catch (error) {
    console.error(36, "Error - ", error)
    return crypto.randomUUID()
  }
}

export default fetchTicketId

/** to mark ticket as closed
 const { data, error } = await supabaseAdmin
  .from("tickets")
  .update({ is_open: false })
  .eq("owner_id", userSessionData.session?.user.id)
  .eq("ticket_id", "your-ticket-id-here")
  .eq("is_open", true);
 */
