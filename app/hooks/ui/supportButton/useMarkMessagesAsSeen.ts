import { useEffect } from "react"

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
      void fetch("/api/message/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, messages, userId } as TAPIMessageSeen),
      })
    }
  }, [isDropdown, ticketId, messages, userId, isLoading, isActiveTab])
}
