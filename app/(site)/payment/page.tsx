"use client"

import { useRouter } from "next/navigation"
import { render } from "@react-email/render"

import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import { getURL } from "@/utils/helpers"
import { useSearchParams } from "next/navigation"
import { formatDeliveryDate } from "@/utils/formatDeliveryDate"
import useToast from "@/store/ui/useToast"

export default function Payment() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const userStore = useUserStore()
  const url = getURL()
  const params = useSearchParams().get("status")

  const deliveryDate = formatDeliveryDate()

  if (!cartStore.products) {
    toast.show("error", "You should not use protected routes!")
    throw Error("You should not use protected routes!")
  }

  return <div>hi</div>
}
