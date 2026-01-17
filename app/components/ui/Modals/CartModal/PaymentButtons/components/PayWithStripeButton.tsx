"use client"

import { FaStripeS } from "react-icons/fa"
import { useRouter } from "next/navigation"
import axios from "axios"

import { Button } from "@/components/ui"
import useToast from "@/store/ui/useToast"
import useCartStore from "@/store/user/cartStore"
import { useLoading } from "@/store/ui/useLoading"
import { twMerge } from "tailwind-merge"
import useUserStore from "@/store/user/userStore"

export function PayWithStripeButton() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const { email } = useUserStore()
  const { isLoading, setIsLoading } = useLoading()

  const stripeProductsQuery = cartStore.productsData
    // .filter(product => product.on_stock > 0)
    .map(product => ({
      price: product.price_id,
      quantity: product.quantity,
    }))
    .map(item => `${encodeURIComponent(JSON.stringify(item))}`)
    .join("&")

  async function createCheckoutSession() {
    setIsLoading(true)
    try {
      if (cartStore.getProductsPrice() > 999999) {
        toast.show(
          "error",
          "Stripe restrictions",
          <p>
            Stripe limits you to make purchase over 1M$
            <br /> Delete products in cart total be less $1,000,000
          </p>,
          10000,
        )
      } else {
        const stripeResponse = await axios.post("/api/create-checkout-session", { stripeProductsQuery, email })
        //redirect user to session.url on client side to avoid 'blocked by CORS' error
        router.push(stripeResponse.data)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.show("error", "Error creating stripe session", error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      className={twMerge(
        "group relative overflow-hidden bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border-0 text-white font-semibold shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 transition-all",
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
