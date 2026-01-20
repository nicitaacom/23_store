import axios, { AxiosError } from "axios"
import { Dispatch, SetStateAction } from "react"

import { TAPISendEmail } from "@/api/send-email/route"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

interface EmailData {
  from: string
  to: string | null
  subject: string
  html: string
}

export async function sendEmailFn(emailData: EmailData, setCurrentStep: Dispatch<SetStateAction<number>>, t: TI18nFunction) {
  const toast = useToast.getState()

  try {
    await axios.post("/api/send-email/", emailData as TAPISendEmail)
    logFn(t("payment.email_sent"))
    setCurrentStep(7)
  } catch (error) {
    if (error instanceof AxiosError) {
      console.log(102, t("payment.error.email_sent"), error.response?.data)
      toast.show("error", t("payment.error.email_sent"), error.response?.data, 15000)
    }
  }
}
