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

  const newMessage = {
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

  return NextResponse.json({ req })
}
