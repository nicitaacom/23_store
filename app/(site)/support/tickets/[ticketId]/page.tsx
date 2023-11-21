// import getAllMessages from "@/actions/getAllMessages"
import supabaseAdmin from "@/libs/supabaseAdmin"
import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"
import { twMerge } from "tailwind-merge"
import getMessagesByTicketId from "@/actions/getMessagesByTicketId"

export default async function ChatPage({ params }: { params: { ticketId: string } }) {
  const messages = await getMessagesByTicketId(params.ticketId)

  const { data: ticket_response, error: no_ticket_found } = await supabaseAdmin
    .from("tickets")
    .select("id,owner_username")
    .eq("id", params.ticketId)
    .single()

  if (ticket_response?.id) {
    return (
      <main
        className={twMerge(
          `hidden w-full h-full laptop:w-[calc(100%-16rem)] bg-foreground-accent
       flex-col justify-between items-center z-[100]`,
          params.ticketId && "flex",
        )}>
        <MessagesHeader owner_username={ticket_response.owner_username} />
        <MessagesBody messages={messages ?? []} />
        <MessagesFooter />
      </main>
    )
  } else if (no_ticket_found) {
    // if !ticket (e.g 093jf0e) - return NoTicketFound
    return <NoTicketFound ticketId={params.ticketId} />
  }
}

// TODO - https://www.youtube.com/watch?v=UgseormfMc4&t=3s&ab_channel=Joshtriedcoding
