import { useEffect } from "react"
import axios from "axios"

import { TAPIMessageSeen } from "@/api/message/seen/route"
import { IMessageDB } from "@/ts/support/IMessageDB"
import { useIsActiveTab } from "@/hooks/ui/supportButton/useActiveTab" // Adjust this path to where you place the hook

export const useMarkMessagesAsSeen = (
  isDropdown: boolean,
  ticketId: string | null,
  messages: IMessageDB[],
  userId: string | undefined,
  isLoading: boolean,
) => {
  const { isActiveTab } = useIsActiveTab()

  useEffect(() => {
    if (isDropdown && !isLoading && !!ticketId && messages.length > 0 && !!userId && isActiveTab) {
      axios.post("/api/message/seen", { ticketId, messages, userId } as TAPIMessageSeen)
    }
  }, [isDropdown, ticketId, messages, userId, isLoading, isActiveTab])
}
