import useUserStore from "@/store/user/userStore"
import { getCookie } from "./helpersCSR"

export function getUserId(): string | undefined {
  const { userId: userIdStore } = useUserStore.getState()

  const userId = userIdStore ?? getCookie("anonymousId")

  return userId
}
