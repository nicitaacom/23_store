import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "./route"
import { sendTelegramMessage } from "@/utils/sendTelegramMessage"

vi.mock("@/utils/sendTelegramMessage", () => ({ sendTelegramMessage: vi.fn() }))

const PAYPAL_HEADERS = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api-m.sandbox.paypal.com/cert.pem",
  "paypal-transmission-id": "transmission-id",
  "paypal-transmission-sig": "signature",
  "paypal-transmission-time": "2026-08-03T12:00:00Z",
}

function createPayPalRequest(eventType: string) {
  return new Request("http://localhost:3023/api/webhooks/paypal", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...PAYPAL_HEADERS },
    body: JSON.stringify({
      id: "WH-TEST",
      event_type: eventType,
      summary: "Payment <completed>",
      resource: { id: "ORDER-1", status: "COMPLETED", amount: { value: "12.50", currency_code: "USD" } },
    } satisfies API.PayPalWebhookEvent),
  })
}

function setPayPalTestEnvironment() {
  vi.stubEnv("NODE_ENV", "development")
  vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID_TEST", "client-id")
  vi.stubEnv("PAYPAL_CLIENT_SECRET_TEST", "client-secret")
  vi.stubEnv("PAYPAL_WEBHOOK_ID_TEST", "webhook-id")
}

describe("PayPal webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    setPayPalTestEnvironment()
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true, status: 200, statusText: "OK", data: null })
  })

  it("verifies a tracked event and sends its Telegram notification", async () => {
    const paypalApiRequestMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ verification_status: "SUCCESS" }), { status: 200 }))
    vi.stubGlobal("fetch", paypalApiRequestMock)

    const response = await POST(createPayPalRequest("CHECKOUT.ORDER.COMPLETED"))
    const responseJson = (await response.json()) as API.PayPalWebhookResponse

    expect(response.status).toBe(200)
    expect(responseJson).toEqual({ ok: true, telegramSent: true })
    expect(sendTelegramMessage).toHaveBeenCalledWith(expect.stringContaining("CHECKOUT.ORDER.COMPLETED"))
    expect(sendTelegramMessage).toHaveBeenCalledWith(expect.stringContaining("Payment &lt;completed&gt;"))
    expect(JSON.parse(paypalApiRequestMock.mock.calls[1][1].body as string)).toMatchObject({ webhook_id: "webhook-id" })
  })

  it("rejects an event when PayPal reports an invalid signature", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ verification_status: "FAILURE" }), { status: 200 })),
    )

    const response = await POST(createPayPalRequest("CHECKOUT.ORDER.APPROVED"))

    expect(response.status).toBe(401)
    expect(sendTelegramMessage).not.toHaveBeenCalled()
  })

  it("acknowledges a verified event outside the configured tracked list", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ verification_status: "SUCCESS" }), { status: 200 })),
    )

    const response = await POST(createPayPalRequest("PAYMENT.CAPTURE.COMPLETED"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: true })
    expect(sendTelegramMessage).not.toHaveBeenCalled()
  })
})
