import { Dispatch, SetStateAction } from "react"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { emailsSDK } from "@/sdk/EmailsSDK/EmailsSDK"
import { logFn } from "@/utils/logFn"
import useToast from "@/store/ui/useToast"

interface EmailData {
  from: string
  to: string | null
  subject: string
  html: string
}

export async function sendEmailFn(emailData: EmailData, setCurrentStep: Dispatch<SetStateAction<number>>, t: TI18nFunction) {
  const toast = useToast.getState()

  try {
    await emailsSDK.sendEmail(emailData)

    logFn(t("payment.email_sent"))
    setCurrentStep(7)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(25, t("payment.error.email_sent"), errorMessage)
    toast.show("error", t("payment.error.email_sent"), errorMessage, 15000)
  }
}
