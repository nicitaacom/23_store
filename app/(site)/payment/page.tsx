"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios, { AxiosError } from "axios"

import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import useToast from "@/store/ui/useToast"
import { formatDeliveryDate } from "@/utils/formatDeliveryDate"
import CheckEmail from "@/emails/CheckEmail"
import { TAPIVerifyPayment, TAPIVerifyPaymentResponse } from "@/api/verify-payment/route"
import { TAPISendEmail } from "@/api/send-email/route"
import { render } from "@react-email/render"

export default function Payment() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const userStore = useUserStore()
  const decordedUrl = decodeURIComponent(location.href)
  const status = useSearchParams()?.get("status")
  const session_id = useSearchParams()?.get("session_id")
  const deliveryDate = formatDeliveryDate()
  const [isValidSessionId, setIsValidSessionId] = useState(false)

  const emailMessageString = render(<CheckEmail products={cartStore.productsData} deliveryDate={deliveryDate} />, {
    pretty: true,
  })

  const emailData = {
    from: "support@nicitaa.com",
    to: userStore.email,
    subject: "Payment Status",
    html: emailMessageString,
  }

  // 1/2 Prevent somebody accessing to this route to make success payment without paying
  if (!cartStore.products) throw Error("You should not use protected routes!")

  if (!cartStore.products) {
    toast.show("error", "You should not use protected routes!")
    throw Error("You should not use protected routes!")
  }

  // prefetch / route cause will be redirect to that route
  useEffect(() => {
    router.prefetch("/")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Send email
  useEffect(() => {
    // 2/2 Prevent somebody accessing to this route to make success payment without paying
    verifySessionId()
    if (isValidSessionId && status === "success") {
      sendEmail()
      //substract on_stock - product.quantity
      substractOnStockFromProductQuantity()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------------ FUNCTIONS ------------- */

  async function verifySessionId() {
    if (session_id) {
      try {
        const response: TAPIVerifyPaymentResponse = await axios.post(`/api/verify-payment`, {
          session_id: session_id,
        } as TAPIVerifyPayment)

        if (response.data.valid) {
          setIsValidSessionId(true)
        } else {
          setIsValidSessionId(false)
        }
      } catch (error) {
        if (error instanceof AxiosError && error.response?.data.includes("No such checkout.session")) {
          toast.show(
            "error",
            "Error verifying payment",
            "Please don't enter random session id trying to hack system - PAY FOR YOUR ORDER",
          )
        } else if (error instanceof AxiosError) {
          toast.show("error", "Error verifying payment", error.response?.data)
        }
      }
    } else {
      toast.show("error", "You should not use protected routes!", "Please don't do that and pay for your order")
    }
  }
  // to prevent not authorized payment e.g user enter random not valid session_id

  async function sendEmail() {
    try {
      await axios.post("/api/send-email", emailData as TAPISendEmail)
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(102, error.response?.data)
        toast.show("error", "Error sending email", error.response?.data, 15000)
      }
    }
  }

  async function substractOnStockFromProductQuantity() {
    console.log(88, "substract product quantity from on_stock")
  }

  return <div>hi</div>
}
