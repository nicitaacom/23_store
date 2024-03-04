import useDarkMode from "@/store/ui/darkModeStore"
import useUserStore from "@/store/user/userStore"
import { getCookie } from "@/utils/helpersCSR"

const useSender = (sender_avatar_url: string | undefined, sender_id: string) => {
  const { userId, isAuthenticated, avatarUrl } = useUserStore()
  const { isDarkMode } = useDarkMode()

  const placeholder = "/placeholder.jpg"
  const BiUserCircleDark = "/BiUserCircle-dark.svg"
  const BiUserCircleLight = "/BiUserCircle-light.svg"

  const user_id = userId === "" ? getCookie("anonymousId") : userId
  const isOwn = user_id === sender_id

  let avatar_url = ""

  // I know it may be too much - if you know how to simplify it - go ahead and change it
  // I just see in my head how it should be it might help - https://i.imgur.com/qkNRqbI.png
  if (!isAuthenticated || user_id?.includes("anonymousId")) {
    if (isDarkMode) avatar_url = BiUserCircleDark
    else avatar_url = BiUserCircleLight
  } else if (isOwn) {
    if (avatarUrl) avatar_url = avatarUrl
    else avatar_url = placeholder
  } else {
    if (sender_id?.includes("anonymousId")) {
      if (isDarkMode) avatar_url = BiUserCircleDark
      else avatar_url = BiUserCircleLight
    } else {
      if (sender_avatar_url) avatar_url = sender_avatar_url
      else avatar_url = placeholder
    }
  }

  return { isOwn, avatar_url }
}

export default useSender
