import { getCookie } from "./helpersCSR"
import { setAnonymousId } from "./setAnonymousId"
import useUser from "@/store/user/useUser"

export function getUserId(): string {
  const { user } = useUser.getState()

  const userId = user?.id || getCookie("anonymousId") || setAnonymousId()

  return userId
}
