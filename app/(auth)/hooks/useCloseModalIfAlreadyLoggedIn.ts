import { useRouter, useSearchParams } from "next/navigation"
import useUserStore from "@/store/user/userStore"
import useToast from "@/store/ui/useToast"

export const useCloseModalIfAlreadyLoggedIn = (queryParams: "login" | "recover" | "resetPassword" | null) => {
  const toast = useToast()
  const { isAuthenticated } = useUserStore()
  const searchParams = useSearchParams()
  const router = useRouter()

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
    toast.show(
      "warning",
      "Already authenticated",
      "If you want to login to another account - logout - then login into another one",
    )
  }
}
