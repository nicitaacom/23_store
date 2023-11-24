"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"

import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import useToast from "@/store/ui/useToast"
import { formatDeliveryDate } from "@/utils/formatDeliveryDate"
import CheckEmail from "@/emails/CheckEmail"

export default function Payment() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const userStore = useUserStore()

  const params = useSearchParams()?.get("status")

  const deliveryDate = formatDeliveryDate()

  if (!cartStore.products) {
    toast.show("error", "You should not use protected routes!")
    throw Error("You should not use protected routes!")
  }

  cartStore.fetchProductsData()

  useEffect(() => {
    //send check by email
    async function sendEmail() {
      const willbedeletedResponse = await axios.post("/api/")
    }

    //substract on_stock - product.quantity
    async function substractOnStockFromProductQuantity() {}
  })

  return <div>hi</div>
}
