import useUserStore from "@/store/user/userStore"
import { getCookie } from "./helpersCSR"
import { setAnonymousId } from "./setAnonymousId"

export function getUserId(): string {
  const { userId: userIdStore } = useUserStore.getState()

  const userId = userIdStore || getCookie("anonymousId") || setAnonymousId()

  return userId
}
