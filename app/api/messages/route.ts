import { IMessage } from "@/interfaces/IMessage"
import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabaseAdmin"
import { NextResponse } from "next/server"

export type TMessageRequest = {
  body: string
  conversationId: string
  senderId: string
}

export async function POST(req: Request) {
  const { body, conversationId, senderId } = (await req.json()) as TMessageRequest

  const newMessage: IMessage = {
    created_at: new Date().toISOString(),
    conversation_id: conversationId,
    body: body,
    sender_id: senderId,
    is_closed_conversation: false,
    id: crypto.randomUUID(),
  }
  //TODO - updated converstaion in the future - https://youtu.be/PGPGcKBpAk8?t=28253

  //supabaseAdmin because I don't want any user with ANON_KEY abuse way to send messages (smsBomber protecting)
  //see more (use subtitles if needed) - https://www.youtube.com/watch?v=voy5_XGETMc&ab_channel=overbafer1
  await supabaseAdmin.from("messages").insert(newMessage)
  await pusherServer.trigger(conversationId, "messages:new", newMessage)

  return NextResponse.json({ req })
}
