import { startTransition, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"

import supabaseClient from "@/libs/supabase/supabaseClient"
import useUserStore from "@/store/user/userStore"
import { normalizeUser } from "@/utils/user"

export function useSetUser(user: User | null) {
  const router = useRouter()
  const userStore = useUserStore()
  const { setUser, clearUser, logoutUser } = userStore
  const didRecoverUserRef = useRef(false)
  const currentUserRef = useRef<User | null>(normalizeUser(user))
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    const normalizedUser = normalizeUser(user)
    currentUserRef.current = normalizedUser

    if (!normalizedUser) return

    setUser(normalizedUser)
    didRecoverUserRef.current = false
  }, [setUser, user])

  useEffect(() => {
    if (!isMounted || user) return

    async function syncUserFromClient() {
      const {
        data: { user: clientUser },
      } = await supabaseClient.auth.getUser()

      if (!isMounted) return

      const normalizedClientUser = normalizeUser(clientUser)

      if (normalizedClientUser) {
        currentUserRef.current = normalizedClientUser
        setUser(normalizedClientUser)

        if (!didRecoverUserRef.current) {
          didRecoverUserRef.current = true
          startTransition(() => router.refresh())
        }

        return
      }

      currentUserRef.current = null
      clearUser()
    }

    syncUserFromClient()
  }, [clearUser, isMounted, router, setUser, user])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      const previousUser = currentUserRef.current
      const nextUser = normalizeUser(session?.user)
      const previousUserSignature = JSON.stringify(normalizeUser(previousUser))
      const nextUserSignature = JSON.stringify(nextUser)

      if (event === "SIGNED_OUT") {
        currentUserRef.current = null
        logoutUser()
        startTransition(() => router.refresh())
        return
      }

      if (!nextUser) {
        currentUserRef.current = null
        clearUser()
        return
      }

      currentUserRef.current = nextUser

      if (previousUserSignature !== nextUserSignature) {
        setUser(nextUser)
      }

      const shouldRefresh =
        (event === "SIGNED_IN" && previousUser?.id !== nextUser.id) ||
        (event === "USER_UPDATED" && previousUserSignature !== nextUserSignature)

      if (shouldRefresh) {
        startTransition(() => router.refresh())
      }
    })

    return () => subscription.unsubscribe()
  }, [clearUser, logoutUser, router, setUser])
}
