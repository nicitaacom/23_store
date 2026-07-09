import { renderAsync } from "@react-email/render"

import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { emailsSDK } from "@/sdk/EmailsSDK/EmailsSDK"
import { useToast } from "@/store/ui"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"
import { RequestBetterPricesEmail } from "@/emails/RequestBetterPricesEmail"

export async function requestBetterPrices(
  t: TI18nFunction,
  products: TProductAfterDB[],
  totalPrice: number,
  userEmail: string | null,
) {
  const rateLimitSDK = new RateLimitSDK()
  try {
    // 0. Rate limit
    await rateLimitSDK.rateLimit(t, "requestBetterPrices")

    // 1. render email to HTML
    const html = await renderAsync(
      <RequestBetterPricesEmail products={products} totalPrice={totalPrice} userEmail={userEmail} />,
      { pretty: true },
    )

    // 2. send HTML to email API
    await emailsSDK.sendEmail({
      from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
      to: process.env.NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL,
      subject: "New Better Price Request", // no i18n needed here support should understand english (not any lng on website)
      html,
    })

    await emailsSDK.sendTelegramMessage("💰 better prices request")

    return { success: true, message: t("product.success.better_prices") }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
