import { renderAsync } from "@react-email/render"

import { RequestBetterPricesEmail } from "@/emails/RequestBetterPricesEmail"
import { TProductAfterDB } from "@/TS/product/TProductAfterDB"

export async function requestBetterPrices(products: TProductAfterDB[], totalPrice: number, userEmail?: string) {
  try {
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
        to: "notifications@nicitaa.com",
        subject: "New Better Price Request",
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

    if (!emailResponse.ok) return { success: false, message: emailData.message || "Email failed" }

    if (telegramResponse.status !== 200) return { success: false, message: "Telegram failed" }

    return { success: true, message: emailData.message || "Request sent successfully!" }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
