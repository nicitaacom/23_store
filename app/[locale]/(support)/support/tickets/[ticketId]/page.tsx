import { cache } from "react"
import { notFound } from "next/navigation"
import { Metadata } from "next"

import type { IMessageDB } from "@/ts/support/IMessageDB"
import { ThisTicketIsCompleted } from "./components/ThisTicketIsCompleted"
import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"
import { DragAndDropArea } from "@/components/SupportButton/components/DragAndDropArea/DragAndDropArea"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

interface ChatPageProps {
  params: Promise<{
    ticketId: string
  }>
}

// to fix issue when I'm not in present channel and I see no messages in MesagesBody - https://streamable.com/dze31q
export const dynamic = "force-dynamic"
// every 5 seconds revalidate ticketId to make it SSG (statically prerendered page) with ISR (so it work faster)
export const revalidate = 5

//I cache data to don't fetch data from DB twice
const getInitialMessagesByTicketIdCache = cache(async (ticketId: string) => {
  const { data: messages_by_id_response, error: messages_by_id_error } = await supabaseAdmin
    .from("23_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .eq("ticket_id", ticketId)
  if (messages_by_id_error) console.log(23, "messages by id error - ", messages_by_id_error.message)
  if (!messages_by_id_response) return notFound()
  return messages_by_id_response as IMessageDB[]
})

// cache ticket meta (is_open + created_at) because by initial idea ticket can't be reopened
const getTicketMetaCache = cache(async (ticketId: string) => {
  const { data: ticket_meta } = await supabaseAdmin.from("23_tickets").select("is_open, created_at").eq("id", ticketId).single()
  return ticket_meta
})

export async function generateStaticParams(): Promise<{ ticketId: string }[]> {
  const { data, error } = await supabaseAdmin.from("23_tickets").select("id").eq("is_open", true)
  if (error) {
    console.log(42, "error generating statuc params - ", error.message)
    return []
  }
  if (!data) return []
  return data.map(row => ({ ticketId: row.id }))
}

export async function generateMetadata({ params: paramsPromise }: ChatPageProps): Promise<Metadata> {
  const { ticketId } = await paramsPromise
  const initial_messages = await getInitialMessagesByTicketIdCache(ticketId)
  const firstMessage = initial_messages[0]

  if (!firstMessage?.sender_username) {
    return {
      title: "Support chat",
      description: "Support conversation - Joki",
      openGraph: {
        images: [{ url: "/read-your-messages.jpg" }],
      },
      twitter: { card: "summary_large_image" },
    }
  }

  return {
    title: `Support chat with ${firstMessage.sender_username}`,
    description: initial_messages.length === 1 ? "message" : `messages - chat with ${firstMessage.sender_username} - Joki`,
    openGraph: {
      images: [{ url: "/read-your-messages.jpg" }],
    },
    twitter: { card: "summary_large_image" },
  }
}

export default async function ChatPage({ params: paramsPromise }: ChatPageProps) {
  const { ticketId } = await paramsPromise
  const initial_messages = await getInitialMessagesByTicketIdCache(ticketId)
  const ticketMeta = await getTicketMetaCache(ticketId)
  const firstMessage = initial_messages[0]

  if (!initial_messages || !ticketMeta?.is_open) {
    return <ThisTicketIsCompleted ticketId={ticketId} />
  } else if (initial_messages.length > 0 && firstMessage?.ticket_id && firstMessage.sender_username) {
    return (
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-color/35 bg-foreground/35">
        <MessagesHeader
          is_open={ticketMeta.is_open}
          owner_avatar_url={firstMessage.sender_avatar_url || ""}
          owner_id={firstMessage.sender_id}
          owner_username={firstMessage.sender_username}
          ticket_created_at={ticketMeta.created_at}
          ticket_id={firstMessage.ticket_id}
        />
        <MessagesBody ticket_id={firstMessage.ticket_id} initialMessages={initial_messages ?? []} />
        <MessagesFooter ticket_id={firstMessage.ticket_id} />
        <DragAndDropArea />
      </main>
    )
  } else {
    // if !ticket (e.g 093jf0e) - return NoTicketFound
    return <NoTicketFound ticketId={ticketId} />
  }
}
