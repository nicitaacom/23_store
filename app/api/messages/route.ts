import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPIMessages = {
  ticketId: string
  senderId: string
  senderUsername: string
  body: string
  images?: string[]
}

export async function POST(req: Request) {
  const { ticketId, body, images, senderId, senderUsername } = (await req.json()) as TAPIMessages

  // dance arounding to insert current date-time
  const now = new Date()
  const timestampString = now.toISOString().replace("T", " ").replace("Z", "+00")

  // random id because after inserting in 'tickets' no response from supabase with generated ticket.id
  const newMessage = {
    id: crypto.randomUUID(), // needed to set in cuurent pusher channel (for key prop in react)
    created_at: timestampString,
    ticket_id: ticketId,
    sender_id: senderId,
    sender_username: senderUsername,
    body: body,
    images: images,
  }

  //TODO - updated converstaion in the future - https://youtu.be/PGPGcKBpAk8?t=28253

  //supabaseAdmin because I don't want any user with ANON_KEY abuse way to send messages (smsBomber protecting)
  //see more (use subtitles if needed) - https://www.youtube.com/watch?v=voy5_XGETMc&ab_channel=overbafer1
  const { error } = await supabaseAdmin.from("messages").insert(newMessage)
  await pusherServer.trigger(ticketId, "messages:new", newMessage)
  if (error) console.log(29, "error insert newMessage - ", error)

  return NextResponse.json({ status: 200 })
}
