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
import { TAPISendEmail } from "@/api/send-email/check/route"
import { renderAsync } from "@react-email/render"
import { TAPIPaymentSuccess } from "@/api/payment/success/route"
import Image from "next/image"
import { Timer } from "@/(auth)/AuthModal/components/Timer"
import { TAPICustomer, TAPICustomerResponse } from "@/api/customer/route"

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
  const [currentStep, setCurrentStep] = useState(1)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)

  const emailData = {
    from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    to: customerEmail,
    subject: "Payment Status",
    html: html,
  }

  // TODO - fix random bug when cart get initial state {} (sometimes I pay in test mode and it throw error)
  // 1/2 Prevent somebody accessing to this route to make success payment without paying
  useEffect(() => {
    if (!cartStore.products || Object.values(cartStore.products).length === 0) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // prefetch / route cause will be redirect to that route
  useEffect(() => {
    router.prefetch("/")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  //TODO - fix bug when to do this function required more then 5s

  // Send email - substract on_stock - product.quantity - clear cart
  useEffect(() => {
    // 1. Check is payment status === 'success'

    function checkStatus() {
      if (status === "success") {
        setCurrentStep(2)
      } else {
        setCurrentStep(0)
      }
    }

    // 2. Get customer email to send check
    // Get customer email
    async function getCustomerEmail() {
      if (userStore.email) {
        setCustomerEmail(userStore.email)
      } else {
        const {
          data: { customerEmail },
        }: TAPICustomerResponse = await axios.post("/api/customer", {
          session_id: session_id,
        } as TAPICustomer)
        if (customerEmail) {
          setCustomerEmail(customerEmail)
        }
      }
      setCurrentStep(3)
    }

    // 3. Fetch products data to render TSX to html in email to pass this data in email
    async function fetchProductsDataFromDB() {
      await cartStore.fetchProductsData()
      setCurrentStep(4)
    }

    // 4. Render TSX to html
    async function renderEmail() {
      if (cartStore.productsData.length > 0) {
        const emailMessageString = await renderAsync(
          <CheckEmail products={cartStore.productsData} deliveryDate={deliveryDate} />,
          {
            pretty: true,
          },
        )
        setHtml(emailMessageString)
        setCurrentStep(5)
      } else {
        toast.show("error", "Error rendering email", "Please contact support")
      }
    }

    // 5. Verify session to make sure user realy paid instead on entered random session_id
    async function verifySessionIdFunction() {
      await verifySessionId()
      setCurrentStep(6)
    }

    // 6. Send email
    async function sendEmailFunction() {
      if (isValidSessionId && status === "success" && html) {
        await sendEmail()
        setCurrentStep(7)
      }
    }

    // 7. Substract on_stock from product.quantity in DB
    async function substractOnStockFromProductQuantityFunction() {
      await substractOnStockFromProductQuantity()
      cartStore.clearCart()
      router.replace("/")
      setCurrentStep(0)
    }

    switch (currentStep) {
      case 1:
        checkStatus()
        break
      case 2:
        getCustomerEmail()
        break
      case 3:
        fetchProductsDataFromDB()
        break
      case 4:
        renderEmail()
        break
      case 5:
        verifySessionIdFunction()
      case 6:
        sendEmailFunction()
      case 7:
        substractOnStockFromProductQuantityFunction()
        break
      default:
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

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
    }
  }

  async function sendEmail() {
    try {
      await axios.post("/api/send-email/check", {
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
    try {
      await axios.post("/api/payment/success", {
        cartProducts: cartStore.products,
      } as TAPIPaymentSuccess)
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(158, error.response?.data)
        toast.show("error", "Error substracting on stock from product quantity", error.response?.data, 15000)
      }
    }
  }

  if (!cartStore.products || Object.keys(cartStore.products).length === 0) {
    return null
  }

  return (
    <section
      className="absolute left-[50%] top-[50%] translate-x-[-50%]
     translate-y-[-100%] tablet:translate-y-[-75%] laptop:translate-y-[-50%] 
    flex flex-col text-center justify-center items-center w-full">
      {status === "success" ? (
        <>
          <Image
            src="/success-checkmark.gif"
            alt="Success Checkmark"
            width={256}
            height={256}
            style={{ width: "auto" }}
            priority
          />
          <h1 className="text-2xl mb-2">Your payment is successful</h1>
          <p>Check snet to your email 📨</p>
          <p className="flex flex-row">
            Redirecting to home page in <Timer seconds={4} action={() => router.replace("/")} />
          </p>
        </>
      ) : (
        <>
          <Image
            src="/error-checkmark.gif"
            alt="Error Checkmark"
            width={256}
            height={256}
            style={{ width: "auto" }}
            priority
          />
          <h1 className="text-2xl mb-2">Your payment was canceled</h1>
          <p className="flex flex-row">
            Redirecting to home page in <Timer seconds={4} action={() => router.replace("/")} />
          </p>
        </>
      )}
    </section>
  )
}
