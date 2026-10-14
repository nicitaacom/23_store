import { NextResponse } from "next/server"
import Stripe from "stripe"

import { resetAIImageQuotaAfterPurchase } from "@/libs/ai/imageGenerationQuota"
import { stripe } from "@/libs/stripe"

export const runtime = "nodejs"
export const maxDuration = 60

export type TAPIVerifyPayment = {
  session_id: string
}

export type TAPIVerifyPaymentResponse = {
  valid: boolean
}

function paymentStatusResponse(valid: boolean, status: number, requestId: string) {
  const response = NextResponse.json({ valid } satisfies TAPIVerifyPaymentResponse, { status })
  response.headers.set("x-stripe-request-id", requestId)
  return response
}

export async function POST(req: Request) {
  let body: TAPIVerifyPayment
  try {
    const parsedBody = await req.json()
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "A payment session is required to check payment status." }, { status: 400 })
    }
    body = parsedBody as TAPIVerifyPayment
  } catch {
    return NextResponse.json({ error: "Payment status request could not be read. Open the order page again." }, { status: 400 })
  }

  if (typeof body.session_id !== "string" || !/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(body.session_id)) {
    return NextResponse.json({ error: "The payment session id is invalid. Check the checkout link or contact store support." }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(body.session_id)
    if (session.payment_status === "paid" && session.client_reference_id) {
      try {
        // Checkout creation writes this reference from the server-verified Supabase session.
        // The paid provider session remains authoritative if the buyer's browser session expires.
        await resetAIImageQuotaAfterPurchase(session.client_reference_id, `stripe:${session.id}`)
      } catch (error) {
        console.error("[verify-payment] paid session image quota reset failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        })
        return NextResponse.json({
          error: "Your payment is confirmed, but the image allowance could not be reset yet. Keep this page open while the store retries the account update.",
          code: "AI_IMAGE_QUOTA_RESET_UNAVAILABLE",
        }, { status: 503 })
      }
    }
    return paymentStatusResponse(session.payment_status === "paid", session.payment_status === "paid" ? 200 : 400, session.lastResponse.requestId)
  } catch (error) {
    const stripeErrorType = error instanceof Stripe.errors.StripeError ? error.type : null
    const status = stripeErrorType === "StripeInvalidRequestError" ? 404
      : stripeErrorType === "StripeAuthenticationError" || stripeErrorType === "StripePermissionError"
        || stripeErrorType === "StripeRateLimitError" || stripeErrorType === "StripeConnectionError" || stripeErrorType === "StripeAPIError"
        ? 503
        : 500
    const message = stripeErrorType === "StripeInvalidRequestError"
      ? "The payment session could not be found. Check the checkout link or contact store support."
      : stripeErrorType === "StripeAuthenticationError" || stripeErrorType === "StripePermissionError"
        ? "Payment status is unavailable because the payment account is not configured correctly. Contact store support before paying again."
        : stripeErrorType === "StripeRateLimitError" || stripeErrorType === "StripeConnectionError" || stripeErrorType === "StripeAPIError"
          ? "Payment status could not be confirmed. Check your order before starting another payment, then contact store support if it is still missing."
          : "Payment status could not be confirmed. Check your order before starting another payment, then contact store support if the order is missing."

    console.error("[verify-payment] Stripe status lookup failed", {
      errorType: stripeErrorType ?? (error instanceof Error ? error.name : "UnknownError"),
    })
    return NextResponse.json({ error: message }, { status })
  }
}
