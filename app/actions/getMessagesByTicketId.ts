import supabaseAdmin from "@/libs/supabaseAdmin"

const getMessagesByTicketId = async (ticketId: string) => {
  try {
    const { data, error } = await supabaseAdmin.from("messages").select("*").eq("id", ticketId)

    console.log(7, "data - ", data)
    console.log(8, "error - ", error)
  } catch (error) {
    if (error instanceof Error) {
      console.log(10, "error - ", error)
    }
  }
}
export default getMessagesByTicketId
