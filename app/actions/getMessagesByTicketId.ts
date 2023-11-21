import supabaseServer from "@/libs/supabaseServer"

const getMessagesByTicketId = async (ticketId: string) => {
  const { data: messages_by_id_response, error: messages_by_id_error } = await supabaseServer()
    .from("messages")
    .select("*")
    .eq("ticket_id", ticketId)
  if (messages_by_id_error) console.log(8, "messages_by_id_error - ", messages_by_id_error)
  return messages_by_id_response
}
export default getMessagesByTicketId
