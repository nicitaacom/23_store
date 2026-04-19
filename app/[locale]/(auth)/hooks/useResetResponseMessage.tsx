import { Dispatch, ReactNode, SetStateAction, useEffect } from "react"

export const useResetResponseMessage = (setResponseMessage: Dispatch<SetStateAction<ReactNode | null>>, queryParams: string | null) => {
  useEffect(() => {
    setResponseMessage(null)
  }, [queryParams])
}
