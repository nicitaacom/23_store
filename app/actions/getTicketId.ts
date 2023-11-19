import supabaseAdmin from "@/libs/supabaseAdmin"
import supabaseServer from "@/libs/supabaseServer"
import { getCookie } from "@/utils/helpersSSR"

const getTicketId = async () => {
  const { data: userSessionData, error: userSessionError } = await supabaseServer().auth.getSession()

  if (userSessionError) throw new Error("getTicketId error - ", userSessionError)

  const userId =
    userSessionData.session?.user.id === undefined ? getCookie("anonymousId")?.value : userSessionData.session?.user.id

  try {
    const { data: ticket_id, error } = await supabaseAdmin
      .from("tickets")
      .select("id")
      .eq("owner_username", userId as string)
      .eq("is_open", true)

    if (error) {
      console.error("Error fetching ticketId - ", error)
      return null
    }

    if (ticket_id && ticket_id.length > 0) {
      // Return the existing open ticketId
      return ticket_id[0].id
    } else {
      //return value from cookies if no coversationId (I create cookie for coversationId in Layout.tsx)
      return getCookie("ticketId")?.value
    }
  } catch (error) {
    console.error("Error - ", error)
    return null
  }
}

export default getTicketId

/** to mark ticket as closed
 const { data, error } = await supabaseAdmin
  .from("tickets")
  .update({ is_open: true })
  .eq("sender_id", userSessionData.session?.user.id)
  .eq("ticket_id", "your-ticket-id-here")
  .eq("is_open", false);
 */
