import { Resend } from "resend"

const deliveredEvents = new Set(["delivered", "opened", "clicked"])
const terminalFailureEvents = new Set(["bounced", "complained"])

export async function verifyResendEmail(environment, input) {
  const apiKey = environment.NEXT_RESEND_SECRET
  const testDomain = environment.E2E_TEST_EMAIL_DOMAIN?.toLowerCase()
  const runSuffix = environment.E2E_RUN_ID?.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48)
  const expectedRecipient = input.to?.trim().toLowerCase()
  if (!apiKey || !testDomain || !runSuffix || !expectedRecipient || !input.emailId || !input.subject) {
    throw new Error("Resend verification requires provider access and an exact run-owned recipient, message id, and subject")
  }
  const recipientLocalPart = expectedRecipient.split("@")[0] ?? ""
  if (!expectedRecipient.endsWith(`@${testDomain}`) || !recipientLocalPart.endsWith(`+${runSuffix}`)) {
    throw new Error("Resend verification is limited to the exact current-run account on the configured E2E test email domain")
  }

  const timeoutMs = Math.min(Math.max(Number(input.timeoutMs) || 30000, 1000), 60000)
  const stopAt = Date.now() + timeoutMs
  const resend = new Resend(apiKey)
  let latestEvent = "unknown"

  while (Date.now() < stopAt) {
    const { data, error } = await resend.emails.get(input.emailId)
    if (error || !data) throw new Error("Resend could not read back the run-owned message")
    if (data.id !== input.emailId || !data.to.some(recipient => recipient.toLowerCase() === expectedRecipient)
      || data.subject !== input.subject) {
      throw new Error("Resend message readback does not match the exact test recipient and subject")
    }

    latestEvent = data.last_event
    if (deliveredEvents.has(latestEvent)) {
      return {
        emailId: data.id,
        lastEvent: latestEvent,
        verificationReference: `resend:email:${data.id}:configured-test-recipient-matched:event:${latestEvent}`,
      }
    }
    if (terminalFailureEvents.has(latestEvent)) {
      throw new Error(`Resend reports terminal email delivery event: ${latestEvent}`)
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error(`Resend message did not reach delivery within ${timeoutMs} ms; last event was ${latestEvent}`)
}
