import { Dispatch, SetStateAction } from "react"

import { TAPICustomer, TAPICustomerData } from "@/api/customer/route"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

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
      const response = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id } as TAPICustomer),
      })

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response))
      }

      const { customerEmail } = (await response.json()) as TAPICustomerData
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
