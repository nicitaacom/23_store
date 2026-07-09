import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import useUserStore from "@/store/user/userStore"

export const useCloseModalIfAlreadyLoggedIn = (queryParams: "login" | "recover" | "resetPassword" | null) => {
  const toast = useToast()
  const { user } = useUserStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useI18n()
  const showToast = toast.show

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!user || !queryParams) return
    if (!searchParams) return

    const modal = searchParams.get("modal")
    const variant = searchParams.get("variant")
    if (modal !== "AuthModal" || variant !== queryParams) return

    const url = new URL(window.location.href)
    url.searchParams.delete("modal")
    url.searchParams.delete("variant")
    router.replace(url.pathname + url.search, { scroll: false })
    showToast("warning", t("auth.already_authenticated"), t("auth.already_authenticated_subtitle"))
  }, [queryParams, router, searchParams, showToast, t, user])
}
