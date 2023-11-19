// import getAllMessages from "@/actions/getAllMessages"
import { MessageInput, MessagesBody, MessagesHeader } from "../components"

export default async function ChatPage({ params }: { params: { chatId: string } }) {
  // const messages = await getAllMessagesFromConversation()

  // if !conversation (e.g 093jf0e) - return EmptyState

  return (
    <div className="bg-foreground-accent w-full h-full flex flex-col justify-between items-center z-[100]">
      <MessagesHeader />
      <MessagesBody />
      <MessageInput />
    </div>
  )
}

// TODO - https://www.youtube.com/watch?v=UgseormfMc4&t=3s&ab_channel=Joshtriedcoding