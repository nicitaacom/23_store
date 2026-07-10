import { ITicketDB } from "@/ts/support/ITicketDB"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

async function getInitialTickets() {
  const { data: tickets_response, error: tickets_error } = await supabaseAdmin
    .from("23_tickets")
    .select("*, 23_messages(created_at)")
    .eq("is_open", true)
    .order("created_at", { referencedTable: "23_messages", ascending: false })
    .limit(1, { referencedTable: "23_messages" })

  if (tickets_error) {
    console.log(6, "tickets error - ", tickets_error)
    throw tickets_error
  }

  return tickets_response.map(row => {
    const { "23_messages": lastMessages, ...ticket } = row as ITicketDB & { "23_messages"?: { created_at: string }[] }
    return { ...ticket, last_message_at: lastMessages?.[0]?.created_at ?? row.created_at } satisfies ITicketDB
  })
}

export default getInitialTickets
