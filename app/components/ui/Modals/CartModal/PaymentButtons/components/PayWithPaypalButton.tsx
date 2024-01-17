"use client"

import { TPayPalProductsQuery } from "@/api/create-paypal-session/route"
import { Button } from "@/components/ui"
import { useLoading } from "@/store/ui/useLoading"
import useCartStore from "@/store/user/cartStore"
import axios from "axios"
import { useRouter } from "next/navigation"
import { FaPaypal } from "react-icons/fa"
import { twMerge } from "tailwind-merge"

export function PayWithPaypalButton() {
  const router = useRouter()
  const cartStore = useCartStore()
  const { isLoading } = useLoading()

  const payPalProductsQuery = cartStore.productsData
    .filter(product => product.on_stock > 0)
    .map(product => ({
      price: product.price_id,
      quantity: product.quantity,
    }))
    .map(item => `${encodeURIComponent(JSON.stringify(item))}`)
    .join("&")

  async function createPayPalSessionWithStripe() {
    const payPalResponse = await axios.post("/api/create-paypal-session", {
      payPalProductsQuery,
    } as TPayPalProductsQuery)
    //redirect user to session.url on client side to avoid 'blocked by CORS' error
    router.push(payPalResponse.data)
  }

  return (
    <Button
      className={twMerge(
        "flex flex-row gap-x-1 w-full laptop:w-full",
        isLoading && "opacity-50 cursor-default pointer-events-none",
      )}
      variant="info"
      onClick={createPayPalSessionWithStripe}>
      PayPal
      <FaPaypal />
    </Button>
  )
}
