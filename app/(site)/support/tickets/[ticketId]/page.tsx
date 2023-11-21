// import getAllMessages from "@/actions/getAllMessages"
import supabaseAdmin from "@/libs/supabaseAdmin"
import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"
import { twMerge } from "tailwind-merge"

export default async function ChatPage({ params }: { params: { ticketId: string } }) {
  // const messages = await getTicketData()

  const { data, error: no_ticket_found } = await supabaseAdmin
    .from("tickets")
    .select("id")
    .eq("id", params.ticketId)
    .single()

  if (data) {
    return (
      <main
        className={twMerge(
          `hidden w-full h-full laptop:w-[calc(100%-16rem)] bg-foreground-accent
       flex-col justify-between items-center z-[100]`,
          params.ticketId && "flex",
        )}>
        <MessagesHeader />
        <MessagesBody />
        <MessagesFooter />
      </main>
    )
  } else if (no_ticket_found) {
    // if !ticket (e.g 093jf0e) - return NoTicketFound
    return <NoTicketFound ticketId={params.ticketId} />
  }
}

// TODO - https://www.youtube.com/watch?v=UgseormfMc4&t=3s&ab_channel=Joshtriedcoding
