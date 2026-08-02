import { renderAsync } from "@react-email/render"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { emailsSDK } from "@/sdk/EmailsSDK/EmailsSDK"
import { ErrorReportEmail } from "@/emails/ErrorReportEmail"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"

export async function reportErrorToSupport(t: TI18nFunction, message: string, digest?: string) {
  const rateLimitSDK = new RateLimitSDK()
  try {
    // 0. Rate limit
    await rateLimitSDK.rateLimit(t, "reportError")

    // 1. render email to HTML
    const pageUrl = typeof window !== "undefined" ? window.location.href : null
    const html = await renderAsync(<ErrorReportEmail message={message} digest={digest} pageUrl={pageUrl} />, { pretty: true })

    // 2. send HTML to email API
    await emailsSDK.sendEmail({
      from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
      to: process.env.NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL,
      subject: "Error report from the store", // no i18n needed here support should understand english (not any lng on website)
      html,
    })

    return { success: true as const }
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : String(error) }
  }
}
