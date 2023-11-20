import supabaseAdmin from "@/libs/supabaseAdmin"
import supabaseServer from "@/libs/supabaseServer"
import { getCookie } from "@/utils/helpersSSR"

// I getTicketId to subscribe pusher to this channelId (ticketId) to get live-update
const getTicketId = async () => {
  const {
    data: { user },
    error: user_user_error,
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
      // return null because I want to create ticket only on first message
      return null
    }
  } catch (error) {
    console.error(36, "Error - ", error)
    return null
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
