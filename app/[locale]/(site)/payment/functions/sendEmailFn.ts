import { Dispatch, SetStateAction } from "react"

import { TAPISendEmail } from "@/api/send-email/route"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

interface EmailData {
  from: string
  to: string | null
  subject: string
  html: string
}

export async function sendEmailFn(emailData: EmailData, setCurrentStep: Dispatch<SetStateAction<number>>, t: TI18nFunction) {
  const toast = useToast.getState()

  try {
    const response = await fetch("/api/send-email/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailData as TAPISendEmail),
    })

    if (!response.ok) {
      throw new Error(await getResponseErrorMessage(response))
    }

    logFn(t("payment.email_sent"))
    setCurrentStep(7)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(102, t("payment.error.email_sent"), errorMessage)
    toast.show("error", t("payment.error.email_sent"), errorMessage, 15000)
  }
}
