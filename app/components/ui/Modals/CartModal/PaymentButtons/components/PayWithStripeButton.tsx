"use client"

import { FaStripeS } from "react-icons/fa"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui"
import useToast from "@/store/ui/useToast"
import useCartStore from "@/store/user/cartStore"
import { useLoading } from "@/store/ui/useLoading"
import { twMerge } from "tailwind-merge"
import useUserStore from "@/store/user/userStore"
import { useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"

export function PayWithStripeButton() {
  const t = useScopedI18n("payment")
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const { user } = useUserStore()
  const { isLoading, setIsLoading } = useLoading()

  const stripeProductsQuery = encodeURIComponent(
    JSON.stringify(
      cartStore.productsData.map(product => ({
        imageUrl: product.selectedVariant?.image_url || product.img_url[0] || null,
        name: product.selectedVariant ? `${product.translations.fi.title} - ${product.selectedVariant.label}` : product.translations.fi.title,
        quantity: product.quantity,
        unitAmount: Math.max(1, Math.round(product.price * 100)),
      })),
    ),
  )

  async function createCheckoutSession() {
    setIsLoading(true)
    try {
      if (cartStore.getProductsPrice() > 999999) {
        toast.show(
          "error",
          t("error.provider_restrictions", { provider: "Stripe" }),
          <p>
            {t("error.1m$_limit", { provider: "Stripe" })}
            <br /> {t("error.make_total_less_than_1M$")}
          </p>,
          10000,
        )
      } else {
        //redirect user to session.url on client side to avoid 'blocked by CORS' error
        router.push(
          await productsSDK.createCheckoutSession({
            stripeProductsQuery,
            email: user?.email || null,
          }),
        )
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.show("error", t("error.creating_provider_session", { provider: "stripe" }), error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      className={twMerge(
        "group relative overflow-hidden bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800",
        "border-0 text-white font-semibold shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 transition-all",
        isLoading && "opacity-50 cursor-not-allowed",
      )}
      size="lg"
      rounded="lg"
      disabled={isLoading}
      onClick={createCheckoutSession}
      rightIcon={<FaStripeS className="text-xl group-hover:scale-110 transition-transform" />}>
      <span className="relative z-10">Stripe</span>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </Button>
  )
}
