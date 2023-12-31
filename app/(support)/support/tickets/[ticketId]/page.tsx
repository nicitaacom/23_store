import { twMerge } from "tailwind-merge"

import getInitialMessagesByTicketId from "@/actions/getInitialMessagesByTicketId"
import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"
import { ThisTicketIsCompleted } from "./components/ThisTicketIsCompleted"

// to fix issue when I'm not in present channel and I see no messages in MesagesBody - https://streamable.com/dze31q
export const dynamic = "force-dynamic"

export default async function ChatPage({ params }: { params: { ticketId: string } }) {
  const initial_messages = await getInitialMessagesByTicketId(params.ticketId)

  if (initial_messages === null) {
    return <ThisTicketIsCompleted ticketId={params.ticketId} />
  } else if (initial_messages.length > 0 && initial_messages[0].ticket_id) {
    return (
      <main
        className={twMerge(
          `hidden w-full h-full laptop:w-[calc(100%-16rem)] bg-foreground-accent
       flex-col justify-between items-center z-[100]`,
          params.ticketId && "flex",
        )}>
        <MessagesHeader
          owner_avatar_url={initial_messages[0].sender_avatar_url || ""}
          owner_id={initial_messages[0].sender_id}
          owner_username={initial_messages[0].sender_username}
        />
        <MessagesBody ticket_id={initial_messages[0].ticket_id} initialMessages={initial_messages ?? []} />
        <MessagesFooter ticket_id={initial_messages[0].ticket_id} />
      </main>
    )
  } else {
    // if !ticket (e.g 093jf0e) - return NoTicketFound
    return <NoTicketFound ticketId={params.ticketId} />
  }
}
