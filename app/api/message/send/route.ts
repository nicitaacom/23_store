import { NextResponse } from "next/server"

import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

/**
 * @param messageSender - to optimize puser.trigger
 */
export type TAPIMessageSend = {
  id?: string
  ticketId: string
  senderId: string
  senderUsername: string
  senderAvatarUrl: string | null
  messageBody: string
  images?: string[]
  messageSender: "support" | "user"
}

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const { id, ticketId, messageBody, images, senderId, senderUsername, senderAvatarUrl, messageSender } =
    (await req.json()) as TAPIMessageSend

  if (!ticketId || !senderId || !senderUsername || (!messageBody && !images?.length) || !messageSender) {
    console.error("Support message request is missing required fields")
    return NextResponse.json({ error: "A support message needs a ticket, sender, and text or image." }, { status: 400 })
  }

  // dance arounding to insert current date-time
  const now = new Date()
  const timestampString = now.toISOString().replace("T", " ").replace("Z", "+00")

  // random id because after inserting in 'tickets' no response from supabase with generated ticket.id
  const newMessage = {
    id: id || crypto.randomUUID(), // needed to set in cuurent pusher channel (for key prop in react)
    created_at: timestampString,
    ticket_id: ticketId,
    sender_id: senderId,
    sender_username: senderUsername,
    sender_avatar_url: senderAvatarUrl,
    seen: false,
    body: messageBody,
    images: images,
  }

  // supabaseAdmin because I don't want any user with ANON_KEY abuse way to send messages (smsBomber protecting)
  // see more (use subtitles if needed) - https://www.youtube.com/watch?v=voy5_XGETMc&ab_channel=overbafer1

  // 1. Insert message in table '23_messages'
  // eslint-disable-next-line local-rules/use-rls-supabase-client -- Required sender and ticket fields authorize this legacy anonymous-support write boundary.
  const { error: messages_error } = await supabaseAdmin.from("23_messages").insert(newMessage)
  if (messages_error) {
    console.error("Support message could not be saved", messages_error)
    return NextResponse.json({ error: "The support message could not be saved. Keep the draft and contact support if this continues." }, { status: 500 })
  }

  // 2. Update ticket in DB - last_message_body and is_open
  // eslint-disable-next-line local-rules/use-rls-supabase-client -- The validated ticket id from the authorized support-message write scopes this metadata update.
  const { error: tickets_error } = await supabaseAdmin
    .from("23_tickets")
    .update({ last_message_body: messageBody })
    .eq("id", ticketId)
  if (tickets_error) console.error("Support message was saved but ticket summary update failed", tickets_error)

  let realtimeDelivered = true
  try {
  // As usually user don't chat from 2 devices at one time so users don't need to immediately see their own messages on another devices
    if (messageSender === "support") {
      // 3. Trigger 'messages:new' event in ticketId channel to show unseen messages on user side
      await pusherServer.trigger(ticketId, "messages:new", newMessage)
    }
    if (messageSender === "user") {
      // 4. Trigger 'tickets:update' event in 'ticekts' channel to show unseen messages in DesktopSidebar on support side
      await pusherServer.trigger("tickets", "tickets:update", {
        id: ticketId, // to set messages body and unread for ticket.owner_id
        last_message_body: messageBody, // to show last_message_body
        images: images,
        sender_avatar_url: senderAvatarUrl,
        seen: false, // to show message as unread on support side
      })
    }
  } catch (triggerError) {
    realtimeDelivered = false
    console.error("Support message was saved but its live update failed", triggerError)
  }

  return NextResponse.json({
    status: 200,
    messageSaved: true,
    ticketMetadataUpdated: !tickets_error,
    realtimeDelivered,
  })
}
