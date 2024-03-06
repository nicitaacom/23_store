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

  if (!ticketId || !messages || !userId) {
    console.log(
      18,
      `missing required fields \n
       ticketId - ${ticketId} \n
       messages - ${messages} \n
       userId - ${userId} \n`,
    )
    return NextResponse.json({ status: 400 })
  }

  // 1. Update to seen:true - only for (not own messages) and (not seen messages)
  const updatedUnseenMessages = messages
    .filter(message => message.sender_id !== userId && !message.seen)
    .map(unseenMessage => ({
      ...unseenMessage,
      seen: true,
    }))

  // 2. Array of unseen message ids (to update it in supabase)
  const unseenMessageIds = messages
    .filter(message => message.sender_id !== userId && !message.seen)
    .map(message => message.id)

  // 3. Update seen:true in 'messages' table
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
