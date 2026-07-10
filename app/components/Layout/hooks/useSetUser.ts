import { startTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"

import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"
import { useHasMounted } from "@/hooks/useHasMounted"
import useUser from "@/store/user/useUser"

async function syncAnonCategoryViews() {
  try {
    const { views, clearViews } = useAnonCategoryViewsStore.getState()
    if (Object.keys(views).length === 0) return
    await categoryViewsSDK.syncDBCategoryViews({ views })
    clearViews()
  } catch {
    /* ignore — non-critical */
  }
}

export function useSetUser(user: User | null) {
  const router = useRouter()
  const userStore = useUser()
  const { setUser, clearUser, logoutUser } = userStore
  const didRecoverUserRef = useRef(false)
  const currentUserRef = useRef<User | null>(user ?? null)
  const isMounted = useHasMounted()

  useEffect(() => {
    currentUserRef.current = user ?? null

    if (!user) return

    setUser(user)
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
        currentUserRef.current = clientUser
        setUser(clientUser)

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
  }, [isMounted, router, user, setUser, clearUser])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      const previousUser = currentUserRef.current
      const nextUser = session?.user ?? null
      const previousUserSignature = JSON.stringify(previousUser)
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

      if (event === "SIGNED_IN" && previousUser?.id !== nextUser.id) {
        syncAnonCategoryViews()
      }

      if (shouldRefresh) {
        startTransition(() => router.refresh())
      }
    })

    return () => subscription.unsubscribe()
  }, [clearUser, logoutUser, router, setUser])
}
