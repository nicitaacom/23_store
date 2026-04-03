import { twMerge } from "tailwind-merge"

import { MessagesBody, MessagesFooter, MessagesHeader, NoTicketFound } from "./components"
import { ThisTicketIsCompleted } from "./components/ThisTicketIsCompleted"
import { cache } from "react"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import type { IMessageDB } from "@/ts/support/IMessageDB"

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
    .order("created_at", { ascending: true })
    .eq("ticket_id", ticketId)
  if (messages_by_id_error) console.log(23, "messages by id error - ", messages_by_id_error.message)
  if (!messages_by_id_response) return notFound()
  return messages_by_id_response as IMessageDB[]
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

export default async function ChatPage({ params: { ticketId } }: ChatPageProps) {
  const initial_messages = await getInitialMessagesByTicketIdCache(ticketId)
  const is_ticket_open = await getIsTicketOpenCache(ticketId)
  const firstMessage = initial_messages[0]

  if (!initial_messages || !is_ticket_open) {
    return <ThisTicketIsCompleted ticketId={ticketId} />
  } else if (initial_messages.length > 0 && firstMessage?.ticket_id && firstMessage.sender_username) {
    return (
      <main
        className={twMerge(
          "flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border-color/35 bg-foreground/35",
          ticketId && "flex",
        )}>
        <MessagesHeader
          owner_avatar_url={firstMessage.sender_avatar_url || ""}
          owner_id={firstMessage.sender_id}
          owner_username={firstMessage.sender_username}
          ticket_id={firstMessage.ticket_id}
        />
        <MessagesBody ticket_id={firstMessage.ticket_id} initialMessages={initial_messages ?? []} />
        <MessagesFooter ticket_id={firstMessage.ticket_id} />
      </main>
    )
  } else {
    // if !ticket (e.g 093jf0e) - return NoTicketFound
    return <NoTicketFound ticketId={ticketId} />
  }
}
