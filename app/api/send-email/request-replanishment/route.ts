import { NextResponse } from "next/server"

import { describeResendSendFailure } from "@/utils/describeResendSendFailure"
import { resend } from "@/libs/resend"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export type TAPISendEmailRequestReplanishment = {
  owner_id: string
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
    return errorResponse("The notification details could not be read. Reload the product page and contact support if the request is still unavailable.", 400, requestId)
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("The notification details are incomplete. Reload the product page and contact support if the request is still unavailable.", 400, requestId)
  }

  const { owner_id, subject, html } = body as Partial<TAPISendEmailRequestReplanishment>
  if (
    typeof owner_id !== "string" ||
    !owner_id.trim() ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof html !== "string" ||
    !html.trim()
  ) {
    return errorResponse("The notification is missing its recipient or message. Reload the product page and contact support if the request is still unavailable.", 400, requestId)
  }

  let ownerEmail: string | null = null
  try {
    // eslint-disable-next-line local-rules/use-rls-supabase-client -- The replenishment request's product owner id scopes this server-only email lookup to one recipient.
    const { data, error } = await supabaseAdmin.from("23_users").select("email").eq("id", owner_id).maybeSingle()

    if (error) {
      console.error("[request-replanishment-email] recipient lookup failed", { requestId, code: error.code })
      return errorResponse(
        "The product owner email could not be checked, so no notification was sent. Contact support to check the owner account.",
        503,
        requestId,
      )
    }

    ownerEmail = typeof data?.email === "string" && data.email.trim() ? data.email : null
  } catch (error) {
    console.error("[request-replanishment-email] recipient lookup threw", {
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    return errorResponse(
      "The product owner email could not be checked, so no notification was sent. Contact support to check the owner account.",
      503,
      requestId,
    )
  }

  if (!ownerEmail) {
    return errorResponse("The product owner has no email address for this notification. Contact support to update the owner account.", 404, requestId)
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
      to: ownerEmail,
      subject,
      html,
    })

    if (error || !data?.id) {
      const failure = describeResendSendFailure(error)
      console.error("[request-replanishment-email] provider did not confirm send", {
        requestId,
        providerError: error?.name ?? "missing-email-id",
      })
      return errorResponse(`${failure.message} Reference: ${requestId}.`, failure.status, requestId)
    }

    return NextResponse.json({ status: 200, resendId: data.id } satisfies API.EmailsRequestReplanishmentResponse, {
      headers: { "x-resend-email-id": data.id, "x-application-request-id": requestId },
    })
  } catch (error) {
    console.error("[request-replanishment-email] provider call threw", {
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    const failure = describeResendSendFailure(null)
    return errorResponse(`${failure.message} Reference: ${requestId}.`, failure.status, requestId)
  }
}
