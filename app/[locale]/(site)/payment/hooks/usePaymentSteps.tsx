import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import { formatDeliveryDate } from "@/utils/formatDeliveryDate"
import { substractOnStockFromQuantityFn } from "../functions/substractOnStockFromQuantityFn"
import { sendEmailFn } from "../functions/sendEmailFn"
import { verifySessionIdFn } from "../functions/verifySessionIdFn"
import { renderEmailFn } from "../functions/renderEmailFn"
import { getCustomerEmailFn } from "../functions/getCustomerEmailFn"
import { fetchProductsDataFromDBFn } from "../functions/fetchProductsDataFn"
import { useLoading } from "@/store/ui/useLoading"
import { logFn } from "@/utils/logFn"
import { useFetchProductsData } from "./useFetchProductsData"
import { useI18n } from "@/locales/client"

export const usePaymentSteps = (status: string | null, session_id: string | null) => {
  const router = useRouter()
  const cartStore = useCartStore()
  const userStore = useUserStore()
  const { hasCartStoreInitialized } = useLoading()
  const [isValidSessionId, setIsValidSessionId] = useState(false)
  const [html, setHtml] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const deliveryDate = formatDeliveryDate()
  const t = useI18n()

  const emailData = {
    from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    to: customerEmail,
    subject: t("payment.status"),
    html: html,
  }

  const checkStatusFn = () => {
    if (status === "success") {
      logFn("set step 2")
      setCurrentStep(2)
    } else {
      setCurrentStep(0)
    }
  }

  useFetchProductsData(currentStep, setCurrentStep)

  useEffect(() => {
    switch (currentStep) {
      case 1:
        checkStatusFn()
        break
      case 2:
        getCustomerEmailFn(t, userStore.email, session_id, setCustomerEmail, setCurrentStep)
        break
      case 3:
        fetchProductsDataFromDBFn(hasCartStoreInitialized, currentStep, setCurrentStep, cartStore.fetchProductsData, t)
        break
      case 4:
        renderEmailFn(cartStore.productsData, deliveryDate, setHtml, setCurrentStep, t)
        break
      case 5:
        verifySessionIdFn(setIsValidSessionId, session_id, setCurrentStep, t)
        break
      case 6:
        sendEmailFn(emailData, setCurrentStep, t)
        break
      case 7:
        substractOnStockFromQuantityFn(cartStore.products, cartStore.clearCart, router, t)
        break
      default:
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  return { currentStep, cartStore }
}
