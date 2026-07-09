import { getCookie } from "./helpersCSR"
import { setAnonymousId } from "./setAnonymousId"
import useUserStore from "@/store/user/userStore"

export function getUserId(): string {
  const { user } = useUserStore.getState()

  const userId = user?.id || getCookie("anonymousId") || setAnonymousId()

  return userId
}
