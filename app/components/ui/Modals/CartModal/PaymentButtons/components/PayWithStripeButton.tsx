"use client"

import { FaStripeS } from "react-icons/fa"
import { useRouter } from "next/navigation"
import axios from "axios"

import { Button } from "@/components/ui"
import useToast from "@/store/ui/useToast"
import useCartStore from "@/store/user/cartStore"
import { useLoading } from "@/store/ui/useLoading"
import { twMerge } from "tailwind-merge"

export function PayWithStripeButton() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const { isLoading, setIsLoading } = useLoading()

  const stripeProductsQuery = cartStore.productsData
    .filter(product => product.on_stock > 0)
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
        return toast.show(
          "error",
          "Stripe restrictions",
          <p>
            Stripe limits you to make purchase over 1M$
            <br /> Delete products in cart total be less $1,000,000
          </p>,
          10000,
        )
      }
      const stripeResponse = await axios.post("/api/create-checkout-session", { stripeProductsQuery })
      //redirect user to session.url on client side to avoid 'blocked by CORS' error
      router.push(stripeResponse.data)
    } catch (error) {
      if (error instanceof Error) {
        toast.show("error", "Error creating stripe session", error.message)
      }
    }
    setIsLoading(false)
  }

  return (
    <Button
      className={twMerge(
        "flex flex-row gap-x-1 w-full laptop:w-full",
        isLoading && "opacity-50 cursor-default pointer-events-none",
      )}
      variant="info"
      onClick={createCheckoutSession}>
      Stripe
      <FaStripeS />
    </Button>
  )
}
