import { useEffect, useState } from "react"
import supabase from "../utils/supabaseClient"
import useGetUserId from "./useGetUserId"


const useGetUsername = () => {
  const { userId } = useGetUserId()
  
  const [username, setUsername] = useState<string>()

  useEffect(() => {
    const getUserId = async () => {
      try {
        const response = await supabase.auth.getUser()
        if (response.data.user) {
          if (response.error) throw response.error
          const { data } = await supabase.from("users").select("username").eq("id", userId)
          if (data && data.length > 0 && data[0]?.username) {
            setUsername(data[0]?.username)
          }
        }
      } catch (error) {
        console.error("getUsername - ", error)
      }
    }
    getUserId()
  }, [])

  return { username, setUsername }
}

export default useGetUsername
