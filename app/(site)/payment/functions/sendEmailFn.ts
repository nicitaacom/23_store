import axios, { AxiosError } from "axios"
import { Dispatch, SetStateAction } from "react"

import { TAPISendEmail } from "@/api/send-email/route"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"

interface EmailData {
  from: string
  to: string | null
  subject: string
  html: string
}

export async function sendEmailFn(emailData: EmailData, setCurrentStep: Dispatch<SetStateAction<number>>) {
  const toast = useToast.getState()

  try {
    await axios.post("/api/send-email/", emailData as TAPISendEmail)
    logFn("email sent - set step 7")
    setCurrentStep(7)
  } catch (error) {
    if (error instanceof AxiosError) {
      console.log(102, "Error sending email - ", error.response?.data)
      toast.show("error", "Error sending email", error.response?.data, 15000)
    }
  }
}
