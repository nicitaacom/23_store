import { useEffect } from "react"
import { Products } from "../components/Products"
import useUserStore from "../store/user/userStore"
import supabase from "../utils/supabaseClient"

export function HomePage() {
  const userStore = useUserStore()

  useEffect(() => {
    if (userStore.userId === "") {
      const authUser = async () => {
        const response = await supabase.auth.getUser()
        if (response.data.user?.id) {
          await supabase.from("users").insert({
            id: response.data.user?.id,
            username: response.data.user?.user_metadata.name,
            email: response.data.user?.user_metadata.email,
            profile_picture_url: response.data.user?.user_metadata.picture,
          })
          userStore.authUser(response.data.user?.id as string)
        }
      }
      authUser()
    }
  }, [])

  return (
    <div className="text-2xl text-white min-h-screen flex flex-col gap-y-8 justify-between items-center py-12">
      <div className="flex flex-col gap-y-4">
        <Products />
      </div>
    </div>
  )
}
