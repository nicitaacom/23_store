import { Dispatch, SetStateAction, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UseFormGetValues } from "react-hook-form"

import { IAuthFormData } from "../AuthModal/AuthModal"
import { getPusherClient } from "@/libs/pusher"

export const useRecoverCompleted = (
  isRecoverCompleted: boolean,
  setIsRecoverCompleted: Dispatch<SetStateAction<boolean>>,
  getValues: UseFormGetValues<IAuthFormData>,
) => {
  const router = useRouter()
  // Show 'Recover completed' if user changed password in another window
  useEffect(() => {
    const pusherClient = getPusherClient()
    const recoverCompletedHandler = () => {
      setIsRecoverCompleted(true)
      router.refresh()
    }

    if (isRecoverCompleted) router.push("?modal=AuthModal&variant=recoverCompleted")
    else {
      pusherClient.unbind("recover:completed")
      pusherClient.bind("recover:completed", recoverCompletedHandler)
    }

    return () => {
      if (getValues("email")) {
        pusherClient.unsubscribe(getValues("email"))
      }
      pusherClient.unbind("recover:completed", recoverCompletedHandler)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecoverCompleted, router])
}
