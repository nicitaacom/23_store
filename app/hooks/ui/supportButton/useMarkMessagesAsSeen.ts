import { useEffect } from "react"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { useIsActiveTab } from "@/hooks/ui/supportButton/useActiveTab"

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
      void supportSDK.markMessagesAsSeen({ ticketId, messages, userId })
    }
  }, [isDropdown, ticketId, messages, userId, isLoading, isActiveTab])
}
