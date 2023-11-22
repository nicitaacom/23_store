import supabaseAdmin from "@/libs/supabaseAdmin"

const getInitialMessagesByTicketId = async (ticketId: string) => {
  const { data: messages_by_id_response, error: messages_by_id_error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("ticket_id", ticketId)
  if (messages_by_id_error) console.log(8, "messages_by_id_error - ", messages_by_id_error)
  if (messages_by_id_response?.length === 0 || messages_by_id_response === null) return []
  return messages_by_id_response
}
export default getInitialMessagesByTicketId
