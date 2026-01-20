import { Dispatch, SetStateAction } from "react"
import axios, { AxiosError } from "axios"

import { TAPIVerifyPayment, TAPIVerifyPaymentResponse } from "@/api/verify-payment/route"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

export async function verifySessionIdFn(
  setIsValidSessionId: Dispatch<SetStateAction<boolean>>,
  session_id: string | null,
  setCurrentStep: Dispatch<SetStateAction<number>>,
  t: TI18nFunction,
) {
  const toast = useToast.getState()

  if (session_id) {
    try {
      const response: TAPIVerifyPaymentResponse = await axios.post(`/api/verify-payment`, {
        session_id,
      } as TAPIVerifyPayment)
      setIsValidSessionId(response.data.valid)
      logFn(t("payment.session_id_is_valid"))
      setCurrentStep(6)
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data.includes("No such checkout.session")) {
        toast.show("error", t("payment.error.session_id_is_valid_title"), t("payment.error.session_id_is_valid_subtitle"))
      } else if (error instanceof AxiosError) {
        toast.show("error", t("payment.error.session_id_is_valid_title"), error.response?.data)
      }
    }
  }
}
