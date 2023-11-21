"use client"

import { MessageBox } from "@/components/SupportButton/components/MessageBox"
import { IMessage } from "@/interfaces/IMessage"

export function MessagesBody({ messages }: { messages: IMessage[] }) {
  if (messages.length === 0) {
    return (
      <main
        className="w-full h-full laptop:w-[calc(100%-16rem)] hidden laptop:flex bg-foreground-accent
      justify-center items-center
    shadow-[inset_0px_8px_6px_rgba(0,0,0,0.4)] z-[100]">
        <p>No messages in this ticket</p>
        <p>Please let me know how you got this error - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
      </main>
    )
  }

  return (
    <ul className="w-full h-full flex gap-y-2 flex-col justify-start items-end px-8 py-6">
      {messages.map(message => (
        <MessageBox message={message} key={message.id} />
      ))}
    </ul>
  )
}
