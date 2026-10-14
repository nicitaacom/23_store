import { NextResponse } from "next/server"

import { getRunOwnedUser } from "@/libs/e2e/runAccount"
import { resend } from "@/libs/resend"

export const runtime = "nodejs"
// eslint-disable-next-line local-rules/no-banned-words -- Required HTTP protocol directive for private provider state.
const noStoreHeaders = { "cache-control": "no-store" }

const deliveredEvents = new Set(["delivered", "opened", "clicked"])
const failedEvents = new Set(["bounced", "complained"])

export async function GET(request: Request) {
  const requestId = crypto.randomUUID()
  const url = new URL(request.url)
  const emailId = url.searchParams.get("emailId")
  const runId = url.searchParams.get("runId")
  const expectedSubject = url.searchParams.get("subject")
  const timeoutMs = Math.min(Math.max(Number(url.searchParams.get("timeoutMs")) || 30000, 1000), 60000)
  if (!emailId || emailId.length > 160 || !runId || !expectedSubject) {
    return NextResponse.json({ error: "The run-owned email reference is incomplete." }, { status: 400 })
  }

  const getRunOwnedUserResp = await getRunOwnedUser(request, runId)
  if ("response" in getRunOwnedUserResp) return getRunOwnedUserResp.response
  if (!getRunOwnedUserResp.user.email) return NextResponse.json({ error: "The run account has no email address." }, { status: 400 })

  const stopAt = Date.now() + timeoutMs
  let latestEvent = "unknown"
  let delayMs = 500
  do {
    const { data, error } = await resend.emails.get(emailId)
    if (error || !data) {
      console.error("[e2e-resend-status] provider readback failed", { requestId, errorName: error?.name ?? "missing-message" })
      return NextResponse.json({ error: "The run-owned provider email could not be read back." }, {
        status: 503,
        headers: { ...noStoreHeaders, "x-application-request-id": requestId },
      })
    }
    if (data.id !== emailId || data.subject !== expectedSubject
      || !data.to.some(recipient => recipient.toLowerCase() === getRunOwnedUserResp.user.email?.toLowerCase())) {
      return NextResponse.json({ error: "The provider email does not match the run account and expected subject." }, {
        status: 403,
        headers: { ...noStoreHeaders, "x-application-request-id": requestId },
      })
    }

    latestEvent = data.last_event
    if (deliveredEvents.has(latestEvent)) {
      return NextResponse.json({ emailId, lastEvent: latestEvent, recipientMatched: true }, {
        headers: { ...noStoreHeaders, "x-application-request-id": requestId },
      })
    }
    if (failedEvents.has(latestEvent)) {
      return NextResponse.json({ error: `The provider reported ${latestEvent} for the run-owned email.`, emailId, lastEvent: latestEvent }, {
        status: 422,
        headers: { ...noStoreHeaders, "x-application-request-id": requestId },
      })
    }

    if (Date.now() < stopAt) {
      await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, stopAt - Date.now())))
      delayMs = Math.min(delayMs * 2, 4000)
    }
  } while (Date.now() < stopAt)

  return NextResponse.json({ error: "The provider email did not reach a delivery event before the verification timeout.", emailId, lastEvent: latestEvent }, {
    status: 504,
    headers: { ...noStoreHeaders, "x-application-request-id": requestId },
  })
}
