import { renderAsync } from "@react-email/render"

import { RequestBetterPricesEmail } from "@/emails/RequestBetterPricesEmail"
import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { useToast } from "@/store/ui"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"

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
    const emailResponse = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
        to: process.env.NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL,
        subject: "New Better Price Request", // no i18n needed here support should understand english (not any lng on website)
        html,
      }),
    })

    // 3. telegram (unchanged)
    const telegramResponse = await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "💰 better prices request" } as API.TelegramRequest),
    })

    const emailText = await emailResponse.text()
    const emailData = (() => {
      try {
        return JSON.parse(emailText)
      } catch {
        return { message: emailText }
      }
    })()

    if (!emailResponse.ok) return { success: false, message: emailData.message || t("product.error.better_prices_email") }

    if (telegramResponse.status !== 200) return { success: false, message: t("product.error.better_prices_telegram") }

    return { success: true, message: emailData.message || t("product.success.better_prices") }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
