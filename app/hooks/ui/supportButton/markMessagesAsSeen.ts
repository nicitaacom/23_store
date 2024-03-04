import { TAPIMessageSeen } from "@/api/message/seen/route"
import { IMessage } from "@/interfaces/support/IMessage"
import axios from "axios"
import { useEffect } from "react"

export const useMarkMessagesAsSeen = (isDropdown: boolean, ticketId: string, messages: IMessage[], userId: string) => {
  useEffect(() => {
    if (isDropdown) {
      axios.post("/api/message/seen", { ticketId: ticketId, messages: messages, userId: userId } as TAPIMessageSeen)
    }
  }, [ticketId, messages, userId, isDropdown])
}
