import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import supabase from "../../utils/supabaseClient"

interface UserStore {
  userId: string
  isAuthenticated: boolean
  username: string
  email: string
  profilePictureUrl: string
  authUser: (userId: string) => void
  logoutUser: () => void
}

export const authUser = async (userId: string) => {
  const response = await supabase.from("users").select("*").eq("id", userId)
  return (
    response.data && {
      isAuthenticated: true,
      profilePictureUrl: response.data[0].profile_picture_url ? response.data[0].profile_picture_url : "",
      username: response.data[0].username,
      userId: response.data[0].id,
      email: response.data[0].email,
    }
  )
}

export const OAuthUser = async () => {
  await supabase.auth.signInWithOAuth({ provider: "google" })
  const response = await supabase.auth.getUser()
  return response && response
}

export const logoutUser = () => {
  return {
    isAuthenticated: false,
    profilePictureUrl: "",
    username: "",
    userId: "",
  }
}

type SetState = (fn: (prevState: UserStore) => UserStore) => void

export const userStore = (set: SetState): UserStore => ({
  userId: "",
  isAuthenticated: false,
  username: "",
  email: "",
  profilePictureUrl: "",
  async authUser(userId: string) {
    const response = await authUser(userId)
    set((state: UserStore) => ({
      ...state,
      ...response,
    }))
  },
  logoutUser() {
    set((state: UserStore) => ({
      ...state,
      ...logoutUser(),
    }))
  },
})

const useUserStore = create(devtools(persist(userStore, { name: "userStore" })))

export default useUserStore
