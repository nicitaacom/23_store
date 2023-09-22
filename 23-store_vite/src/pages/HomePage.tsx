import { useEffect } from "react"
import { Products } from "../components/Products"
import useUserStore from "../store/user/userStore"
import supabase from "../utils/supabaseClient"

export function HomePage() {
  const userStore = useUserStore()

  useEffect(() => {
    if (userStore.userId === "") {
      const userLocalStorage = localStorage.getItem("sb-ambgxbbsgequlwnbzchr-auth-token")
      if (userLocalStorage) {
        const parsedLS = JSON.parse(userLocalStorage)
        userStore.authUser(parsedLS.user.id)
      }
      const authUser = async () => {
        const response = await supabase.auth.getUser()
        if (response.data.user?.id) {
          console.log(19, response.data.user.id)
          const { error: errorUsersInsert } = await supabase.from("users").insert({
            id: response.data.user?.id,
            username: response.data.user?.user_metadata.name,
            email: response.data.user?.user_metadata.email,
            profile_picture_url: response.data.user?.user_metadata.picture,
          })
          const { data, error: errorUsersCartInsert } = await supabase
            .from("users_cart")
            .insert({ id: response.data.user.id })
          if (errorUsersInsert) throw errorUsersInsert
          if (errorUsersCartInsert) throw errorUsersCartInsert
          //that's wrong and should be fixed in branch
          console.log(data)
          userStore.authUser(response.data.user?.id as string)
        }
      }
      authUser()
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12">
      <section className="flex flex-col gap-y-4">
        <Products />
      </section>
    </div>
  )
}
