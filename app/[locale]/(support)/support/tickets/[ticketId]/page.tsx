import { cache } from "react"
import { notFound } from "next/navigation"
import { Metadata } from "next"

import type { TMessageDB } from "@/ts/support/TMessageDB"
import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"
import { ThisTicketIsCompleted } from "./components/ThisTicketIsCompleted"
import supabaseServer from "@/libs/supabase/supabaseServer"
import { DragAndDropArea } from "@/components/SupportButton/components/DragAndDropArea/DragAndDropArea"

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
  const supabase = await supabaseServer()
  const { data: messages_by_id_response, error: messages_by_id_error } = await supabase
    .from("23_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .eq("ticket_id", ticketId)
  if (messages_by_id_error) console.log(23, "messages by id error - ", messages_by_id_error.message)
  if (!messages_by_id_response) return notFound()
  return messages_by_id_response as TMessageDB[]
})

// cache ticket meta (is_open + created_at) because the current product rule keeps closed tickets closed
const getTicketMetaCache = cache(async (ticketId: string) => {
  const supabase = await supabaseServer()
  const { data: ticket_meta } = await supabase.from("23_tickets").select("is_open, created_at").eq("id", ticketId).single()
  return ticket_meta
})

export function generateStaticParams(): { ticketId: string }[] {
  return []
}

export async function generateMetadata({ params: paramsPromise }: ChatPageProps): Promise<Metadata> {
  const { ticketId } = await paramsPromise
  const getInitialMessagesByTicketIdCacheResp = await getInitialMessagesByTicketIdCache(ticketId)
  const firstMessage = getInitialMessagesByTicketIdCacheResp[0]

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
    description:
      getInitialMessagesByTicketIdCacheResp.length === 1
        ? "message"
        : `messages - chat with ${firstMessage.sender_username} - Joki`,
    openGraph: {
      images: [{ url: "/read-your-messages.jpg" }],
    },
    twitter: { card: "summary_large_image" },
  }
}

export default async function ChatPage({ params: paramsPromise }: ChatPageProps) {
  const { ticketId } = await paramsPromise
  const getInitialMessagesByTicketIdCacheResp = await getInitialMessagesByTicketIdCache(ticketId)
  const getTicketMetaCacheResp = await getTicketMetaCache(ticketId)
  const firstMessage = getInitialMessagesByTicketIdCacheResp[0]

  if (!getInitialMessagesByTicketIdCacheResp || !getTicketMetaCacheResp?.is_open) {
    return <ThisTicketIsCompleted ticketId={ticketId} />
  } else if (getInitialMessagesByTicketIdCacheResp.length > 0 && firstMessage?.ticket_id && firstMessage.sender_username) {
    return (
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-color/35 bg-foreground/35">
        <MessagesHeader
          is_open={getTicketMetaCacheResp.is_open}
          owner_avatar_url={firstMessage.sender_avatar_url || ""}
          owner_id={firstMessage.sender_id}
          owner_username={firstMessage.sender_username}
          ticket_created_at={getTicketMetaCacheResp.created_at}
          ticket_id={firstMessage.ticket_id}
        />
        <MessagesBody ticket_id={firstMessage.ticket_id} initialMessages={getInitialMessagesByTicketIdCacheResp ?? []} />
        <MessagesFooter ticket_id={firstMessage.ticket_id} />
        <DragAndDropArea />
      </main>
    )
  } else {
    // if !ticket (e.g 093jf0e) - return NoTicketFound
    return <NoTicketFound ticketId={ticketId} />
  }
}
