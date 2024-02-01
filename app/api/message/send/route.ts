import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPIMessageSend = {
  id?: string
  ticketId: string
  senderId: string
  senderUsername: string
  senderAvatarUrl: string
  body: string
  images?: string[]
}

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const { id, ticketId, body, images, senderId, senderUsername, senderAvatarUrl } =
    (await req.json()) as TAPIMessageSend
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
    body: body,
    images: images,
  }

  //TODO - updated converstaion in the future - https://youtu.be/PGPGcKBpAk8?t=28253

  //supabaseAdmin because I don't want any user with ANON_KEY abuse way to send messages (smsBomber protecting)
  //see more (use subtitles if needed) - https://www.youtube.com/watch?v=voy5_XGETMc&ab_channel=overbafer1
  const { error: messages_error } = await supabaseAdmin.from("messages").insert(newMessage)
  const { error: tickets_error } = await supabaseAdmin
    .from("tickets")
    .update({ last_message_body: body })
    .eq("id", ticketId)
  if (messages_error) console.log(29, "error inserting newMessage - ", messages_error)
  if (tickets_error) console.log(29, "error updating last_message_body - ", tickets_error)
  await pusherServer.trigger(ticketId, "messages:new", newMessage)
  await pusherServer.trigger("tickets", "tickets:update", {
    id: ticketId,
    last_message_body: body,
    images: images,
    sender_avatar_url: senderAvatarUrl,
  })

  return NextResponse.json({ status: 200 })
}
