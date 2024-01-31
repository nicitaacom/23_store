import { NextResponse } from "next/server"

import { IMessage } from "@/interfaces/support/IMessage"
import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export type TAPIMessageSeen = {
  messages: IMessage[]
  ticketId: string
  userId: string
}

export async function POST(req: Request) {
  const { ticketId, messages, userId } = (await req.json()) as TAPIMessageSeen
  // update to seen:true - only for (not own messages) and (not seen messages)
  const updatedUnseenMessages = messages
    .filter(message => message.sender_id !== userId && !message.seen)
    .map(unseenMessage => ({
      ...unseenMessage,
      seen: true,
    }))
  // array of unseed message ids (to update it in supabase)
  const unseenMessageIds = messages
    .filter(message => message.sender_id !== userId && !message.seen)
    .map(message => message.id)
  if (unseenMessageIds.length !== 0) {
    const { error: messages_error } = await supabaseAdmin
      .from("messages")
      .update({ seen: true })
      .in("id", unseenMessageIds)
    if (messages_error) {
      console.log(35, "error updating seen message - ", messages_error)
      return NextResponse.json({ error: `ERROR_UPDATING_MESSAGE \n ${messages_error}` })
    }
    await pusherServer.trigger(ticketId, "messages:seen", updatedUnseenMessages)
  }

  return NextResponse.json({ status: 200 })
}
