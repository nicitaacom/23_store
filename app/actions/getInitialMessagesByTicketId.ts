import { IMessage } from "@/interfaces/support/IMessage"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

const getInitialMessagesByTicketId = async (ticketId: string): Promise<IMessage[]> => {
  const { data: messages_by_id_response, error: messages_by_id_error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("ticket_id", ticketId)
  if (messages_by_id_error) console.log(messages_by_id_error.message)
  if (!messages_by_id_response || messages_by_id_response.length === 0) return []
  return messages_by_id_response
}
export default getInitialMessagesByTicketId
