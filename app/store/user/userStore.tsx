import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface UserStore {
  userId: string
  isAuthenticated: boolean
  username: string
  email: string
  profilePictureUrl: string
  setUser: (userId: string, username: string, email: string, profilePictureUrl: string) => void
}

type SetState = (fn: (prevState: UserStore) => UserStore) => void

export const userStore = (set: SetState): UserStore => ({
  userId: "",
  isAuthenticated: false,
  username: "",
  email: "",
  profilePictureUrl: "",
  setUser(userId: string, username: string, email: string, profilePictureUrl: string) {
    set((state: UserStore) => ({
      ...state,
      userId: userId,
      username: username,
      email: email,
      profilePictureUrl: profilePictureUrl,
    }))
  },
})

const useUserStore = create(devtools(persist(userStore, { name: "userStore" })))

export default useUserStore
