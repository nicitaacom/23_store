import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { NextResponse } from "next/server"

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

  if (!ticketId || !senderId || !senderUsername || !messageBody || !messageSender) {
    console.log(
      23,
      `API_MESSAGES_SEND_ERROR - missing required fields \n
       ticketId - ${ticketId} \n
       senderId - ${senderId} \n
       senderUsername - ${senderUsername} \n
       messageBody - ${messageBody} \n
       messageSender - ${messageSender} \n`,
    )
    return NextResponse.json({ status: 400 })
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

  // 1. Insert message in table 'messages'
  const { error: messages_error } = await supabaseAdmin.from("messages").insert(newMessage)
  if (messages_error) {
    console.log(44, "error inserting newMessage - ", messages_error.message)
    if (messages_error.message !== "TypeError: fetch failed") return
    // fetch failed because internet connection may be not stable
    return new NextResponse(
      `Insert message in 'messages' error \n
                Path:/api/message/send/route.ts \n
                Error message:\n ${messages_error.message}`,
      { status: 400 },
    )
  }

  // 2. Update ticket in DB - last_message_body and is_open
  const { error: tickets_error } = await supabaseAdmin
    .from("tickets")
    .update({ last_message_body: messageBody })
    .eq("id", ticketId)
  if (tickets_error) {
    console.log(29, "error updating ticket in DB - last_message_body and is_open - ", tickets_error)
    return new NextResponse(
      `Update ticket 'tickets' error \n
                Path:/api/message/send/route.ts \n
                Error message:\n ${tickets_error.message}`,
      { status: 400 },
    )
  }

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
      images: images, // TODO - to show sent an image
      sender_avatar_url: senderAvatarUrl,
      seen: false, // to show message as unread on support side
    })
  }

  return NextResponse.json({ status: 200 })
}
