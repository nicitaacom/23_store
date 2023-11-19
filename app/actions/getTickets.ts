import { ITicket } from "@/interfaces/ITicket"
import supabaseAdmin from "@/libs/supabaseAdmin"

const getTickets = async () => {
  const { data: tickets_response, error: tickets_error } = await supabaseAdmin.from("tickets").select("*")

  if (tickets_error) {
    console.log(6, "messages_error - ", tickets_error)
    throw tickets_error
  }

  return tickets_response as ITicket[]
}

export default getTickets
