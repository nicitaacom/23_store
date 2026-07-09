import { useMemo } from "react"
import { useParams } from "next/navigation"

const useTicket = () => {
  const params = useParams()

  const ticketId = useMemo(() => {
    if (!params?.ticketId) {
      return ""
    }

    return params.ticketId as string
  }, [params?.ticketId])

  const isOpen = useMemo(() => !!ticketId, [ticketId])

  return useMemo(
    () => ({
      isOpen,
      ticketId,
    }),
    [isOpen, ticketId],
  )
}

export default useTicket
