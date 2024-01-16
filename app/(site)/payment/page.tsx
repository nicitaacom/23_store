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
import { renderAsync } from "@react-email/components"
import { useLoading } from "@/store/ui/useLoading"

export default function Payment() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const userStore = useUserStore()
  const status = useSearchParams()?.get("status")
  const session_id = useSearchParams()?.get("session_id")
  const deliveryDate = formatDeliveryDate()
  const [isValidSessionId, setIsValidSessionId] = useState(false)
  const [html, setHtml] = useState("")
  const { isLoading, setIsLoading } = useLoading()

  const emailData = {
    from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    to: userStore.email,
    subject: "Payment Status",
    html: html,
  }

  // 1/2 Prevent somebody accessing to this route to make success payment without paying
  useEffect(() => {
    if (!cartStore.products || Object.keys(cartStore.products).length === 0) {
      toast.show(
        "error",
        "You should not use protected routes!",
        <p>
          Please add some products to cart and
          <br /> buy products through payment
        </p>,
        12000,
      )
      router.replace("/")
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // prefetch / route cause will be redirect to that route
  useEffect(() => {
    router.prefetch("/")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    // 1. Fetch products data to render TSX to html in email to pass this data in email
    async function fetchProductsDataFromDB() {
      setIsLoading(true)
      await cartStore.fetchProductsData()
      setIsLoading(false)
      setCurrentStep(2)
    }

    // 2. Render TSX to html
    async function renderEmail() {
      if (cartStore.productsData.length > 0) {
        const emailMessageString = await renderAsync(
          <CheckEmail products={cartStore.productsData} deliveryDate={deliveryDate} />,
          {
            pretty: true,
          },
        )
        setHtml(emailMessageString)
        setCurrentStep(3)
      }
    }

    // 3. Send email
    async function sendEmailFunction() {
      await verifySessionId()
      if (isValidSessionId && status === "success" && html) {
        await sendEmail()
        await substractOnStockFromProductQuantity()
      }
    }

    switch (currentStep) {
      case 1:
        fetchProductsDataFromDB()
        break
      case 2:
        renderEmail()
        break
      case 3:
        sendEmailFunction()
        break
      default:
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, cartStore.productsData, deliveryDate, isValidSessionId, status, html])

  /* ------------ FUNCTIONS ------------- */

  // 2/2 verifySessionId to prevent not authorized payment e.g user enter random not valid session_id
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

  async function sendEmail() {
    try {
      await axios.post("/api/send-email", {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: html,
      } as TAPISendEmail)
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

  if (!cartStore.products || Object.keys(cartStore.products).length === 0) {
    return null
  }

  return <div>hi</div>
}
