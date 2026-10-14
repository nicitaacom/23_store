import { NextResponse } from "next/server"

import { describeResendSendFailure } from "@/utils/describeResendSendFailure"
import { resend } from "@/libs/resend"

export type TAPISendEmail = {
  from: string
  to: string
  subject: string
  html: string
}

function errorResponse(message: string, status: number, requestId: string) {
  return NextResponse.json({ error: message, requestId }, {
    status,
    headers: { "x-application-request-id": requestId },
  })
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return errorResponse("The email details could not be read. Reload this page and contact support if the message is still unavailable.", 400, requestId)
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("The email details are incomplete. Reload this page and contact support if the message is still unavailable.", 400, requestId)
  }

  const { to, subject, html } = body as Partial<TAPISendEmail>
  if (
    typeof to !== "string" ||
    !to.trim() ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof html !== "string" ||
    !html.trim()
  ) {
    return NextResponse.json(
      { error: "The email is missing a recipient, subject, or message. Contact support to complete the email settings." },
      { status: 400, headers: { "x-application-request-id": requestId } },
    )
  }

  const from = process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  if (!from?.trim()) {
    return NextResponse.json(
      { error: "Email delivery is unavailable because the store sender address is not configured. Contact support to complete the email settings." },
      { status: 503, headers: { "x-application-request-id": requestId } },
    )
  }

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html })

    if (error || !data?.id) {
      const failure = describeResendSendFailure(error)
      console.error("[send-email] provider did not confirm send", {
        requestId,
        providerError: error?.name ?? "missing-email-id",
      })
      return errorResponse(`${failure.message} Reference: ${requestId}.`, failure.status, requestId)
    }

    return NextResponse.json({ status: 200, resendId: data.id } satisfies API.EmailsSendResponse, {
      headers: { "x-resend-email-id": data.id, "x-application-request-id": requestId },
    })
  } catch (error) {
    console.error("[send-email] provider call threw", {
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    const failure = describeResendSendFailure(null)
    return errorResponse(`${failure.message} Reference: ${requestId}.`, failure.status, requestId)
  }
}
