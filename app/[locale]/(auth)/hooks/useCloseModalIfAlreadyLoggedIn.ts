import { useRouter, useSearchParams } from "next/navigation"
import useUserStore from "@/store/user/userStore"
import useToast from "@/store/ui/useToast"
import { useI18n } from "@/locales/client"

export const useCloseModalIfAlreadyLoggedIn = (queryParams: "login" | "recover" | "resetPassword" | null) => {
  const toast = useToast()
  const { isAuthenticated } = useUserStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useI18n()

  if (typeof window === "undefined") return // prevent SSR execution

  if (isAuthenticated && queryParams) {
    const modal = searchParams.get("modal")
    const variant = searchParams.get("variant")

    if (modal === "AuthModal" && variant === queryParams) {
      const url = new URL(window.location.href)
      url.searchParams.delete("modal")
      url.searchParams.delete("variant")
      router.replace(url.pathname + url.search, { scroll: false })
    }
    toast.show("warning", t("auth.already_authenticated"), t("auth.already_authenticated_subtitle"))
  }
}
