// import getAllMessages from "@/actions/getAllMessages"
import supabaseAdmin from "@/libs/supabaseAdmin"
import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"

export default async function ChatPage({ params }: { params: { ticketId: string } }) {
  // const messages = await getTicketData()

  const { data, error } = await supabaseAdmin.from("tickets").select("id").eq("id", params.ticketId).single()

  if (data) {
    return (
      <div className="bg-foreground-accent w-full h-full flex flex-col justify-between items-center z-[100]">
        <MessagesHeader />
        <MessagesBody />
        <MessagesFooter />
      </div>
    )
  }
  // if !ticket (e.g 093jf0e) - return NoTicketFound
  else {
    ;<NoTicketFound />
  }
}

// TODO - https://www.youtube.com/watch?v=UgseormfMc4&t=3s&ab_channel=Joshtriedcoding
