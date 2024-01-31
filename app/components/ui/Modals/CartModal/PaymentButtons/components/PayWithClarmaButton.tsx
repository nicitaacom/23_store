"use client"

import { SiKlarna } from "react-icons/si"
import { twMerge } from "tailwind-merge"

import useCartStore from "@/store/user/cartStore"
import axios, { AxiosError } from "axios"
import useToast from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"
import { Button } from "@/components/ui"

export function PayWithKlarnaButton() {
  const toast = useToast()
  const cartStore = useCartStore()
  const { isLoading, setIsLoading } = useLoading()

  const klarnaProductsQuery = cartStore.productsData
    .filter(product => product.on_stock > 0)
    .map(product => ({
      price: product.price_id,
      quantity: product.quantity,
    }))
    .map(item => `${encodeURIComponent(JSON.stringify(item))}`)
    .join("&")

  async function createKlarnaSession() {
    setIsLoading(true)
    try {
      const response = await axios.post("/api/create-klarna-session")
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
      onClick={createKlarnaSession}>
      Clarma
      <SiKlarna />
    </Button>
  )
}
