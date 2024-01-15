"use client"

import { FaStripeS } from "react-icons/fa"
import { useRouter } from "next/navigation"
import axios from "axios"

import { Button } from "@/components/ui"
import useToast from "@/store/ui/useToast"
import useCartStore from "@/store/user/cartStore"

export function PayWithStripeButton() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()

  const stripeProductsQuery = cartStore.productsData
    .filter(product => product.on_stock > 0)
    .map(product => ({
      price: product.price_id,
      quantity: product.quantity,
    }))
    .map(item => `${encodeURIComponent(JSON.stringify(item))}`)
    .join("&")

  async function createCheckoutSession() {
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
  }

  return (
    <Button className="flex flex-row gap-x-1 w-full laptop:w-full" variant="info" onClick={createCheckoutSession}>
      Stripe
      <FaStripeS />
    </Button>
  )
}
