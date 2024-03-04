import fetchTicketId from "@/actions/fetchTicketId"
import getInitialMessagesByTicketId from "@/actions/getInitialMessagesByTicketId"
import { IMessage } from "@/interfaces/support/IMessage"
import { useEffect, useState } from "react"

export function useLoadInitialMessages() {
  const [isLoading, setIsLoading] = useState(false)
  const [ticketId, setTicktId] = useState("")
  const [initialMessages, setInitialMessages] = useState<IMessage[]>([])

  setIsLoading(true)

  useEffect(() => {
    try {
      async function getInitialMessagesByTicketIdFn() {
        const ticketId = await fetchTicketId()
        const initial_messages = await getInitialMessagesByTicketId(ticketId)
        setTicktId(ticketId)
        setInitialMessages(initial_messages)
      }
      getInitialMessagesByTicketIdFn()
    } catch (error) {
      console.log(13, "useLoadInitialMessages - ", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { ticketId, initialMessages, isLoading }
}
