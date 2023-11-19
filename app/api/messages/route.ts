import { IMessage } from "@/interfaces/IMessage"
import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPIMessages = {
  body: string
  senderId: string
  senderUsername: string
  ticketId: string
  images?: string
}

export async function POST(req: Request) {
  const { ticketId, body, images, senderId, senderUsername } = (await req.json()) as TAPIMessages

  const newMessage = {
    sender_id: senderId,
    owner_username: senderUsername,
    body: body,
    images: images,
  }
  //TODO - updated converstaion in the future - https://youtu.be/PGPGcKBpAk8?t=28253

  //supabaseAdmin because I don't want any user with ANON_KEY abuse way to send messages (smsBomber protecting)
  //see more (use subtitles if needed) - https://www.youtube.com/watch?v=voy5_XGETMc&ab_channel=overbafer1
  await supabaseAdmin.from("tickets").insert(newMessage)
  await pusherServer.trigger(ticketId, "messages:new", newMessage)

  return NextResponse.json({ req })
}
