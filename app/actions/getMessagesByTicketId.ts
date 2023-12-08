import supabaseAdmin from "@/libs/supabaseAdmin"

const getInitialMessagesByTicketId = async (ticketId: string) => {
  // Check is this ticket closed
  const { data: is_closed_response, error: is_closed_error } = await supabaseAdmin
    .from("tickets")
    .select("is_open")
    .eq("id", ticketId)
    .single()
  if (is_closed_error) {
    console.log(8, "is_closed_error - ", is_closed_error)
    throw is_closed_error
  }
  if (is_closed_response.is_open === false) {
    return "this ticket is closed"
  }

  const { data: messages_by_id_response, error: messages_by_id_error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
  if (messages_by_id_error) console.log(8, "messages_by_id_error - ", messages_by_id_error)
  if (messages_by_id_response?.length === 0 || messages_by_id_response === null) return []
  return messages_by_id_response
}
export default getInitialMessagesByTicketId
