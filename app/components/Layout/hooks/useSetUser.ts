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
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (!user) return

    setUser(normalizeUser(user))
    didRecoverUserRef.current = false
  }, [setUser, user])

  useEffect(() => {
    if (!isMounted || user) return

    async function syncUserFromClient() {
      const {
        data: { user: clientUser },
      } = await supabaseClient.auth.getUser()

      if (!isMounted) return

      if (clientUser) {
        setUser(normalizeUser(clientUser))

        if (!didRecoverUserRef.current) {
          didRecoverUserRef.current = true
          startTransition(() => router.refresh())
        }

        return
      }

      clearUser()
    }

    syncUserFromClient()
  }, [clearUser, isMounted, router, setUser, user])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        logoutUser()
        startTransition(() => router.refresh())
        return
      }

      if (session?.user) {
        setUser(normalizeUser(session.user))

        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          startTransition(() => router.refresh())
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [logoutUser, router, setUser])
}
