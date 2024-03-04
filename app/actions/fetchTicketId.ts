import { getCookie } from "@/utils/helpersCSR"
import { cache } from "react"
import { TAPITicketGetTicketIdRequest, TAPITicketGetTicketIdResponse } from "@/api/ticket/get-ticket-id/route"
import axios from "axios"
import supabaseClient from "@/libs/supabase/supabaseClient"

const fetchTicketIdCache = cache(async (userId: string) => {
  const ticket_id: TAPITicketGetTicketIdResponse = await axios.post("/api/ticket/get-ticket-id", {
    userId,
  } as TAPITicketGetTicketIdRequest)
  return ticket_id.data.ticket_id
})

// I getTicketId to subscribe pusher to this channelId (ticketId) to get live-update
const fetchTicketId = async (): Promise<string> => {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()
  const userId = user?.id ? user.id : getCookie("anonymousId")
  if (!userId) return ""

  try {
    // 1 user may have only 1 open ticket - that's why single()
    // TODO - its should work wrong if user authenticated because you select ticket .eq owner_username that equals userId
    // so owner_username will always not match user_id that's why you always get new ticketId after page reloading
    const ticket_id = await fetchTicketIdCache(userId)
    if (ticket_id) {
      // Return the existing open ticketId
      return ticket_id
    } else {
      // return ticket id because if return null I don't subscribe pusher to this channel
      // I still can send telegram message on first message in messages.length === 0
      return crypto.randomUUID()
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
