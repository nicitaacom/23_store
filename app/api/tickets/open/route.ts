import { NextResponse } from "next/server"

import supabaseAdmin from "@/libs/supabaseAdmin"
import { pusherServer } from "@/libs/pusher"
import { ITicket } from "@/interfaces/ITicket"

export type TAPITicketsOpen = {
  ticketId: string
  ownerId: string
  ownerUsername: string
  ownerAvatarUrl: string
  messageBody: string
}

export async function POST(req: Request) {
  // just messageBody instead of lastMessageBody because only user message support (not support message user)
  // also because I insert row in 'tickets' table only once on first message - so I have only 1 message in this ticket
  const { ticketId, ownerId, ownerUsername, messageBody, ownerAvatarUrl } = (await req.json()) as TAPITicketsOpen

  // dance arounding to insert current date-time
  const now = new Date()
  const timestampString = now.toISOString().replace("T", " ").replace("Z", "+00")

  const { error } = await supabaseAdmin.from("tickets").insert({
    id: ticketId,
    created_at: timestampString,
    owner_id: ownerId,
    owner_username: ownerUsername,
    owner_avatar_url: ownerAvatarUrl,
  })
  if (error) return NextResponse.json({ error: `Error in api/tickets/route.ts\n ${error.message}` }, { status: 400 })
  await pusherServer.trigger("tickets", "tickets:open", {
    id: ticketId,
    created_at: timestampString,
    owner_id: ownerId,
    owner_username: ownerUsername,
    is_open: true,
    last_message_body: messageBody,
    owner_avatar_url: ownerAvatarUrl,
  } as ITicket)

  return NextResponse.json({ status: 200 })
}
