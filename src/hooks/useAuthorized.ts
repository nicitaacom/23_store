import { useEffect, useState } from "react"
import useUserStore from "../store/userStore"
import supabase from "../utils/supabaseClient"
import useGetUserId from "./useGetUserId"

const useAuthorized = () => {
  const userStore = useUserStore()
  const {userId} = useGetUserId()

  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await supabase.auth.getUser()
        if (response.data.user) {
          setIsAuthenticated(true)
          setProfilePictureUrl()
        }
      } catch (error) {
        console.error("checkAuthorization - ", error)
      }
    }
    const setProfilePictureUrl = async () => {
      const { data } = await supabase.from("users")
      .select("profile_picture_url")
      .eq("id", userId)
      if (data) {
        userStore.setProfilePictureUrl(data[0]?.profile_picture_url as string)
      }
    }
    checkAuthorization().catch(console.error)
  }, [])

  return { isAuthenticated }
}

export default useAuthorized
