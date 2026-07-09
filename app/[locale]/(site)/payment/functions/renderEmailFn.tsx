import { Dispatch, SetStateAction } from "react"
import { renderAsync } from "@react-email/render"

import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import useToast from "@/store/ui/useToast"
import CheckEmail from "@/emails/CheckEmail"
import { logFn } from "@/utils/logFn"

export async function renderEmailFn(
  productsData: TProductAfterDB[],
  locale: string,
  deliveryDate: string,
  setHtml: Dispatch<SetStateAction<string>>,
  setCurrentStep: Dispatch<SetStateAction<number>>,
  t: TI18nFunction,
) {
  const toast = useToast.getState()

  if (productsData.length > 0) {
    try {
      const emailMessageString = await renderAsync(
        <CheckEmail
          products={productsData}
          locale={locale}
          deliveryDate={deliveryDate}
          previewText={t("payment.email.thank_you_for_your_purchase")}
          orderConfirmed={t("payment.email.order_confirmed")}
          willBeDelivered={t("payment.email.order_will_be_delivered_on")}
          weKeepYouUpdated={t("payment.email.we_will_keep_you_updated")}
          quantityText={t("payment.email.quantity")}
          feedbackText={t("payment.email.feedback")}
          supportText={t("payment.email.support")}
          totalText={t("payment.email.total")}
          trackYourOrder={t("payment.email.track_your_order")}
          allRightsReserved={t("payment.email.all_rights_reserved")}
        />,
        {
          pretty: true,
        },
      )
      setHtml(emailMessageString)
      logFn(t("payment.email_rendered"))
      setCurrentStep(5)
    } catch (error) {
      if (error instanceof Error) {
        console.log(47, t("payment.error.render_email_title"), error.message)
      }
    }
  } else {
    toast.show("error", t("payment.error.render_email_title"), t("payment.error.render_email_subtitle"))
  }
}
