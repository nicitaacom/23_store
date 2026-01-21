import useUserStore from "@/store/user/userStore"
import { getCookie } from "./helpersCSR"
import { setAnonymousId } from "./setAnonymousId"

export function getUserId(): string {
  const { userId: userIdStore } = useUserStore.getState()

  console.log(8, "userIdStore - ", userIdStore)
  const userId = userIdStore || getCookie("anonymousId") || setAnonymousId()

  return userId
}
