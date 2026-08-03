// DO NOT import anything here

declare namespace API {
  type PayPalWebhookEvent = {
    id: string
    event_type: string
    summary?: string
    resource?: {
      id?: string
      status?: string
      amount?: { currency_code?: string; value?: string }
    }
  }

  type PayPalWebhookResponse = { ok: true; telegramSent: true } | { ok: true; ignored: true } | { error: string }
}
