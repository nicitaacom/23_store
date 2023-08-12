import { useEffect, useState } from "react"
import supabase from "../utils/supabaseClient"

const useGetUserId = () => {
  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    const getUserId = async () => {
      try {
        const response = await supabase.auth.getUser()
        if (response.data.user) {
          if (response.error) throw response.error
          setUserId(response.data.user?.id)
        }
      } catch (error) {
        console.error("getUserId - ", error)
      }
    }
    getUserId()
  }, [])

  return { userId }
}

export default useGetUserId
