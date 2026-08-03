import { NextResponse } from "next/server"

import { sendTelegramMessage } from "@/utils/sendTelegramMessage"

export const runtime = "nodejs"

const TRACKED_EVENTS = new Set([
  "CHECKOUT.CHECKOUT.BUYER-APPROVED",
  "CHECKOUT.ORDER.APPROVED",
  "CHECKOUT.ORDER.COMPLETED",
  "CHECKOUT.ORDER.DECLINED",
  "CHECKOUT.ORDER.SAVED",
  "CHECKOUT.ORDER.VOIDED",
  "CHECKOUT.PAYMENT-RESOURCE.CREATED",
  "CHECKOUT.PAYMENT-RESOURCE.DELETED",
  "CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED",
  "CHECKOUT.PAYMENT-RESOURCE.PAYMENT-ON-HOLD",
  "CHECKOUT.PAYMENT-RESOURCE.UPDATED",
])

type PayPalConfig = {
  apiBaseUrl: string
  clientId: string
  clientSecret: string
  webhookId: string
}

type PayPalVerificationHeaders = {
  authAlgo: string
  certUrl: string
  transmissionId: string
  transmissionSignature: string
  transmissionTime: string
}

function getPayPalConfig(): PayPalConfig | { error: string } {
  const isLive = process.env.NODE_ENV === "production"
  const clientId = isLive ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE : process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_TEST
  const clientSecret = isLive ? process.env.PAYPAL_CLIENT_SECRET_LIVE : process.env.PAYPAL_CLIENT_SECRET_TEST
  const webhookId = isLive ? process.env.PAYPAL_WEBHOOK_ID_LIVE : process.env.PAYPAL_WEBHOOK_ID_TEST

  if (!clientId || !clientSecret || !webhookId) {
    return { error: `PayPal ${isLive ? "live" : "test"} webhook environment variables are missing` }
  }

  return {
    apiBaseUrl: isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
    clientId,
    clientSecret,
    webhookId,
  }
}

function getPayPalVerificationHeaders(request: Request): PayPalVerificationHeaders | { error: string } {
  const verificationHeaders = {
    authAlgo: request.headers.get("paypal-auth-algo"),
    certUrl: request.headers.get("paypal-cert-url"),
    transmissionId: request.headers.get("paypal-transmission-id"),
    transmissionSignature: request.headers.get("paypal-transmission-sig"),
    transmissionTime: request.headers.get("paypal-transmission-time"),
  }
  const missingHeader = Object.entries(verificationHeaders).find(([, value]) => !value)?.[0]
  if (missingHeader) return { error: `PayPal verification header is missing: ${missingHeader}` }

  return verificationHeaders as PayPalVerificationHeaders
}

async function getPayPalAccessToken(config: PayPalConfig): Promise<{ accessToken: string } | { error: string }> {
  const response = await fetch(`${config.apiBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })
  const responseJson = (await response.json()) as { access_token?: string; error_description?: string }

  if (!response.ok || !responseJson.access_token) {
    return { error: responseJson.error_description || `PayPal access token request failed (${response.status})` }
  }

  return { accessToken: responseJson.access_token }
}

async function verifyPayPalWebhook(
  config: PayPalConfig,
  verificationHeaders: PayPalVerificationHeaders,
  webhookEvent: API.PayPalWebhookEvent,
): Promise<{ isVerified: boolean } | { error: string }> {
  const getPayPalAccessTokenResp = await getPayPalAccessToken(config)
  if ("error" in getPayPalAccessTokenResp) return getPayPalAccessTokenResp

  const response = await fetch(`${config.apiBaseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPayPalAccessTokenResp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: verificationHeaders.authAlgo,
      cert_url: verificationHeaders.certUrl,
      transmission_id: verificationHeaders.transmissionId,
      transmission_sig: verificationHeaders.transmissionSignature,
      transmission_time: verificationHeaders.transmissionTime,
      webhook_id: config.webhookId,
      webhook_event: webhookEvent,
    }),
    cache: "no-store",
  })
  const responseJson = (await response.json()) as { verification_status?: string; message?: string }

  if (!response.ok) return { error: responseJson.message || `PayPal verification failed (${response.status})` }
  return { isVerified: responseJson.verification_status === "SUCCESS" }
}

function escapeTelegramHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function getPayPalTelegramMessage(webhookEvent: API.PayPalWebhookEvent) {
  const resource = webhookEvent.resource
  const amount = resource?.amount?.value ? `${resource.amount.value} ${resource.amount.currency_code || ""}`.trim() : null
  const lines = [
    "🧾 <b>PayPal checkout event</b>",
    `<b>Event:</b> <code>${escapeTelegramHtml(webhookEvent.event_type)}</code>`,
    `<b>Event ID:</b> <code>${escapeTelegramHtml(webhookEvent.id)}</code>`,
    webhookEvent.summary ? `<b>Summary:</b> ${escapeTelegramHtml(webhookEvent.summary)}` : null,
    resource?.id ? `<b>Resource ID:</b> <code>${escapeTelegramHtml(resource.id)}</code>` : null,
    resource?.status ? `<b>Status:</b> ${escapeTelegramHtml(resource.status)}` : null,
    amount ? `<b>Amount:</b> ${escapeTelegramHtml(amount)}` : null,
  ]

  return lines.filter(Boolean).join("\n")
}

export async function POST(request: Request) {
  try {
    const config = getPayPalConfig()
    if ("error" in config) {
      return NextResponse.json({ error: config.error } satisfies API.PayPalWebhookResponse, { status: 503 })
    }

    const verificationHeaders = getPayPalVerificationHeaders(request)
    if ("error" in verificationHeaders) {
      return NextResponse.json({ error: verificationHeaders.error } satisfies API.PayPalWebhookResponse, { status: 400 })
    }

    const webhookEvent = (await request.json()) as API.PayPalWebhookEvent
    if (!webhookEvent.id || !webhookEvent.event_type) {
      return NextResponse.json(
        { error: "PayPal webhook event is missing id or event_type" } satisfies API.PayPalWebhookResponse,
        {
          status: 400,
        },
      )
    }

    const verificationResp = await verifyPayPalWebhook(config, verificationHeaders, webhookEvent)
    if ("error" in verificationResp) {
      return NextResponse.json({ error: verificationResp.error } satisfies API.PayPalWebhookResponse, { status: 502 })
    }
    if (!verificationResp.isVerified) {
      return NextResponse.json({ error: "PayPal webhook signature is invalid" } satisfies API.PayPalWebhookResponse, {
        status: 401,
      })
    }

    if (!TRACKED_EVENTS.has(webhookEvent.event_type)) {
      return NextResponse.json({ ok: true, ignored: true } satisfies API.PayPalWebhookResponse)
    }

    const telegramResp = await sendTelegramMessage(getPayPalTelegramMessage(webhookEvent))
    if (!telegramResp.ok) {
      return NextResponse.json(
        { error: telegramResp.description || "Telegram rejected the PayPal notification" } satisfies API.PayPalWebhookResponse,
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, telegramSent: true } satisfies API.PayPalWebhookResponse)
  } catch (error) {
    console.error("[webhooks/paypal] event handling failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) } satisfies API.PayPalWebhookResponse,
      { status: 500 },
    )
  }
}
