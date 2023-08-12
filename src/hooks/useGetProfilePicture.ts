import { useEffect, useState } from "react"
import supabase from "../utils/supabaseClient"
import useGetUserId from "./useGetUserId"

const useGetProfilePictureUrl = () => {

  const {userId} = useGetUserId()
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>()

  useEffect(() => {
    const getProfilePictureUrl = async () => {
      try {
        const response = await supabase.auth.getUser()
        if (response.data.user) {
          if (response.error) throw response.error
          const {data} = await supabase.from("users")
          .select("profile_picture_url")
          .eq("id",userId)
          if (data && data.length >0 && data[0]?.profile_picture_url) {
            setProfilePictureUrl(data[0]?.profile_picture_url)
          }
        }
      } catch (error) {
        console.error("getProfilePictureUrl - ", error)
      }
    }
    getProfilePictureUrl()
  }, [])

  return { profilePictureUrl }
}

export default useGetProfilePictureUrl