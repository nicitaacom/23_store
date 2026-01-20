import { Dispatch, ReactNode, SetStateAction, useEffect } from "react"

export const useResetResponseMessage = (setResponseMessage: Dispatch<SetStateAction<ReactNode>>, queryParams: string | null) => {
  useEffect(() => {
    setResponseMessage(<p></p>)
  }, [queryParams])
}
