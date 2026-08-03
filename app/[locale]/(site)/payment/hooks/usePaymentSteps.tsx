import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import { getCustomerEmailFn } from "../functions/getCustomerEmailFn"
import { renderEmailFn } from "../functions/renderEmailFn"
import { selectProductsDataForReceipt } from "../functions/selectProductsDataForReceipt"
import { sendEmailFn } from "../functions/sendEmailFn"
import { substractOnStockFromQuantityFn } from "../functions/substractOnStockFromQuantityFn"
import { verifySessionIdFn } from "../functions/verifySessionIdFn"
import { formatDeliveryDate } from "@/utils/formatDeliveryDate"
import { personalizedDesignsSDK } from "@/sdk/PersonalizedDesignsSDK/PersonalizedDesignsSDK"
import useCartStore from "@/store/user/cartStore"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import usePurchasedProductsStore from "@/store/user/usePurchasedProductsStore"
import useUser from "@/store/user/useUser"

export const usePaymentSteps = (status: string | null, sessionId: string | null) => {
  const router = useRouter()
  const cartStore = useCartStore()
  const { user } = useUser()
  const { addPurchasedProducts } = usePurchasedProductsStore()
  const { hasCartStoreInitialized } = useLoading()
  const [html, setHtml] = useState("")
  const [currentStep, setCurrentStep] = useState(() => (status === "success" ? 2 : 0))
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const [receiptProducts, setReceiptProducts] = useState<TProductAfterDB[]>([])
  const deliveryDate = formatDeliveryDate()
  const t = useI18n()
  const locale = useCurrentLocale()

  const emailData = {
    from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    to: customerEmail,
    subject: t("payment.status"),
    html: html,
  }

  useEffect(() => {
    switch (currentStep) {
      case 2:
        getCustomerEmailFn(t, user?.email || null, sessionId, setCustomerEmail, setCurrentStep)
        break
      case 3:
        selectProductsDataForReceipt(
          hasCartStoreInitialized,
          currentStep,
          setCurrentStep,
          cartStore.selectProductsData,
          setReceiptProducts,
          t,
        )
        break
      case 4:
        renderEmailFn(receiptProducts, locale, deliveryDate, setHtml, setCurrentStep, t)
        break
      case 5:
        verifySessionIdFn(sessionId, setCurrentStep, t)
        break
      case 6:
        sendEmailFn(emailData, setCurrentStep, t)
        break
      case 7:
        // Record what was bought (client-side) so the user can rate these products afterwards
        addPurchasedProducts([...new Set(Object.values(cartStore.products).map(product => product.id))])
        // A paid design stops being a draft - this is what turns it into a print job for the owner.
        // The payment is already through, so a failure here is reported and the steps continue -
        // among them the 503 the route answers with when 23_personalized_designs does not exist yet.
        void personalizedDesignsSDK
          .updateDBDesignsToOrdered({
            design_ids: Object.values(cartStore.products)
              .map(product => product.designId)
              .filter((designId): designId is string => Boolean(designId)),
          })
          .catch(error => console.error("[usePaymentSteps] design status update failed", error))
        substractOnStockFromQuantityFn(cartStore.products, cartStore.clearCart, router, t)
        break
      default:
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, hasCartStoreInitialized])

  return { currentStep, cartStore }
}
