import useUserStore from "@/store/user/userStore"
import { getCookie } from "./helpersCSR"
import { setAnonymousId } from "./setAnonymousId"

export function getUserId(): string {
  const { user } = useUserStore.getState()

  const userId = user?.id || getCookie("anonymousId") || setAnonymousId()

  return userId
}
