import { Dispatch, SetStateAction } from "react"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"

export async function verifySessionIdFn(
  setIsValidSessionId: Dispatch<SetStateAction<boolean>>,
  session_id: string | null,
  setCurrentStep: Dispatch<SetStateAction<number>>,
  t: TI18nFunction,
) {
  const toast = useToast.getState()

  if (session_id) {
    try {
      const data = await productsSDK.verifyPayment({ session_id })
      setIsValidSessionId(data.valid)
      logFn(t("payment.session_id_is_valid"))
      setCurrentStep(6)
    } catch (error) {
      if (error instanceof Error && error.message.includes("No such checkout.session")) {
        toast.show("error", t("payment.error.session_id_is_valid_title"), t("payment.error.session_id_is_valid_subtitle"))
      } else if (error instanceof Error) {
        toast.show("error", t("payment.error.session_id_is_valid_title"), error.message)
      }
    }
  }
}
