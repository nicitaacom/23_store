import { Dispatch, SetStateAction } from "react"
import { renderAsync } from "@react-email/render"

import CheckEmail from "@/emails/CheckEmail"
import { TProductAfterDB } from "@/TS/product/TProductAfterDB"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"

export async function renderEmailFn(
  productsData: TProductAfterDB[],
  deliveryDate: string,
  setHtml: Dispatch<SetStateAction<string>>,
  setCurrentStep: Dispatch<SetStateAction<number>>,
) {
  const toast = useToast.getState()

  if (productsData.length > 0) {
    try {
      const emailMessageString = await renderAsync(<CheckEmail products={productsData} deliveryDate={deliveryDate} />, {
        pretty: true,
      })
      setHtml(emailMessageString)
      logFn("email rendered - set step 5")
      setCurrentStep(5)
    } catch (error) {
      if (error instanceof Error) {
        console.log(23, "error rendering email - ", error.message)
      }
    }
  } else {
    toast.show("error", "Error rendering email", "Please contact support")
  }
}
