import { IFormDataMessage } from "@/interfaces/support/IFormDataMessage"
import { RefObject, useEffect } from "react"
import { UseFormSetFocus } from "react-hook-form"

export function useScrollToBottom(
  setFocus: UseFormSetFocus<IFormDataMessage>,
  bottomRef: RefObject<HTMLUListElement>,
  isDropdown: boolean,
) {
  useEffect(() => {
    //Timeout needed for focus and scroll to bottom - without it foucs and scrollToBottom doesn't work
    setTimeout(() => {
      setFocus("message")
      if (bottomRef.current) {
        bottomRef.current.scrollTop = bottomRef.current.scrollHeight
      }
    }, 25)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDropdown])
}
