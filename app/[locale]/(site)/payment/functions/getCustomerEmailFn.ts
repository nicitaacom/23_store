import { Dispatch, SetStateAction } from "react"

import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

export async function getCustomerEmailFn(
  t: TI18nFunction,
  email: string | null,
  session_id: string | null,
  setCustomerEmail: Dispatch<SetStateAction<string | null>>,
  setCurrentStep: Dispatch<SetStateAction<number>>,
) {
  const toast = useToast.getState()

  if (email) {
    setCustomerEmail(email)
    logFn(t("payment.customer_email_received"))
    setCurrentStep(3)
  } else {
    try {
      const { customerEmail } = await productsSDK.getCustomerEmail({ session_id })
      if (customerEmail) {
        setCustomerEmail(customerEmail)
      }
      logFn(t("payment.customer_email_received"))
      setCurrentStep(3)
    } catch (error) {
      if (error instanceof Error) {
        toast.show("error", t("payment.error.receive_customer_email_title"), t("payment.error.receive_customer_email_subtitle"))
      }
    }
  }
}
