"use client"

import { TPayPalProductsQuery } from "@/api/create-paypal-session/route"
import { Button } from "@/components/ui"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import useCartStore from "@/store/user/cartStore"
import axios, { AxiosError } from "axios"
import { useRouter } from "next/navigation"
import { FaPaypal } from "react-icons/fa"
import { twMerge } from "tailwind-merge"

export function PayWithPaypalButton() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const { isLoading, setIsLoading } = useLoading()

  const payPalProductsQuery = cartStore.productsData
    .filter(product => product.on_stock > 0)
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
        } as TPayPalProductsQuery)
        //redirect user to session.url on client side to avoid 'blocked by CORS' error
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
