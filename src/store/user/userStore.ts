import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import supabase from "../../utils/supabaseClient"

interface UserStore {
  isAuthenticated: boolean
  profilePictureUrl: string
  username: string
  userId: string
  authUser: (userId: string) => void
  authUserWithProvider: () => void
  logoutUser: () => void
}

export const authUser = async (userId: string) => {
  const response = await supabase.from("users").select("*").eq("id", userId)
  console.log(response.data)
  return response.data && {
    isAuthenticated: true,
    profilePictureUrl: response.data[0].profile_picutre_url ? response.data[0].profile_picutre_url : "",
    username: response.data[0].username,
    userId: response.data[0].id
  }
}

export const authUserWithProvider = async () => {
  await supabase.auth.signInWithOAuth({ provider: "google" })
  const response = await supabase.auth.getUser()
  return response && response
}

export const logoutUser = () => {
  return {
    isAuthenticated: false,
    profilePictureUrl: "",
    username: "",
    userId: ""
  }
}


type SetState = (fn: (prevState: UserStore) => UserStore) => void

export const userStore = (set: SetState): UserStore => ({
  isAuthenticated: false,
  profilePictureUrl: "",
  username: "",
  userId: "",
  async authUser(userId: string) {
    const response = await authUser(userId)
    set((state: UserStore) => ({
      ...state,
      ...response
    }))
  },
  logoutUser() {
    set((state: UserStore) => ({
      ...state,
      ...logoutUser()
    }))
  },
  async authUserWithProvider() {
    const response = await authUserWithProvider()
    set((state: UserStore) => ({
      ...statem
    }))
  }
})

const useUserStore = create(devtools(persist(userStore, { name: "userStore" })))

export default useUserStore
