import { ITicket } from "@/interfaces/support/ITicket"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

const getInitialTickets = async () => {
  const { data: tickets_response, error: tickets_error } = await supabaseAdmin
    .from("tickets")
    .select("*")
    .eq("is_open", true)

  if (tickets_error) {
    console.log(6, "tickets error - ", tickets_error)
    throw tickets_error
  }

  return tickets_response as ITicket[]
}

export default getInitialTickets
