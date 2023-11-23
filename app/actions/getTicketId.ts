import supabaseAdmin from "@/libs/supabaseAdmin"
import supabaseServer from "@/libs/supabaseServer"
import { getCookie } from "@/utils/helpersSSR"

// I getTicketId to subscribe pusher to this channelId (ticketId) to get live-update
const getTicketId = async () => {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()

  const userId = user?.id === undefined ? getCookie("anonymousId")?.value : user.id

  try {
    // 1 user may have only 1 open ticket - that's why single()
    const { data: ticket_id } = await supabaseAdmin
      .from("tickets")
      .select("id")
      .eq("owner_username", userId as string)
      .eq("is_open", true)
      .single()

    if (ticket_id) {
      // Return the existing open ticketId
      return ticket_id.id
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

export default getTicketId

/** to mark ticket as closed
 const { data, error } = await supabaseAdmin
  .from("tickets")
  .update({ is_open: false })
  .eq("owner_id", userSessionData.session?.user.id)
  .eq("ticket_id", "your-ticket-id-here")
  .eq("is_open", true);
 */
