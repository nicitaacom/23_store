import { useRouter } from "next/navigation"
import { Dispatch, SetStateAction, useEffect } from "react"
import { UseFormGetValues } from "react-hook-form"
import { AuthFormData } from "../AuthModal/AuthModal"
import { getPusherClient } from "@/libs/pusher"

export const useAuthCompleted = (
  isAuthCompleted: boolean,
  setIsAuthCompleted: Dispatch<SetStateAction<boolean>>,
  getValues: UseFormGetValues<AuthFormData>,
) => {
  const router = useRouter()
   const pusherClient = getPusherClient()

  useEffect(() => {
    function authCompletedHandler() {
      setIsAuthCompleted(true)
      setTimeout(() => {
        // this timeout required to set avatarUrl
        router.refresh()
      }, 250)
    }

    if (isAuthCompleted) router.push("?modal=AuthModal&variant=authCompleted")
    else pusherClient.bind("auth:completed", authCompletedHandler)

    return () => {
      if (getValues("email")) {
        pusherClient.unsubscribe(getValues("email"))
      }
      pusherClient.unbind("auth:completed", authCompletedHandler)
    }
    // it depends only from isAuthCompleted state and on router because router might change state in other tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthCompleted, router])
}
