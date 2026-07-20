import { NextResponse } from "next/server"

import { ITicketDB } from "@/ts/support/ITicketDB"
import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export type TAPITicketsOpen = {
  ticketId: string
  ownerId: string
  ownerUsername: string
  ownerAvatarUrl: string | null
  messageBody: string
}

export async function POST(req: Request) {
  // just messageBody instead of lastMessageBody because only user message support (not support message user)
  // also because I insert row in 'tickets' table only once on first message - so I have only 1 message in this ticket
  const { ticketId, ownerId, ownerUsername, messageBody, ownerAvatarUrl } = (await req.json()) as TAPITicketsOpen

  if (!ticketId || !ownerId || !ownerUsername || !messageBody) {
    console.log(
      22,
      `API_TICKETS_OPEN_ERROR - missing required fields \n
       ticketId - ${ticketId} \n
       ownerId - ${ownerId} \n
       ownerUsername - ${ownerUsername} \n
       messageBody - ${messageBody} \n`,
    )
    return NextResponse.json({ status: 400 })
  }

  // dance arounding to insert current date-time
  const now = new Date()
  const timestampString = now.toISOString().replace("T", " ").replace("Z", "+00")

  // 1. Insert new ticket in 'tickets' table
  // eslint-disable-next-line local-rules/use-rls-supabase-client -- Required owner and ticket fields authorize this legacy anonymous-support ticket boundary.
  const { error } = await supabaseAdmin.from("23_tickets").insert({
    id: ticketId,
    created_at: timestampString,
    owner_id: ownerId,
    owner_username: ownerUsername,
    owner_avatar_url: ownerAvatarUrl,
  })
  if (error) return NextResponse.json({ error: `Error in api/tickets/open/route.ts\n ${error.message}` }, { status: 400 })

  // 2. Trigger 'tickets:open' event in 'tickets' channel and pass required data
  await pusherServer.trigger("tickets", "tickets:open", {
    id: ticketId,
    created_at: timestampString,
    owner_id: ownerId,
    owner_username: ownerUsername,
    is_open: true,
    last_message_body: messageBody,
    owner_avatar_url: ownerAvatarUrl,
  } as ITicketDB)

  return NextResponse.json({ status: 200 })
}
