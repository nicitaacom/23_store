import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import supabase from "../../utils/supabaseClient"

interface UserStore {
  userId: string
  isAuthenticated: boolean
  username: string
  email: string
  profilePictureUrl: string
}

type SetState = (fn: (prevState: UserStore) => UserStore) => void

export const userStore = (set: SetState): UserStore => ({
  userId: "",
  isAuthenticated: false,
  username: "",
  email: "",
  profilePictureUrl: "",
})

const useUserStore = create(devtools(persist(userStore, { name: "userStore" })))

export default useUserStore
