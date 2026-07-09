import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { fetchProductsDataFromDBFn } from "../functions/fetchProductsDataFn"
import { getCustomerEmailFn } from "../functions/getCustomerEmailFn"
import { renderEmailFn } from "../functions/renderEmailFn"
import { sendEmailFn } from "../functions/sendEmailFn"
import { substractOnStockFromQuantityFn } from "../functions/substractOnStockFromQuantityFn"
import { useFetchProductsData } from "./useFetchProductsData"
import { verifySessionIdFn } from "../functions/verifySessionIdFn"
import { formatDeliveryDate } from "@/utils/formatDeliveryDate"
import { logFn } from "@/utils/logFn"
import useCartStore from "@/store/user/cartStore"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import usePurchasedProductsStore from "@/store/user/purchasedProductsStore"
import useUserStore from "@/store/user/userStore"

export const usePaymentSteps = (status: string | null, session_id: string | null) => {
  const router = useRouter()
  const cartStore = useCartStore()
  const { user } = useUserStore()
  const { addPurchasedProducts } = usePurchasedProductsStore()
  const { hasCartStoreInitialized } = useLoading()
  const [isValidSessionId, setIsValidSessionId] = useState(false)
  const [html, setHtml] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const deliveryDate = formatDeliveryDate()
  const t = useI18n()
  const locale = useCurrentLocale()

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
        getCustomerEmailFn(t, user?.email || null, session_id, setCustomerEmail, setCurrentStep)
        break
      case 3:
        fetchProductsDataFromDBFn(hasCartStoreInitialized, currentStep, setCurrentStep, cartStore.fetchProductsData, t)
        break
      case 4:
        renderEmailFn(cartStore.productsData, locale, deliveryDate, setHtml, setCurrentStep, t)
        break
      case 5:
        verifySessionIdFn(setIsValidSessionId, session_id, setCurrentStep, t)
        break
      case 6:
        sendEmailFn(emailData, setCurrentStep, t)
        break
      case 7:
        // Record what was bought (client-side) so the user can rate these products afterwards
        addPurchasedProducts([...new Set(Object.values(cartStore.products).map(product => product.id))])
        substractOnStockFromQuantityFn(cartStore.products, cartStore.clearCart, router, t)
        break
      default:
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  return { currentStep, cartStore }
}
