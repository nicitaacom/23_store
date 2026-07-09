import { useEffect } from "react"
import { useRouter } from "next/navigation"

import useCartStore from "@/store/user/cartStore"
import { useLoading } from "@/store/ui/useLoading"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"

export const useNoProductsRedirect = () => {
  const router = useRouter()
  const cartStore = useCartStore()
  const toast = useToast()
  const { hasCartStoreInitialized } = useLoading()
  const t = useScopedI18n("payment")

  useEffect(() => {
    if (!hasCartStoreInitialized) return

    if (!cartStore.products || Object.values(cartStore.products).length === 0) {
      toast.show(
        "warning",
        t("warning.do_not_use_protected_routes_title"),
        <p>
          {t("warning.do_not_use_protected_routes_subtitle_l1")}
          <br /> {t("warning.do_not_use_protected_routes_subtitle_l2")}
        </p>,
        12000,
      )
      router.replace("/")
    }
    router.prefetch("/")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCartStoreInitialized])
}
