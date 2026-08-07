import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"

import type { TKeyCheckReport } from "@/ts/types/TKeyCheckReport"
import { daysSince, formatKeyCheckReport, PROD_CHECK_EVERY_DAYS, runKeyChecks, shouldSendKeyAlert } from "@/utils/checkEnvs"
import {
  getRedisKeysCheckLastAlert,
  getRedisKeysCheckLastRun,
  setRedisKeysCheckLastAlert,
  setRedisKeysCheckLastReport,
  setRedisKeysCheckLastRun,
} from "@/libs/keysCheckRedis"
import { resend } from "@/libs/resend"
import { sendTelegramMessage } from "@/utils/sendTelegramMessage"

export const maxDuration = 60

const PROJECT_NAME = "23_store"

function authorizeWebhook(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return { error: "CRON_SECRET is not configured", status: 503 }

  const authorization = request.headers.get("authorization")
  const receivedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  const expectedBuffer = Buffer.from(secret)
  const receivedBuffer = Buffer.from(receivedSecret)

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return { error: "Unauthorized", status: 401 }
  }

  return null
}

async function sendAlertEmail(report: TKeyCheckReport, message: string): Promise<boolean> {
  const notificationEmail = process.env.NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL
  if (!notificationEmail) return false

  const isSingleFailure = report.failures.length === 1
  const envWord = `env${isSingleFailure ? "" : "s"}`
  const requireWord = `require${isSingleFailure ? "s" : ""}`
  const subject = `${PROJECT_NAME} — ${report.failures.length} ${envWord} ${requireWord} attention`

  const { error } = await resend.emails.send({
    from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    to: notificationEmail,
    subject,
    html: `<pre style="font:14px/1.6 ui-monospace,monospace">${message}</pre>`,
  })

  return !error
}

/**
 * Telegram first, and the email only when Telegram did not land.
 *
 * One broken key is worth one notification. Sending both every time means a second copy of a message
 * already read, and two channels saying the same thing is what teaches you to stop opening either.
 * The email stays as the way through for the case Telegram itself is the thing that is down.
 *
 * Nothing throws out of here. A failed send must not answer the cron with a 500, because the run
 * itself succeeded and its result is already written to Redis.
 */
async function alertOwner(report: TKeyCheckReport) {
  const message = formatKeyCheckReport(PROJECT_NAME, report)

  try {
    const telegramResp = await sendTelegramMessage(message)
    if (telegramResp.ok) return { telegramSent: true, emailSent: false }
    console.error(59, "[check-envs] telegram refused the alert, sending the email", telegramResp.description)
  } catch (error) {
    console.error(61, "[check-envs] telegram alert failed, sending the email", error)
  }

  try {
    return { telegramSent: false, emailSent: await sendAlertEmail(report, message) }
  } catch (error) {
    console.error(66, "[check-envs] email alert failed too, nothing was sent", error)

    return { telegramSent: false, emailSent: false }
  }
}

export async function POST(request: Request) {
  const authorizationError = authorizeWebhook(request)
  if (authorizationError) {
    return NextResponse.json({ error: authorizationError.error }, { status: authorizationError.status })
  }

  const daysSinceLastRun = daysSince(await getRedisKeysCheckLastRun())
  if (daysSinceLastRun !== null && daysSinceLastRun < PROD_CHECK_EVERY_DAYS) {
    return NextResponse.json({ skipped: true, daysSinceLastRun: Math.floor(daysSinceLastRun) })
  }

  const report = await runKeyChecks()
  await Promise.all([setRedisKeysCheckLastRun(report.ranAt), setRedisKeysCheckLastReport(report)])

  if (report.ok) return NextResponse.json({ ok: true, checked: report.liveCount + report.shapeCount + report.skipCount })

  const failingNames = report.failures.map(failure => failure.name)
  if (!shouldSendKeyAlert(failingNames, await getRedisKeysCheckLastAlert())) {
    return NextResponse.json({ ok: false, failures: failingNames, alerted: false, reason: "same names as last alert" })
  }

  const { telegramSent, emailSent } = await alertOwner(report)
  await setRedisKeysCheckLastAlert({ names: failingNames, sentAt: report.ranAt })

  return NextResponse.json({ ok: false, failures: failingNames, alerted: true, telegramSent, emailSent })
}
