import { twMerge } from "tailwind-merge"

import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"
import { ThisTicketIsCompleted } from "./components/ThisTicketIsCompleted"
import { cache } from "react"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

interface ChatPageProps {
  params: {
    ticketId: string
  }
}

// to fix issue when I'm not in present channel and I see no messages in MesagesBody - https://streamable.com/dze31q
export const dynamic = "force-dynamic"
// every 5 seconds revalidate ticketId to make it SSG (statically prerendered page) with ISR (so it work faster)
export const revalidate = 5

//I cache data to don't fetch data from DB twice
const getInitialMessagesByTicketIdCache = cache(async (ticketId: string) => {
  const { data: messages_by_id_response, error: messages_by_id_error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("ticket_id", ticketId)
  if (messages_by_id_error) console.log(23, "messages by id error - ", messages_by_id_error.message)
  if (!messages_by_id_response) return notFound()
  return messages_by_id_response
})

// cache ticket is_open state because by initial idea ticket can't be reopened
const getIsTicketOpenCache = cache(async (ticketId: string) => {
  const { data: is_ticket_open } = await supabaseAdmin.from("tickets").select("is_open").eq("id", ticketId).single()
  return is_ticket_open?.is_open
})

export async function generateStaticParams(): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("tickets").select("id").eq("is_open", true)
  if (error) {
    console.log(42, "error generating statuc params - ", error.message)
    return []
  }
  if (!data) return notFound()
  return data.map(ticketId => ticketId.id) // from [{id:'129f-32id'}] to ['129f-32id']
}

export async function generateMetadata({ params: { ticketId } }: ChatPageProps): Promise<Metadata> {
  const initial_messages = await getInitialMessagesByTicketIdCache(ticketId)

  return {
    title: `Support chat with ${initial_messages[0].sender_username}`, // first message its ticket owner
    description:
      initial_messages.length === 1
        ? "message"
        : "messages - " + `chat with ${initial_messages[0].sender_username}` + "  - 23_store",
    openGraph: {
      images: [{ url: "/read-your-messages.jpg" }],
    },
    twitter: { card: "summary_large_image" },
  }
}

export default async function ChatPage({ params: { ticketId } }: ChatPageProps) {
  const initial_messages = await getInitialMessagesByTicketIdCache(ticketId)
  const is_ticket_open = await getIsTicketOpenCache(ticketId)

  if (!initial_messages || !is_ticket_open) {
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
