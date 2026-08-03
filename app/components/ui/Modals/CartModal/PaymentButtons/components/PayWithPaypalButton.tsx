"use client"

import { useRouter } from "next/navigation"
import { FaPaypal } from "react-icons/fa"
import { twMerge } from "tailwind-merge"

import { buildStripeLineName } from "../functions/buildStripeLineName"
import { getVariantImageUrl } from "@/utils/cartProducts"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useCartStore from "@/store/user/cartStore"
import { useLoading } from "@/store/ui/useLoading"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import useUser from "@/store/user/useUser"
import { Button } from "@/components/ui"
import { trackBuyingFlowEvent } from "@/utils/trackBuyingFlowEvent"

// http://localhost:6006/?path=/story/commerce-checkout--cart
export function PayWithPaypalButton() {
  const t = useScopedI18n("payment")
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const { user } = useUser()
  const { isLoading, setIsLoading } = useLoading()

  const payPalProductsQuery = encodeURIComponent(
    JSON.stringify(
      cartStore.productsData.map(product => ({
        imageUrl: getVariantImageUrl(product, product.selectedVariant),
        name: buildStripeLineName(product),
        quantity: product.quantity,
        unitAmount: Math.max(1, Math.round(product.price * 100)),
      })),
    ),
  )

  async function createPayPalSessionWithStripe() {
    trackBuyingFlowEvent({ event: "checkout_click", checkoutKind: "paypal" })
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
        return
      }

      // redirect user to session.url on client side to avoid 'blocked by CORS' error
      const response = await productsSDK.createPayPalSession({
        payPalProductsQuery,
        email: user?.email || null,
      })
      router.push(response)
    } catch (error) {
      toast.show(
        "error",
        t("error.creating_provider_session", { provider: "paypal" }),
        error instanceof Error ? error.message : String(error),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      className={twMerge(
        "group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700",
        "hover:to-blue-800 border-0 text-white font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all",
        isLoading && "opacity-50 cursor-not-allowed",
      )}
      data-cy="pay-with-paypal"
      size="lg"
      rounded="lg"
      disabled={isLoading}
      onClick={createPayPalSessionWithStripe}
      rightIcon={<FaPaypal className="text-xl group-hover:scale-110 transition-transform" />}>
      {/* PayPal is a brand name, not translated */}
      <span className="relative z-10">{"PayPal"}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </Button>
  )
}
