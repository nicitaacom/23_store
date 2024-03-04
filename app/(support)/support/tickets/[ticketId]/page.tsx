import { twMerge } from "tailwind-merge"

import getInitialMessagesByTicketId from "@/actions/getInitialMessagesByTicketId"
import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"
import { ThisTicketIsCompleted } from "./components/ThisTicketIsCompleted"
import { cache } from "react"
import { notFound } from "next/navigation"
import { Metadata } from "next"

interface ChatPageProps {
  params: {
    ticketId: string
  }
}

//I cache data to don't fetch data from DB twice
const getInitialMessagesByTicketIdCache = cache(async (ticketId: string) => {
  const initial_messages = await getInitialMessagesByTicketId(ticketId)
  if (!initial_messages) notFound()
  return initial_messages
})

export async function generateMetadata({ params: { ticketId } }: ChatPageProps): Promise<Metadata> {
  const initial_messages = await getInitialMessagesByTicketIdCache(ticketId)

  return {
    title: initial_messages.length === 1 ? "message" : "messages" + "  - 23_store",
    description: initial_messages.length === 1 ? "message" : "messages" + "  - 23_store",
    openGraph: {
      images: [{ url: "/read-your-messages.jpg" }],
    },
  }
}

// to fix issue when I'm not in present channel and I see no messages in MesagesBody - https://streamable.com/dze31q
export const dynamic = "force-dynamic"

export default async function ChatPage({ params: { ticketId } }: ChatPageProps) {
  const initial_messages = await getInitialMessagesByTicketIdCache(ticketId)

  if (initial_messages === null) {
    return <ThisTicketIsCompleted ticketId={ticketId} />
  } else if (initial_messages.length > 0 && initial_messages[0].ticket_id) {
    return (
      <main
        className={twMerge(
          `hidden w-full h-full laptop:w-[calc(100%-16rem)] bg-foreground-accent
       flex-col justify-between items-center z-[100]`,
          ticketId && "flex",
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
    return <NoTicketFound ticketId={ticketId} />
  }
}
