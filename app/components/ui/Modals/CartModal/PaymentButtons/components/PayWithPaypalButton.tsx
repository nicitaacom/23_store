"use client"

import { TPayPalProductsQuery } from "@/api/create-paypal-session/route"
import { Button } from "@/components/ui"
import { useScopedI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import { useRouter } from "next/navigation"
import { FaPaypal } from "react-icons/fa"
import { twMerge } from "tailwind-merge"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

export function PayWithPaypalButton() {
  const t = useScopedI18n("payment")
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const { user } = useUserStore()
  const { isLoading, setIsLoading } = useLoading()

  const payPalProductsQuery = cartStore.productsData
    // .filter(product => product.on_stock > 0)
    .map(product => ({
      price: product.price_id,
      quantity: product.quantity,
    }))
    .map(item => `${encodeURIComponent(JSON.stringify(item))}`)
    .join("&")

  async function createPayPalSessionWithStripe() {
    setIsLoading(true)
    try {
      if (cartStore.getProductsPrice() > 999999) {
        toast.show(
          "error",
          t("error.provider_restrictions", { provider: "PayPal" }),
          <p>
            {t("error.1m$_limit", { provider: "PayPal" })}
            <br /> {t("error.make_total_less_than_1M$")}
          </p>,
          10000,
        )
      } else {
        const payPalResponse = await fetch("/api/create-paypal-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payPalProductsQuery,
            email: user?.email || null,
          } as TPayPalProductsQuery),
        })

        if (!payPalResponse.ok) {
          throw new Error(await getResponseErrorMessage(payPalResponse))
        }

        // redirect user to session.url on client side to avoid 'blocked by CORS' error
        router.push(await payPalResponse.text())
      }
    } catch (error) {
      toast.show("error", t("error.creating_provider_session", { provider: "paypal" }), error instanceof Error ? error.message : String(error))
    }
    setIsLoading(false)
  }

  return (
    <Button
      className={twMerge(
        "group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700",
        "hover:to-blue-800 border-0 text-white font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all",
        isLoading && "opacity-50 cursor-not-allowed",
      )}
      size="lg"
      rounded="lg"
      disabled={isLoading}
      onClick={createPayPalSessionWithStripe}
      rightIcon={<FaPaypal className="text-xl group-hover:scale-110 transition-transform" />}>
      {/* this does not required translation */}
      <span className="relative z-10">PayPal</span>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </Button>
  )
}
