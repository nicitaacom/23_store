import supabaseServer from "@/libs/supabaseServer"

const getLastMessages = async () => {
  try {
    const { data: open_ticketsId_response, error: open_ticketsId_error } = await supabaseServer()
      .from("tickets")
      .select("id")
      .eq("is_open", true)

    const ticketIds = open_ticketsId_response?.map(ticket => ticket.id) || []

    const { data: last_message_response, error: last_message_error } = await supabaseServer()
      .from("messages")
      .select("body")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: false })
      .limit(1)
    if (last_message_error) console.log(22, "last_message_error - ", last_message_error)

    const lastMessages = last_message_response?.map(lastMessage => lastMessage.body) || []

    return lastMessages
  } catch (error) {
    console.log(14, "error - ", error)
    return undefined
  }
}

export default getLastMessages
