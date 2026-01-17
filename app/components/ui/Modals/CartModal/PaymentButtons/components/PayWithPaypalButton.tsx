"use client"

import { TPayPalProductsQuery } from "@/api/create-paypal-session/route"
import { Button } from "@/components/ui"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import axios, { AxiosError } from "axios"
import { useRouter } from "next/navigation"
import { FaPaypal } from "react-icons/fa"
import { twMerge } from "tailwind-merge"

export function PayWithPaypalButton() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const userStore = useUserStore()
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
          "Stripe restrictions",
          <p>
            Paypal limits you to make purchase over 1M$
            <br /> Delete products in cart total be less $1,000,000
          </p>,
          10000,
        )
      } else {
        const payPalResponse = await axios.post("/api/create-paypal-session", {
          payPalProductsQuery,
          email: userStore.email,
        } as TPayPalProductsQuery)

        // redirect user to session.url on client side to avoid 'blocked by CORS' error
        router.push(payPalResponse.data)
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.show("error", "Error creating paypal session", error.response?.data)
      }
    }
    setIsLoading(false)
  }

  return (
    <Button
      className={twMerge(
        "group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 text-white font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all",
        isLoading && "opacity-50 cursor-not-allowed",
      )}
      size="lg"
      rounded="lg"
      disabled={isLoading}
      onClick={createPayPalSessionWithStripe}
      rightIcon={<FaPaypal className="text-xl group-hover:scale-110 transition-transform" />}>
      <span className="relative z-10">PayPal</span>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </Button>
  )
}
